// backend/src/modules/scraper/scraper.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { supabase } from '../../config/supabase.config';

export interface ScrapeResult {
  success: boolean;
  url: string;
  title: string;
  content: string;
  contentHash: string;
  wordCount: number;
  error?: string;
}

type SourceType = 'website' | 'telegram';
type FetchMethod = 'wordpress_api' | 'html' | 'telegram_preview';

interface SourceRow {
  id: string;
  source_type: SourceType;
  name: string;
  url: string;
  fetch_method: FetchMethod | null;
  css_selector: string | null;
  service_id: string | null;
  last_content_hash: string | null;
}

interface ExtractedFact {
  service?: string;
  fact_en?: string;
  fact_am?: string;
  evidence?: string;
}

export interface Stats {
  itemsChecked: number;
  itemsUnchanged: number;
  itemsNotRelevant: number;
  itemsFailed: number;
  factsRejected: number;
  factsDuplicate: number;
  factsSaved: number;
}

const TIMEZONE = 'Africa/Addis_Ababa';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private isRunning = false;
  private services: Array<{ id: string; name_en: string }> = [];

  private readonly ALLOWED_HOSTS = ['ics.gov.et', 'immigration.gov.et', 'etrade.gov.et', 'motri.gov.et', 't.me'];

  constructor(
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  private cronEnabled(): boolean {
    return process.env.SCRAPER_CRON_ENABLED === 'true';
  }

  @Cron('0 */6 * * *', { timeZone: TIMEZONE })
  async scheduledTelegramRun() {
    if (!this.cronEnabled()) return;
    this.logger.log('⏰ Scheduled run: telegram sources');
    try {
      await this.runPipeline(['telegram']);
    } catch (error) {
      this.logger.error(`Scheduled telegram run failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  @Cron('0 6 * * 1', { timeZone: TIMEZONE })
  async scheduledWebsiteRun() {
    if (!this.cronEnabled()) return;
    this.logger.log('⏰ Scheduled run: website sources');
    try {
      await this.runPipeline(['website']);
    } catch (error) {
      this.logger.error(`Scheduled website run failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  
  private emptyStats(): Stats {
    return {
      itemsChecked: 0, itemsUnchanged: 0, itemsNotRelevant: 0, itemsFailed: 0,
      factsRejected: 0, factsDuplicate: 0, factsSaved: 0,
    };
  }

  isAllowedUrl(url: string): boolean {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      return (
        ['http:', 'https:'].includes(u.protocol) &&
        this.ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h))
      );
    } catch {
      return false;
    }
  }

  private sha(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private norm(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchText(url: string): Promise<string> {
    if (!this.isAllowedUrl(url)) throw new Error(`Host not allowed: ${url}`);

    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 3,
      maxContentLength: 5 * 1024 * 1024,
      responseType: 'text',
      headers: {
        'User-Agent': 'TebibBot/1.0 (Ethiopian Government Services Assistant; educational project)',
        'Accept': '*/*',
        'Accept-Language': 'am,en-US;q=0.9,en;q=0.8',
      },
    });

    const finalUrl: string = response.request?.res?.responseUrl ?? url;
    if (!this.isAllowedUrl(finalUrl)) throw new Error(`Redirected to a disallowed host: ${finalUrl}`);

    return String(response.data);
  }


  async scrapeWebsite(url: string, selector?: string): Promise<ScrapeResult> {
    if (!this.isAllowedUrl(url)) {
      return { success: false, url, title: '', content: '', contentHash: '', wordCount: 0, error: 'URL host is not allowed' };
    }

    try {
      this.logger.log(`🌐 Fetching: ${url}`);
      const html = await this.fetchText(url);

      const $ = cheerio.load(html);
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      $('script, style, noscript, iframe, form, nav, footer, .skip-link, .screen-reader-text, .breadcrumb, .main-navigation, ul.menu').remove();

      let rawText = '';
      if (selector && $(selector).length > 0) {
        rawText = $(selector).text();
      } else {
        const mainText = $('main, article, #content, .entry-content').first().text().replace(/\s+/g, ' ').trim();
        rawText = mainText.length >= 500 ? mainText : $('body').text();
      }

      const cleanContent = this.norm(rawText);
      const contentHash = this.sha(cleanContent);
      const wordCount = cleanContent.split(/\s+/).filter((w) => w.length > 0).length;

      this.logger.log(`✅ Extracted: "${title}" (${wordCount} words)`);
      return { success: true, url, title, content: cleanContent, contentHash, wordCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to scrape ${url}: ${errorMessage}`);
      return { success: false, url, title: '', content: '', contentHash: '', wordCount: 0, error: errorMessage };
    }
  }

   private isRelevant(text: string): boolean {
    const lower = text.toLowerCase();
    const en =
      /\b(passport|e-passport|fee|fees|kebele|licen[sc]e|birth|requirements?|visa|residence|renew\w*|urgent|trade|tin)\b/;
    const am = ['ፓስፖርት', 'ኢ-ፓስፖርት', 'ቀበሌ', 'ክፍያ', 'መታወቂያ', 'ልደት', 'ፈቃድ', 'ቪዛ', 'እድሳት', 'አስቸኳይ', 'ንግድ'];
    return en.test(lower) || am.some((k) => text.includes(k));
  }

  private numbersIn(text: string): string[] {
    return (text.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]+$/, '').replace(/,/g, ''));
  }

  private numbersGrounded(fact: string, source: string): boolean {
    const sourceNumbers = new Set(this.numbersIn(source));
    return this.numbersIn(fact).every((n) => sourceNumbers.has(n));
  }

  private matchServiceId(name: string | undefined, fallback: string | null): string | null {
    const n = (name ?? '').toLowerCase().trim();
    if (n) {
      const hit = this.services.find((s) => {
        const sn = String(s.name_en).toLowerCase();
        return sn.includes(n) || n.includes(sn);
      });
      if (hit) return hit.id;
    }
    return fallback;
  }

  private buildPrompt(text: string, url: string, title?: string): string {
    return `You extract facts about Ethiopian government services from an official source.
Source: ${url}
${title ? `Title: ${title}\n` : ''}
Return a JSON array. Each item must have exactly these fields:
- "service": short service name (for example "Passport", "Kebele ID", "Driving License", "Business License", "Birth Certificate")
- "fact_en": one self-contained fact in English
- "fact_am": the same fact in Amharic
- "evidence": an exact quote copied from the text below (10 to 200 characters) that supports the fact

Rules:
1. Use ONLY information stated in the text. Never invent or convert numbers, fees, dates or names. Copy numbers exactly as written. Do not convert Ethiopian-calendar dates.
2. Keep only facts that help a citizen use a service: fees, required documents, steps, where or how to apply, deadlines, processing times, contact numbers, and changes to a service.
3. Ignore news about meetings, visits, appointments, workshops and ceremonies.
4. If there are no such facts, return [].

Text:
"""
${text.substring(0, 6000)}
"""`;
  }

  private async markSeen(sourceType: string, itemUrl: string, itemHash: string, found: number, saved: number) {
    const { error } = await supabase.from('scraped_items').insert([
      { source_type: sourceType, item_url: itemUrl, content_hash: itemHash, facts_found: found, facts_saved: saved },
    ]);
    if (error && error.code !== '23505') {
      this.logger.warn(`Could not record scraped item: ${error.message}`);
    }
  }

  private async processItem(
    src: SourceRow,
    stats: Stats,
    item: { text: string; itemUrl: string; publishedAt?: string; title?: string },
  ) {
    const { text, itemUrl, publishedAt, title } = item;
    stats.itemsChecked++;
    const itemHash = this.sha(text);

    // 1. Same content already processed? Skip (no Gemini call)
    const { data: seen } = await supabase
      .from('scraped_items')
      .select('id')
      .eq('item_url', itemUrl)
      .eq('content_hash', itemHash)
      .maybeSingle();
    if (seen) {
      stats.itemsUnchanged++;
      return;
    }

    // 2. Keyword filter
    if (!this.isRelevant(text)) {
      stats.itemsNotRelevant++;
      await this.markSeen(src.source_type, itemUrl, itemHash, 0, 0);
      return;
    }

    // 3. Gemini extraction (JSON mode, with retries, no mock fallback)
    let facts: ExtractedFact[] = [];
    try {
      facts = await this.aiService.extractFacts(this.buildPrompt(text, itemUrl, title));
      await this.sleep(500);
    } catch (error) {
      stats.itemsFailed++;
      this.logger.error(`❌ Gemini extraction failed for ${itemUrl}: ${error instanceof Error ? error.message : error}`);
      return; // not marked as seen: retried next run
    }

    // 4. Validate every fact against the source, then save as pending
    let saved = 0;
    let hadHardError = false;
    const sourceNorm = this.norm(text);

    for (const f of facts) {
      if (!f?.fact_en || !f?.evidence) {
        stats.factsRejected++;
        this.logger.warn(`🚫 Rejected (missing fields) from ${itemUrl}`);
        continue;
      }

      const evidenceOk = f.evidence.length >= 10 && sourceNorm.includes(this.norm(f.evidence));
      const numbersOk = this.numbersGrounded(f.fact_en, text) && this.numbersGrounded(f.fact_am ?? '', text);

      if (!evidenceOk || !numbersOk) {
        stats.factsRejected++;
        this.logger.warn(
          `🚫 Rejected (${!evidenceOk ? 'evidence not found in source' : 'number not in source'}): "${f.fact_en.substring(0, 80)}"`,
        );
        continue;
      }

      try {
        await this.knowledgeService.addKnowledgeChunk(
          this.matchServiceId(f.service, src.service_id),
          f.fact_en,
          f.fact_am ?? '',
          src.source_type,
          src.name,
          {
            status: 'pending',
            sourceUrl: itemUrl,
            sourcePublishedAt: publishedAt,
            contentHash: this.sha(this.norm(f.fact_en).toLowerCase()), // one hash per fact
            metadata: {
              scraped_at: new Date().toISOString(),
              service: f.service ?? null,
              evidence: f.evidence,
              source_hash: itemHash,
            },
          },
        );
        saved++;
        stats.factsSaved++;
      } catch (error: any) {
        if (error?.code === '23505') {
          stats.factsDuplicate++;
        } else {
          hadHardError = true;
          this.logger.error(`❌ Could not save fact: ${error?.message ?? error}`);
        }
      }
    }

    if (!hadHardError) await this.markSeen(src.source_type, itemUrl, itemHash, facts.length, saved);
  }

  // ---------------------------------------------------------------------------
  // Per-method fetchers
  // ---------------------------------------------------------------------------

  private async scrapeWordPress(src: SourceRow, stats: Stats) {
    const sep = src.url.includes('?') ? '&' : '?';
    const url = src.url.includes('_fields=') ? src.url : `${src.url}${sep}_fields=link,date,title,content`;

    const raw = await this.fetchText(url);
    const posts = JSON.parse(raw);
    if (!Array.isArray(posts)) throw new Error('Unexpected WordPress API response (not a list)');
    this.logger.log(`📰 ${src.name}: got ${posts.length} posts`);

    for (const post of posts) {
      const text = this.norm(cheerio.load(post.content?.rendered ?? '').root().text());
      const title = this.norm(cheerio.load(post.title?.rendered ?? '').root().text());
      if (text.length < 40) continue;

      await this.processItem(src, stats, {
        text: title ? `${title}. ${text}` : text,
        itemUrl: post.link,
        publishedAt: post.date ? new Date(post.date).toISOString() : undefined,
        title,
      });
    }
  }

  private async scrapeTelegram(src: SourceRow, stats: Stats) {
    const channel = new URL(src.url).pathname.split('/').filter(Boolean).filter((p) => p !== 's').pop();
    if (!channel) throw new Error(`Could not read channel name from ${src.url}`);

    const html = await this.fetchText(`https://t.me/s/${channel}`);
    const $ = cheerio.load(html);

    const messages: Array<{ text: string; url: string; date?: string }> = [];
    $('.tgme_widget_message').each((_, el) => {
      const post = $(el).attr('data-post'); // e.g. "ICS_Ethiopia/1234"
      const text = this.norm($(el).find('.tgme_widget_message_text').text());
      const date = $(el).find('time').attr('datetime');
      if (post && text.length > 50) {
        messages.push({ text, url: `https://t.me/${post}`, date: date ? new Date(date).toISOString() : undefined });
      }
    });

    if (messages.length === 0) {
      throw new Error('No messages found: the channel web preview is probably disabled');
    }
    this.logger.log(`💬 ${src.name}: found ${messages.length} messages`);

    for (const m of messages) {
      await this.processItem(src, stats, { text: m.text, itemUrl: m.url, publishedAt: m.date });
    }
  }

  private async scrapeHtmlPage(src: SourceRow, stats: Stats) {
    const result = await this.scrapeWebsite(src.url, src.css_selector ?? undefined);
    if (!result.success) throw new Error(result.error ?? 'Scrape failed');

    await this.processItem(src, stats, { text: result.content, itemUrl: src.url, title: result.title });

    const changed = result.contentHash !== src.last_content_hash;
    await supabase
      .from('scrape_sources')
      .update({
        last_content_hash: result.contentHash,
        ...(changed ? { last_changed_at: new Date().toISOString() } : {}),
      })
      .eq('id', src.id);
  }

  // ---------------------------------------------------------------------------
  // Pipeline + logging
  // ---------------------------------------------------------------------------

  private async logRun(src: SourceRow, stats: Stats, status: string, errorMessage: string | null, startedAt: number) {
    const { error } = await supabase.from('scraper_logs').insert([
      {
        source_type: src.source_type,
        source_name: src.name,
        messages_fetched: stats.itemsChecked,
        messages_relevant: stats.itemsChecked - stats.itemsUnchanged - stats.itemsNotRelevant,
        updates_made: stats.factsSaved,
        items_pending: stats.factsSaved,
        items_failed: stats.itemsFailed,
        status,
        error_message: errorMessage,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      },
    ]);
    if (error) this.logger.warn(`Could not write scraper_logs: ${error.message}`);
  }

  private async runSource(src: SourceRow) {
    const startedAt = Date.now();
    const stats = this.emptyStats();
    let status = 'success';
    let errorMessage: string | null = null;

    this.logger.log(`▶️  Source: ${src.name}`);

    if (!this.isAllowedUrl(src.url)) {
      status = 'failed';
      errorMessage = 'URL host is not on the allowed list';
    } else {
      try {
        const method: FetchMethod =
          src.fetch_method ?? (src.source_type === 'telegram' ? 'telegram_preview' : 'html');

        if (method === 'wordpress_api') await this.scrapeWordPress(src, stats);
        else if (method === 'telegram_preview') await this.scrapeTelegram(src, stats);
        else await this.scrapeHtmlPage(src, stats);
      } catch (error) {
        status = 'failed';
        errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ ${src.name}: ${errorMessage}`);
      }
    }

    if (status === 'success' && stats.itemsFailed > 0) status = 'partial';

    await supabase.from('scrape_sources').update({ last_checked_at: new Date().toISOString() }).eq('id', src.id);
    await this.logRun(src, stats, status, errorMessage, startedAt);

    return { source: src.name, status, error: errorMessage, ...stats };
  }

  /** Run every active source (optionally only some types) */
  async runPipeline(types?: SourceType[]) {
    if (this.isRunning) {
      this.logger.warn('⏭️ Pipeline already running, skipping this trigger.');
      return { skipped: 'already running' };
    }

    this.isRunning = true;
    this.logger.log('🚀 Starting scraping pipeline...');

    try {
      const { data: services } = await supabase.from('services').select('id, name_en');
      this.services = services ?? [];

      let query = supabase.from('scrape_sources').select('*').eq('is_active', true);
      if (types?.length) query = query.in('source_type', types);
      const { data: sources, error } = await query;
      if (error) throw error;

      if (!sources?.length) {
        this.logger.warn('No active sources in scrape_sources.');
        return { results: [], note: 'No active sources' };
      }

           const results: Array<Stats & { source: string; status: string; error: string | null }> = [];
      for (const src of sources as SourceRow[]) {
        results.push(await this.runSource(src));
      }

      this.logger.log(`✅ Pipeline complete: ${JSON.stringify(results.map((r) => ({ source: r.source, status: r.status })))}`);
      return { results };
    } finally {
      this.isRunning = false;
    }
  }
}