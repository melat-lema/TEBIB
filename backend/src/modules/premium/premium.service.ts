import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { supabase } from '../../config/supabase.config';
import { PackService } from './pack.service';
import { premiumConfig } from './premium.config';

const CHAPA = 'https://api.chapa.co/v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TX_RE = /^tebib-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITUATIONS = ['new', 'renewal', 'lost_or_damaged', 'other'];
const DAY = 86_400_000;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Tebib Plus = a 30-day pass paid through Chapa. It is NOT an automatic recurring charge:
 * mobile-money payments cannot be reliably auto-debited, so people renew when they want to.
 * Renewing while active adds 30 days on top of the current end date.
 */
@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);
  constructor(private readonly packs: PackService) {}

  config() {
    const c = premiumConfig();
    return { monthlyEtb: c.monthlyEtb, packsPerMonth: c.packsPerMonth, passDays: c.passDays, currency: 'ETB', enabled: !!c.chapaSecret };
  }

  async eligibility(serviceId: string) {
    if (!UUID_RE.test(serviceId)) throw new BadRequestException('Invalid service');
    const { count } = await supabase.from('knowledge_base').select('id', { count: 'exact', head: true }).eq('service_id', serviceId).eq('status', 'approved');
    const { minFacts } = premiumConfig();
    const eligible = (count ?? 0) >= minFacts;
    return { facts: count ?? 0, minFacts, eligible, available: eligible ? [] : await this.availableServices() };
  }

  /** Services that already have enough verified facts for a pack. */
  private async availableServices() {
    const { minFacts } = premiumConfig();
    const { data: rows } = await supabase.from('knowledge_base').select('service_id').eq('status', 'approved').not('service_id', 'is', null);
    const tally = new Map<string, number>();
    for (const r of rows ?? []) tally.set(r.service_id, (tally.get(r.service_id) ?? 0) + 1);
    const ids = [...tally].filter(([, n]) => n >= minFacts).map(([id]) => id);
    if (!ids.length) return [];
    const { data: services } = await supabase.from('services').select('id, name_en, name_am').in('id', ids);
    return (services ?? []).map((s: any) => ({ ...s, facts: tally.get(s.id) ?? 0 }));
  }

  // ------------------------------------------------------------------ status + personal usage

  private async activeSubscription(userId: string) {
    const { data } = await supabase
      .from('subscriptions')
      .select('id, starts_at, ends_at')
      .eq('user_id', userId)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  }

  /**
   * Repairs missed activations: (1) payments marked completed that have no pass yet (for example the pass table was
   * missing at that moment), (2) recent unfinished payments, in case the person closed the tab before returning.
   */
  private async healPasses(userId: string) {
    try {
      const { data: done } = await supabase.from('payments').select('*').eq('user_id', userId).eq('service_type', 'subscription_30d').eq('status', 'completed').limit(10);
      for (const p of done ?? []) {
        const has = await supabase.from('subscriptions').select('id').eq('payment_id', p.id).maybeSingle();
        if (!has.data && !has.error) await this.grantPass(p).catch((e) => this.logger.warn(`heal grantPass failed: ${e?.message ?? e}`));
      }
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const { data: open } = await supabase.from('payments').select('chapa_reference').eq('user_id', userId).eq('service_type', 'subscription_30d').eq('status', 'pending').gte('created_at', since).order('created_at', { ascending: false }).limit(3);
      for (const p of open ?? []) await this.verifyAndFulfill(p.chapa_reference, userId).catch(() => undefined);
    } catch (error) {
      this.logger.warn(`healPasses skipped: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Everything the user-facing "My usage" card and the premium panel need. */
  async me(user: AuthUser) {
    await this.healPasses(user.id);
    const c = premiumConfig();
    const sub = await this.activeSubscription(user.id);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [{ count: questionsMonth }, { count: questionsAll }, { count: packsTotal }] = await Promise.all([
      supabase.from('chat_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart),
      supabase.from('chat_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('premium_packs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    let packsUsed = 0;
    if (sub) {
      const r = await supabase.from('premium_packs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', sub.starts_at);
      packsUsed = r.count ?? 0;
    }

    return {
      plan: sub ? 'plus' : 'free',
      endsAt: sub?.ends_at ?? null,
      daysLeft: sub ? Math.max(0, Math.ceil((new Date(sub.ends_at).getTime() - Date.now()) / DAY)) : 0,
      packsUsed,
      packsLimit: c.packsPerMonth,
      usage: { questionsThisMonth: questionsMonth ?? 0, questionsAllTime: questionsAll ?? 0, packsTotal: packsTotal ?? 0 },
    };
  }

  // ------------------------------------------------------------------ buying a 30-day pass

  async checkout(user: AuthUser) {
    const c = premiumConfig();
    if (!c.chapaSecret) throw new ServiceUnavailableException('Payments are not switched on yet');

    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count: recent } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending').gte('created_at', since);
    if ((recent ?? 0) >= 5) throw new BadRequestException('Too many unfinished payments. Please wait a little and try again.');

    const txRef = `tebib-${randomUUID()}`;
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{ user_id: user.id, amount: c.monthlyEtb, currency: 'ETB', service_type: 'subscription_30d', chapa_reference: txRef, status: 'pending', description: 'Tebib Plus: 30 days', metadata: { plan: 'plus_monthly' } }])
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
        amount: String(c.monthlyEtb),
        currency: 'ETB',
        email: user.email,
        first_name: first || 'Tebib',
        last_name: rest.join(' ') || 'User',
        tx_ref: txRef,
        return_url: `${c.frontendUrl}/payment/result?tx_ref=${txRef}`,
        customization: { title: 'Tebib Plus', description: '30 day pass' },
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

  /** Asks Chapa directly whether the payment succeeded. Only this grants access. Safe to call repeatedly. */
  async verifyAndFulfill(txRef: string, userId?: string) {
    if (!TX_RE.test(txRef)) throw new BadRequestException('Invalid reference');
    const { data: payment } = await supabase.from('payments').select('*').eq('chapa_reference', txRef).maybeSingle();
    if (!payment || (userId && payment.user_id !== userId)) throw new NotFoundException('Payment not found');

    if (payment.status !== 'completed') {
      const res = await axios.get(`${CHAPA}/transaction/verify/${encodeURIComponent(txRef)}`, {
        headers: { Authorization: `Bearer ${premiumConfig().chapaSecret}` },
        timeout: 20000,
        validateStatus: () => true,
      });
      const d = res.data?.data;
      const paid = res.status === 200 && res.data?.status === 'success' && d?.status === 'success' && String(d?.tx_ref ?? txRef) === txRef && String(d?.currency).toUpperCase() === 'ETB' && Number(d?.amount) >= Number(payment.amount);

      if (!paid) {
        if (d?.status === 'failed' || d?.status === 'cancelled') {
          await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id).eq('status', 'pending');
          return { status: 'failed' as const };
        }
        return { status: 'pending' as const };
      }
      await supabase.from('payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', payment.id).eq('status', 'pending');
      payment.status = 'completed';
    }

    const sub = await this.grantPass(payment);
    return { status: 'completed' as const, endsAt: sub.ends_at };
  }

  /** One pass per payment. Renewing early stacks 30 more days after the current end date. */
  private async grantPass(payment: any) {
    const existing = await supabase.from('subscriptions').select('id, ends_at').eq('payment_id', payment.id).maybeSingle();
    if (existing.data) return existing.data;

    const c = premiumConfig();
    const active = await this.activeSubscription(payment.user_id);
    const start = active && new Date(active.ends_at) > new Date() ? new Date(active.ends_at) : new Date();
    const end = new Date(start.getTime() + c.passDays * DAY);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{ user_id: payment.user_id, payment_id: payment.id, plan: 'plus_monthly', starts_at: start.toISOString(), ends_at: end.toISOString() }])
      .select('id, ends_at')
      .single();
    if (error) {
      if (error.code === '23505') {
        const again = await supabase.from('subscriptions').select('id, ends_at').eq('payment_id', payment.id).single();
        if (again.data) return again.data;
      }
      throw new BadGatewayException('Payment received but the pass could not be activated. Please contact support with your reference.');
    }
    return data;
  }

  // ------------------------------------------------------------------ packs (included in the pass)

  async createPack(user: AuthUser, body: any) {
    const sub = await this.activeSubscription(user.id);
    if (!sub) throw new ForbiddenException('Tebib Plus is required for Application Packs');

    const c = premiumConfig();
    const used = await supabase.from('premium_packs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', sub.starts_at);
    if ((used.count ?? 0) >= c.packsPerMonth) throw new BadRequestException(`You have used all ${c.packsPerMonth} packs included in this pass.`);

    const serviceId = String(body?.serviceId ?? '');
    const elig = await this.eligibility(serviceId);
    if (!elig.eligible) throw new BadRequestException('This service does not have enough verified information for a pack yet');

    const language: 'en' | 'am' = body?.language === 'am' ? 'am' : 'en';
    const situation = SITUATIONS.includes(body?.answers?.situation) ? body.answers.situation : 'other';
    const urgency = body?.answers?.urgency === 'urgent' ? 'urgent' : 'normal';
    const notes = typeof body?.answers?.notes === 'string' ? body.answers.notes.replace(/[\r\n]+/g, ' ').trim().slice(0, 300) : '';

    try {
      const packId = await this.packs.generate({ userId: user.id, serviceId, language, answers: { situation, urgency, notes }, subscriptionId: sub.id });
      return { packId };
    } catch (error) {
      this.logger.error(`Pack generation failed: ${error instanceof Error ? error.message : error}`);
      throw new BadGatewayException('The pack could not be prepared right now. Nothing was used from your allowance. Please try again.');
    }
  }

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
