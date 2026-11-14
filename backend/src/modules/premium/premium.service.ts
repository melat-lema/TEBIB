import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { supabase } from '../../config/supabase.config';
import { PackService } from './pack.service';
import { premiumConfig } from './premium.config';

const CHAPA = 'https://api.chapa.co/v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TX_RE = /^tebib-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITUATIONS = ['new', 'renewal', 'lost_or_damaged', 'other'];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);
  constructor(private readonly packs: PackService) {}

  config() {
    const c = premiumConfig();
    return { priceEtb: c.priceEtb, currency: 'ETB', enabled: !!c.chapaSecret };
  }

  async eligibility(serviceId: string) {
    if (!UUID_RE.test(serviceId)) throw new BadRequestException('Invalid service');
    const { count } = await supabase.from('knowledge_base').select('id', { count: 'exact', head: true }).eq('service_id', serviceId).eq('status', 'approved');
    const { minFacts } = premiumConfig();
    return { facts: count ?? 0, minFacts, eligible: (count ?? 0) >= minFacts };
  }

  // ------------------------------------------------------------------ checkout

  async checkout(user: AuthUser, body: any) {
    const c = premiumConfig();
    if (!c.chapaSecret) throw new ServiceUnavailableException('Payments are not switched on yet');

    const serviceId = String(body?.serviceId ?? '');
    const elig = await this.eligibility(serviceId);
    if (!elig.eligible) throw new BadRequestException('This service does not have enough verified information for a pack yet');

    const language: 'en' | 'am' = body?.language === 'am' ? 'am' : 'en';
    const situation = SITUATIONS.includes(body?.answers?.situation) ? body.answers.situation : 'other';
    const urgency = body?.answers?.urgency === 'urgent' ? 'urgent' : 'normal';
    const notes = typeof body?.answers?.notes === 'string' ? body.answers.notes.replace(/[\r\n]+/g, ' ').trim().slice(0, 300) : '';

    // basic abuse guard: not more than 5 unpaid checkouts in an hour
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count: recent } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending').gte('created_at', since);
    if ((recent ?? 0) >= 5) throw new BadRequestException('Too many unfinished payments. Please wait a little and try again.');

    const { data: service } = await supabase.from('services').select('id, name_en').eq('id', serviceId).single();
    if (!service) throw new NotFoundException('Service not found');

    const txRef = `tebib-${randomUUID()}`;
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        user_id: user.id,
        amount: c.priceEtb, // always taken from the server, never from the browser
        currency: 'ETB',
        service_type: 'application_pack',
        service_id: serviceId,
        chapa_reference: txRef,
        status: 'pending',
        description: `Application Pack: ${service.name_en}`,
        metadata: { language, answers: { situation, urgency, notes } },
      }])
      .select('id')
      .single();
    if (error || !payment) {
      this.logger.error(`Could not create payment row: ${error?.message}`);
      throw new BadGatewayException('Could not start the payment');
    }

    const [first, ...rest] = (user.name || user.email.split('@')[0] || 'Tebib').split(' ');
    const res = await axios.post(
      `${CHAPA}/transaction/initialize`,
      {
        amount: String(c.priceEtb),
        currency: 'ETB',
        email: user.email,
        first_name: first || 'Tebib',
        last_name: rest.join(' ') || 'User',
        tx_ref: txRef,
        return_url: `${c.frontendUrl}/payment/result?tx_ref=${txRef}`,
        customization: { title: 'Tebib Premium', description: 'Application Pack' },
      },
      { headers: { Authorization: `Bearer ${c.chapaSecret}`, 'Content-Type': 'application/json' }, timeout: 20000, validateStatus: () => true },
    );

    const checkoutUrl: string | undefined = res.data?.data?.checkout_url;
    if (res.status >= 300 || res.data?.status !== 'success' || !checkoutUrl) {
      this.logger.error(`Chapa initialize failed (${res.status}): ${JSON.stringify(res.data)}`);
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      throw new BadGatewayException('The payment provider could not start this payment. Please try again.');
    }
    return { checkoutUrl, txRef };
  }

  // ------------------------------------------------------------------ verification (the only thing that grants a pack)

  /**
   * Asks Chapa directly whether the transaction succeeded, so a forged redirect or webhook cannot unlock anything.
   * Safe to call many times: payment completion is one atomic update, and there is one pack per payment.
   */
  async verifyAndFulfill(txRef: string, userId?: string) {
    if (!TX_RE.test(txRef)) throw new BadRequestException('Invalid reference');
    const { data: payment } = await supabase.from('payments').select('*').eq('chapa_reference', txRef).maybeSingle();
    if (!payment || (userId && payment.user_id !== userId)) throw new NotFoundException('Payment not found');

    if (payment.status !== 'completed') {
      const secret = premiumConfig().chapaSecret;
      const res = await axios.get(`${CHAPA}/transaction/verify/${encodeURIComponent(txRef)}`, {
        headers: { Authorization: `Bearer ${secret}` },
        timeout: 20000,
        validateStatus: () => true,
      });
      const d = res.data?.data;
      const paid = res.status === 200 && res.data?.status === 'success' && d?.status === 'success' && String(d?.tx_ref ?? txRef) === txRef && String(d?.currency).toUpperCase() === 'ETB' && Number(d?.amount) >= Number(payment.amount);

      if (!paid) {
        if (d?.status === 'failed' || d?.status === 'cancelled') {
          await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id).eq('status', 'pending');
          return { status: 'failed' as const, packId: null };
        }
        return { status: 'pending' as const, packId: null };
      }
      // only the call that flips pending -> completed continues; others just read the result
      await supabase.from('payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', payment.id).eq('status', 'pending');
      payment.status = 'completed';
    }

    try {
      const packId = await this.packs.generateForPayment(payment);
      return { status: 'completed' as const, packId };
    } catch (error) {
      this.logger.error(`Pack generation failed for ${txRef}: ${error instanceof Error ? error.message : error}`);
      // paid but not generated yet: the result page keeps polling and this call retries
      return { status: 'completed' as const, packId: null, generating: true };
    }
  }

  // ------------------------------------------------------------------ packs

  async listPacks(userId: string) {
    const { data } = await supabase
      .from('premium_packs')
      .select('id, language, created_at, content, services(name_en, name_am)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    return (data ?? []).map((p: any) => ({ id: p.id, language: p.language, createdAt: p.created_at, title: p.content?.title ?? '', service: p.services }));
  }

  async getPack(userId: string, id: string) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid pack');
    const { data } = await supabase.from('premium_packs').select('id, language, created_at, answers, content, services(name_en, name_am)').eq('id', id).eq('user_id', userId).maybeSingle();
    if (!data) throw new NotFoundException('Pack not found');
    return data;
  }
}
