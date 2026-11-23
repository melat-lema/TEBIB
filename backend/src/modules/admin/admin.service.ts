import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { supabase } from '../../config/supabase.config';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ScraperService } from '../scraper/scraper.service';
import { AiService } from '../ai/ai.service';
import { STARTER_FACTS } from './starter-facts';

const PAGE_SIZE = 25;
const STATUSES = ['pending', 'approved', 'rejected', 'archived'];
const SOURCE_TYPES = ['website', 'telegram'];
const FETCH_METHODS = ['wordpress_api', 'html', 'html_index', 'telegram_preview'];
const TRUST_LEVELS = ['official', 'secondary'];
const CATEGORIES = ['fee', 'requirement', 'step', 'contact', 'office', 'deadline', 'update', 'other'];

const day = (iso: string) => iso.slice(0, 10);
const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly scraper: ScraperService,
    private readonly ai: AiService,
  ) {}

  // ------------------------------------------------------------------ auth

  async validateAdmin(email: string, password: string) {
    // A throwaway client: signing in on the shared service-role client would replace its
    // credentials with the admin's session and silently subject later queries to RLS.
    const authClient = createClient(process.env.SUPABASE_URL as string, (process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY) as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({ email, password });
    if (authError || !authData.session) throw new UnauthorizedException('Invalid credentials');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
    if (profile?.role !== 'admin') throw new UnauthorizedException('User is not an admin');

    this.logger.log(`✅ Admin login successful: ${email}`);
    return {
      token: authData.session.access_token,
      expiresAt: authData.session.expires_at ?? null,
      user: { id: authData.user.id, email: authData.user.email, role: profile.role },
    };
  }

  // ------------------------------------------------------------------ dashboards

  async getStats() {
    const countBy = async (status: string) => {
      const { count } = await supabase.from('knowledge_base').select('id', { count: 'exact', head: true }).eq('status', status);
      return count ?? 0;
    };
    // STATUSES is ['pending', 'approved', 'rejected', 'archived']: read the results in the same order
    const [pending, approved, rejected, archived] = await Promise.all(STATUSES.map(countBy));

    const { count: updatesPending } = await supabase
      .from('knowledge_base')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .not('supersedes_id', 'is', null);

    const { data: oldest } = await supabase
      .from('knowledge_base')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data: logs } = await supabase
      .from('scraper_logs')
      .select('ran_at, status, updates_made, source_name')
      .gte('ran_at', since)
      .order('ran_at', { ascending: false })
      .limit(500);

    const runs = logs ?? [];
    const okRuns = runs.filter((l: any) => l.status === 'success' || l.status === 'partial').length;
    const perDay = Object.fromEntries(lastDays(14).map((d) => [d, 0]));
    for (const l of runs) if (perDay[day(l.ran_at)] !== undefined) perDay[day(l.ran_at)] += l.updates_made ?? 0;

    const { data: sources } = await supabase.from('scrape_sources').select('is_active, last_error');
    const { data: services } = await supabase.from('services').select('id, name_en');
    const { data: approvedRows } = await supabase.from('knowledge_base').select('service_id, last_verified_at').eq('status', 'approved');

    const coverage = (services ?? []).map((s: any) => {
      const rows = (approvedRows ?? []).filter((r: any) => r.service_id === s.id);
      const latest = rows.map((r: any) => r.last_verified_at).filter(Boolean).sort().pop() ?? null;
      return { id: s.id, name: s.name_en, facts: rows.length, lastVerified: latest };
    });

    return {
      knowledge: { approved, pending, rejected, archived, updatesPending: updatesPending ?? 0 },
      oldestPending: oldest?.[0]?.created_at ?? null,
      scraper: {
        runs: runs.length,
        successRate: runs.length ? Math.round((okRuns / runs.length) * 100) : null,
        lastRun: runs[0]?.ran_at ?? null,
        factsPerDay: Object.entries(perDay).map(([date, facts]) => ({ date, facts })),
        sources: { total: sources?.length ?? 0, active: (sources ?? []).filter((s: any) => s.is_active).length, failing: (sources ?? []).filter((s: any) => s.is_active && s.last_error).length },
      },
      coverage,
    };
  }

  async getAnalytics() {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { count: users } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { count: chatsTotal } = await supabase.from('chat_history').select('id', { count: 'exact', head: true });
    const { data: chats } = await supabase
      .from('chat_history')
      .select('user_message, created_at, language_used')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000);

    const rows = chats ?? [];
    const perDay = Object.fromEntries(lastDays(14).map((d) => [d, 0]));
    const questions = new Map<string, number>();
    let am = 0;
    for (const c of rows) {
      if (perDay[day(c.created_at)] !== undefined) perDay[day(c.created_at)]++;
      const q = String(c.user_message).trim().toLowerCase().slice(0, 120);
      questions.set(q, (questions.get(q) ?? 0) + 1);
      if (c.language_used === 'am') am++;
    }

    const { data: missed } = await supabase
      .from('chat_history')
      .select('user_message, language_used')
      .eq('answered', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);
    const gaps = new Map<string, number>();
    for (const m of missed ?? []) {
      const q = String(m.user_message).trim().slice(0, 160);
      gaps.set(q, (gaps.get(q) ?? 0) + 1);
    }

    const { data: pays } = await supabase.from('payments').select('amount, completed_at, service_type').eq('status', 'completed');
    const paid = pays ?? [];
    const subsRes = await supabase.from('subscriptions').select('user_id, ends_at');
    const subs = subsRes.error ? [] : subsRes.data ?? [];
    const nowIso = new Date().toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: packsMonth } = await supabase.from('premium_packs').select('id', { count: 'exact', head: true }).gte('created_at', monthStart);
    const revenue = {
      payments: paid.length,
      totalEtb: paid.reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0),
      last30Etb: paid.filter((p: any) => p.completed_at && p.completed_at >= since).reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0),
      activeSubscribers: new Set(subs.filter((s: any) => s.ends_at > nowIso).map((s: any) => s.user_id)).size,
      subscriptionsSold: subs.length,
      packsThisMonth: packsMonth ?? 0,
    };

    return {
      revenue,
      unanswered: [...gaps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([question, count]) => ({ question, count })),
      users: users ?? 0,
      chatsTotal: chatsTotal ?? 0,
      chatsLast30: rows.length,
      amharicShare: rows.length ? Math.round((am / rows.length) * 100) : 0,
      chatsPerDay: Object.entries(perDay).map(([date, chats]) => ({ date, chats })),
      topQuestions: [...questions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([question, count]) => ({ question, count })),
    };
  }

  async getScraperLogs(limit = 30) {
    const { data, error } = await supabase
      .from('scraper_logs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ------------------------------------------------------------------ review queue

  async getPending() {
    const full = await supabase
      .from('knowledge_base')
      .select(
        'id, service_id, chunk_text, chunk_text_am, category, source_type, source_details, source_url, source_published_at, trust_level, supersedes_id, metadata, created_at, services(name_en)',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(300);

    let rows: any[] = full.data ?? [];
    if (full.error) {
      // Most likely sql/01_migration.sql was not run (new columns missing). Still show the rows so nothing is hidden.
      this.logger.warn(`getPending full query failed: ${full.error.message}. Falling back to basic columns.`);
      const basic = await supabase
        .from('knowledge_base')
        .select('id, service_id, chunk_text, chunk_text_am, source_type, source_details, source_url, source_published_at, metadata, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(300);
      if (basic.error) throw new BadRequestException(basic.error.message);
      return (basic.data ?? []).map((r: any) => ({ ...r, category: null, trust_level: null, supersedes_id: null, supersedes: null, service_name: null, _legacy: true, _reason: full.error!.message }));
    }

    const oldIds = [...new Set(rows.map((r) => r.supersedes_id).filter(Boolean))];
    const old = new Map<string, any>();
    if (oldIds.length) {
      const { data: olds } = await supabase.from('knowledge_base').select('id, chunk_text, chunk_text_am, last_verified_at').in('id', oldIds);
      for (const o of olds ?? []) old.set(o.id, o);
    }
    return rows.map((r) => ({ ...r, service_name: r.services?.name_en ?? null, services: undefined, supersedes: r.supersedes_id ? old.get(r.supersedes_id) ?? null : null }));
  }

  private cleanEdits(edits: any) {
    if (!edits || typeof edits !== 'object') return {};
    const out: Record<string, any> = {};
    if (typeof edits.chunk_text === 'string') out.chunkText = edits.chunk_text.slice(0, 2000);
    if (typeof edits.chunk_text_am === 'string' || edits.chunk_text_am === null) out.chunkTextAm = edits.chunk_text_am?.slice(0, 2000) ?? null;
    if ('service_id' in edits) out.serviceId = edits.service_id || null;
    if ('category' in edits) out.category = CATEGORIES.includes(edits.category) ? edits.category : null;
    return out;
  }

  async approveFact(id: string, edits?: any) {
    const patch = this.cleanEdits(edits);
    try {
      if (Object.keys(patch).length) await this.knowledge.updateChunk(id, patch);
    } catch (error: any) {
      throw new BadRequestException(error?.message ?? 'Could not save edits');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('knowledge_base')
      .update({ status: 'approved', reviewed_at: now, last_verified_at: now })
      .eq('id', id)
      .select('id, supersedes_id')
      .single();
    if (error) throw new BadRequestException('Failed to approve fact');

    // An approved update replaces the fact it supersedes (kept as 'archived' for history)
    if (data?.supersedes_id) {
      await supabase.from('knowledge_base').update({ status: 'archived', reviewed_at: now }).eq('id', data.supersedes_id).eq('status', 'approved');
    }
    this.logger.log(`✅ Fact approved: ${id}${data?.supersedes_id ? ` (replaced ${data.supersedes_id})` : ''}`);
    return { id, status: 'approved', replaced: data?.supersedes_id ?? null };
  }

  async rejectFact(id: string) {
    const { error } = await supabase.from('knowledge_base').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new BadRequestException('Failed to reject fact');
    return { id, status: 'rejected' };
  }

  async bulk(action: 'approve' | 'reject', ids: string[]) {
    let done = 0;
    const failed: string[] = [];
    for (const id of ids) {
      try {
        if (action === 'approve') await this.approveFact(id);
        else await this.rejectFact(id);
        done++;
      } catch {
        failed.push(id);
      }
    }
    return { done, failed };
  }

  // ------------------------------------------------------------------ knowledge base

  async listKnowledge(q: { status?: string; serviceId?: string; q?: string; page?: string }) {
    const page = Math.max(1, Number(q.page) || 1);
    const from = (page - 1) * PAGE_SIZE;

    let query = supabase
      .from('knowledge_base')
      .select(
        'id, service_id, chunk_text, chunk_text_am, category, status, source_type, source_details, source_url, trust_level, last_verified_at, created_at, services(name_en)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    query = STATUSES.includes(q.status ?? '') ? query.eq('status', q.status as string) : query.eq('status', 'approved');
    if (q.serviceId) query = query.eq('service_id', q.serviceId);
    if (q.q?.trim()) query = query.ilike('chunk_text', `%${q.q.replace(/[%_,()]/g, ' ').trim()}%`);

    const { data, count, error } = await query;
    if (error) throw new BadRequestException(error.message);
    const rows = (data ?? []).map((r: any) => ({ ...r, service_name: r.services?.name_en ?? null, services: undefined }));
    return { rows, total: count ?? 0, page, pageSize: PAGE_SIZE };
  }

  async createKnowledge(body: any) {
    const text = typeof body?.chunk_text === 'string' ? body.chunk_text.trim() : '';
    if (!text || text.length > 2000) throw new BadRequestException('English text is required (max 2000 characters)');
    const am = typeof body?.chunk_text_am === 'string' ? body.chunk_text_am.trim().slice(0, 2000) : '';
    const category = CATEGORIES.includes(body?.category) ? body.category : 'other';
    try {
      return await this.knowledge.addKnowledgeChunk(body?.service_id || null, text, am, 'manual', 'Admin entry', {
        status: 'approved',
        category,
        trustLevel: 'manual',
        contentHash: crypto.createHash('sha256').update(text.replace(/\s+/g, ' ').toLowerCase()).digest('hex'),
      });
    } catch (error: any) {
      if (error?.code === '23505') throw new BadRequestException('This exact fact already exists');
      throw new BadRequestException(error?.message ?? 'Could not save');
    }
  }

  async updateKnowledge(id: string, body: any) {
    try {
      const updated = await this.knowledge.updateChunk(id, this.cleanEdits(body));
      if (updated) await supabase.from('knowledge_base').update({ last_verified_at: new Date().toISOString() }).eq('id', id);
      return updated ?? { id };
    } catch (error: any) {
      throw new BadRequestException(error?.message ?? 'Could not update');
    }
  }

  async setStatus(id: string, status: 'approved' | 'archived') {
    const { error } = await supabase
      .from('knowledge_base')
      .update({ status, reviewed_at: new Date().toISOString(), ...(status === 'approved' ? { last_verified_at: new Date().toISOString() } : {}) })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { id, status };
  }

  // ------------------------------------------------------------------ sources + scraper

  async listSources() {
    const { data, error } = await supabase.from('scrape_sources').select('*, services(name_en)').order('created_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    const { data: logs } = await supabase
      .from('scraper_logs')
      .select('source_name, status, ran_at, messages_fetched, updates_made, error_message, details')
      .order('ran_at', { ascending: false })
      .limit(300);
    const lastByName = new Map<string, any>();
    for (const l of logs ?? []) if (!lastByName.has(l.source_name)) lastByName.set(l.source_name, l);

    return (data ?? []).map((s: any) => {
      const l = lastByName.get(s.name);
      const d = l?.details ?? {};
      return {
        ...s,
        service_name: s.services?.name_en ?? null,
        services: undefined,
        lastRun: l
          ? { status: l.status, ranAt: l.ran_at, items: l.messages_fetched ?? 0, saved: l.updates_made ?? 0, unchanged: d.unchanged ?? 0, notRelevant: d.not_relevant ?? 0, rejected: d.rejected ?? 0, duplicates: d.duplicates ?? 0, error: l.error_message }
          : null,
      };
    });
  }

  private cleanSource(body: any, partial: boolean) {
    const out: Record<string, any> = {};
    const str = (v: any) => (typeof v === 'string' ? v.trim() : '');

    if (!partial || 'name' in body) {
      if (!str(body.name)) throw new BadRequestException('Name is required');
      out.name = str(body.name).slice(0, 120);
    }
    if (!partial || 'url' in body) {
      let u: URL;
      try {
        u = new URL(str(body.url));
      } catch {
        throw new BadRequestException('A valid URL is required');
      }
      if (!['http:', 'https:'].includes(u.protocol) || this.scraper.isPrivateHost(u.hostname.toLowerCase())) {
        throw new BadRequestException('Only public http(s) URLs are allowed');
      }
      out.url = u.toString();
    }
    if (!partial || 'source_type' in body) {
      if (!SOURCE_TYPES.includes(body.source_type)) throw new BadRequestException('source_type must be website or telegram');
      out.source_type = body.source_type;
    }
    if ('fetch_method' in body) out.fetch_method = FETCH_METHODS.includes(body.fetch_method) ? body.fetch_method : null;
    if ('css_selector' in body) out.css_selector = str(body.css_selector) || null;
    if ('service_id' in body) out.service_id = body.service_id || null;
    if ('is_active' in body) out.is_active = !!body.is_active;
    if ('trust_level' in body) out.trust_level = TRUST_LEVELS.includes(body.trust_level) ? body.trust_level : 'official';
    if ('notes' in body) out.notes = str(body.notes).slice(0, 500) || null;
    return out;
  }

  async createSource(body: any) {
    const row = this.cleanSource(body ?? {}, false);
    row.is_active = false; // new sources start inactive: test first, then switch on
    const { data, error } = await supabase.from('scrape_sources').insert([row]).select().single();
    if (error) throw new BadRequestException(error.code === '23505' ? 'A source with this URL already exists' : error.message);
    await this.scraper.refreshHosts(true);
    return data;
  }

  async updateSource(id: string, body: any) {
    const patch = this.cleanSource(body ?? {}, true);
    if (!Object.keys(patch).length) throw new BadRequestException('Nothing to update');
    const { data, error } = await supabase.from('scrape_sources').update(patch).eq('id', id).select().single();
    if (error) throw new BadRequestException(error.message);
    await this.scraper.refreshHosts(true);
    return data;
  }

  async deleteSource(id: string) {
    const { error } = await supabase.from('scrape_sources').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { id, deleted: true };
  }

  /** Loads the facts in starter-facts.ts as PENDING so an admin can review them. Safe to click twice. */
  async loadStarterFacts() {
    const { data: services } = await supabase.from('services').select('id, name_en');
    const byName = new Map((services ?? []).map((s: any) => [s.name_en, s.id]));
    const missingServices = new Set<string>();
    let added = 0;
    let skipped = 0;

    const insertOne = async (f: (typeof STARTER_FACTS)[number]) => {
      const serviceId = byName.get(f.service);
      if (!serviceId) {
        missingServices.add(f.service);
        return;
      }
      try {
        await this.knowledge.addKnowledgeChunk(serviceId, f.en, f.am ?? '', f.url.includes('t.me') ? 'telegram' : 'website', f.label, {
          status: 'pending',
          sourceUrl: f.url,
          category: f.category,
          trustLevel: f.trust ?? 'official',
          contentHash: crypto.createHash('sha256').update(f.en.replace(/\s+/g, ' ').toLowerCase()).digest('hex'),
          metadata: { kind: 'starter', verified_on: '2026-11-17', note: f.note ?? null, service: f.service },
        });
        added++;
      } catch (error: any) {
        if (error?.code === '23505') skipped++;
        else throw new BadRequestException(error?.message ?? 'Could not add a starter fact');
      }
    };

    // a few at a time: much faster than one by one, and gentle on the AI rate limit
    for (let i = 0; i < STARTER_FACTS.length; i += 4) {
      await Promise.all(STARTER_FACTS.slice(i, i + 4).map(insertOne));
    }
    return { added, skipped, missingServices: [...missingServices] };
  }

  scraperStatus() {
    return this.scraper.status();
  }

  /** One screen that tells you what is wrong, instead of guessing. */
  async diagnostics() {
    type Check = { id: string; label: string; status: 'ok' | 'warn' | 'fail'; detail: string; fix?: string };
    const checks: Check[] = [];
    const add = (id: string, label: string, status: Check['status'], detail: string, fix?: string) => checks.push({ id, label, status, detail, fix });

    // environment
    add('gemini', 'GEMINI_API_KEY', process.env.GEMINI_API_KEY ? 'ok' : 'fail', process.env.GEMINI_API_KEY ? 'Set' : 'Missing', 'Add GEMINI_API_KEY to the backend .env and restart.');
    add('sburl', 'SUPABASE_URL', process.env.SUPABASE_URL ? 'ok' : 'fail', process.env.SUPABASE_URL ? 'Set' : 'Missing', 'Add SUPABASE_URL to the backend .env.');
    let role = 'unknown';
    try {
      role = JSON.parse(Buffer.from(String(process.env.SUPABASE_KEY).split('.')[1], 'base64url').toString()).role;
    } catch {
      /* not a JWT */
    }
    add('sbkey', 'SUPABASE_KEY role', role === 'service_role' ? 'ok' : 'fail', `The key in SUPABASE_KEY has role "${role}"`, role === 'service_role' ? undefined : 'The backend must use the service_role key (Supabase > Project Settings > API > service_role). With the anon key, security rules hide rows such as pending facts from the backend.');
    add('anon', 'SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY ? 'ok' : 'warn', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set (admin login falls back to SUPABASE_KEY)', 'Add the anon key as SUPABASE_ANON_KEY.');
    add('chapa', 'CHAPA_SECRET_KEY', process.env.CHAPA_SECRET_KEY ? 'ok' : 'warn', process.env.CHAPA_SECRET_KEY ? 'Set' : 'Not set: premium payments are off', 'Add CHAPA_SECRET_KEY (test key first) and restart.');
    add('front', 'FRONTEND_URL', process.env.FRONTEND_URL ? 'ok' : 'warn', process.env.FRONTEND_URL ?? 'Not set (defaults to http://localhost:5173)', 'Set FRONTEND_URL to your website address so payments return to the right place.');

    // Google sign-in
    try {
      const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: String(process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY) } });
      const s: any = await r.json();
      const on = !!s?.external?.google;
      add('google', 'Google sign-in (Supabase)', on ? 'ok' : 'fail', on ? 'The Google provider is enabled' : 'The Google provider is switched OFF in Supabase, so "Continue with Google" fails',
        on ? undefined : 'Supabase > Authentication > Sign In / Providers > Google: turn it on and paste the Client ID and Client Secret from Google Cloud (OAuth client type: Web).');
    } catch (e: any) {
      add('google', 'Google sign-in (Supabase)', 'warn', `Could not check: ${String(e?.message ?? e).slice(0, 120)}`);
    }

    // database shape
    const probe = async (id: string, table: string, cols: string, file: string) => {
      const { error } = await supabase.from(table).select(cols).limit(1);
      add(id, `${table}: ${cols}`, error ? 'fail' : 'ok', error ? error.message : 'Present', error ? `Run ${file} in the Supabase SQL Editor.` : undefined);
    };
    await probe('kb', 'knowledge_base', 'category,supersedes_id,trust_level,last_verified_at', 'sql/01_migration.sql');
    await probe('logs', 'scraper_logs', 'details', 'sql/01_migration.sql');
    await probe('src', 'scrape_sources', 'trust_level,last_error', 'sql/01_migration.sql');
    await probe('chat', 'chat_history', 'answered', 'sql/04_unanswered_tracking.sql');
    await probe('subs', 'subscriptions', 'id,ends_at', 'sql/06_subscription_and_sources.sql');
    await probe('packs', 'premium_packs', 'subscription_id', 'sql/06_subscription_and_sources.sql');

    const zero = Array(768).fill(0);
    for (const fn of ['match_documents', 'match_documents_any']) {
      const { error } = await supabase.rpc(fn, { query_embedding: zero, match_threshold: 2, match_count: 1 });
      add(`rpc_${fn}`, `Function ${fn}`, error ? 'fail' : 'ok', error ? error.message : 'Works', error ? 'Run sql/01_migration.sql (match_documents_any) or check your match_documents function.' : undefined);
    }

    // the review queue: why does the badge differ from the list?
    const { count } = await supabase.from('knowledge_base').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    const list = await supabase.from('knowledge_base').select('id, services(name_en)').eq('status', 'pending').limit(300);
    add('pending', 'Review queue', list.error ? 'fail' : (count ?? 0) === (list.data?.length ?? 0) ? 'ok' : 'warn', list.error ? `The list query fails: ${list.error.message}` : `${count ?? 0} pending facts, list returns ${list.data?.length ?? 0}`, list.error ? 'Run sql/01_migration.sql, then refresh the Review queue.' : undefined);

    // Does the chatbot search return facts that nobody has approved yet?
    try {
      const { data: pend } = await supabase.from('knowledge_base').select('chunk_text, embedding').eq('status', 'pending').not('embedding', 'is', null).limit(1);
      if (!pend?.length) {
        add('leak', 'Chat only uses approved facts', 'ok', 'No pending facts to test with right now');
      } else {
        const emb = typeof pend[0].embedding === 'string' ? JSON.parse(pend[0].embedding) : pend[0].embedding;
        const { data: hits, error } = await supabase.rpc('match_documents', { query_embedding: emb, match_threshold: 0.95, match_count: 5 });
        if (error) add('leak', 'Chat only uses approved facts', 'warn', `Could not test: ${error.message}`);
        else if ((hits ?? []).some((h: any) => h.chunk_text === pend[0].chunk_text)) add('leak', 'Chat only uses approved facts', 'fail', 'An unreviewed (pending) fact was returned by the chatbot search', 'Run sql/08_approved_only_search.sql in the Supabase SQL Editor.');
        else add('leak', 'Chat only uses approved facts', 'ok', 'Pending facts are not returned to the chatbot');
      }
    } catch (e: any) {
      add('leak', 'Chat only uses approved facts', 'warn', `Could not test: ${String(e?.message ?? e).slice(0, 160)}`);
    }

    // Gemini
    try {
      await this.ai.generateEmbedding('connection test', 'query');
      add('gemini_call', 'Gemini call', 'ok', 'An embedding request worked');
    } catch (e: any) {
      add('gemini_call', 'Gemini call', 'fail', String(e?.message ?? e).slice(0, 200), 'Check the API key, billing and quota in Google AI Studio.');
    }

    // sources
    const { data: sources } = await supabase.from('scrape_sources').select('name, url, is_active').order('created_at', { ascending: true }).limit(12);
    const probes = await Promise.all((sources ?? []).map((s: any) => this.scraper.probeUrl(s.url).then((p: any) => ({ s, p }))));
    for (const { s, p } of probes) {
      const thin = p.ok && typeof p.words === 'number' && p.words < 80;
      add(`source_${s.name}`, `Source: ${s.name}${s.is_active ? '' : ' (inactive)'}`, p.ok ? (thin ? 'warn' : 'ok') : 'fail',
        p.ok ? `HTTP ${p.status}, ${p.words} words of text, ${p.ms} ms${thin ? ' (very little text: the page may need JavaScript)' : ''}` : `${p.error}${p.ms ? ` (${p.ms} ms)` : ''}`,
        p.ok ? undefined : p.robots === false ? 'The site forbids bots. Ask the owner for permission or use another source.' : 'Open the URL in a browser. If it works there, the server running the backend may be blocked or offline.');
    }

    return { ranAt: new Date().toISOString(), checks };
  }

  testSource(body: any) {
    if (typeof body?.url !== 'string') throw new BadRequestException('url is required');
    return this.scraper.testSource({
      url: body.url.trim(),
      source_type: SOURCE_TYPES.includes(body.source_type) ? body.source_type : 'website',
      fetch_method: FETCH_METHODS.includes(body.fetch_method) ? body.fetch_method : null,
      css_selector: typeof body.css_selector === 'string' && body.css_selector.trim() ? body.css_selector.trim() : null,
    });
  }

  async importText(body: any) {
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (text.length < 40) throw new BadRequestException('Paste at least a few sentences of text');
    if (text.length > 60000) throw new BadRequestException('Text is too long (max 60,000 characters). Split it into parts.');
    let url: string | null = null;
    if (typeof body?.url === 'string' && body.url.trim()) {
      try {
        const u = new URL(body.url.trim());
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
        url = u.toString();
      } catch {
        throw new BadRequestException('The source link is not a valid http(s) URL');
      }
    }
    return this.scraper.importText({ text, url, serviceId: body?.service_id || null, trust: body?.trust_level, title: typeof body?.title === 'string' ? body.title.slice(0, 160) : null });
  }

  runScraper(body: { sourceId?: string; types?: string[] }) {
    if (this.scraper.busy) return { started: false, reason: 'A run is already in progress' };
    const types = (body?.types ?? []).filter((t) => SOURCE_TYPES.includes(t)) as Array<'website' | 'telegram'>;
    // Runs in the background (it can take minutes); the admin UI polls the logs
    void this.scraper.runPipeline(types.length ? types : undefined, body?.sourceId).catch((e) => this.logger.error(`Manual run failed: ${e?.message ?? e}`));
    return { started: true };
  }
}
