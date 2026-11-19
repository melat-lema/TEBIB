// backend/src/modules/scraper/scraper.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { supabase } from '../../config/supabase.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrapeResult {
  success: boolean;
  url: string;
  title: string;
  content: string;
  contentHash: string;
  wordCount: number;
  error?: string;
}

export type SourceType = 'website' | 'telegram';
export type FetchMethod = 'wordpress_api' | 'html' | 'html_index' | 'telegram_preview';

export interface SourceRow {
  id: string;
  source_type: SourceType;
  name: string;
  url: string;
  fetch_method: FetchMethod | null;
  css_selector: string | null;
  service_id: string | null;
  last_content_hash: string | null;
  trust_level?: string | null;
}

const CATEGORIES = ['fee', 'requirement', 'step', 'contact', 'office', 'deadline', 'update', 'other'] as const;
type Category = (typeof CATEGORIES)[number];

interface ExtractedFact {
  service?: string | null;
  category?: string | null;
  fact_en?: string;
  fact_am?: string;
  evidence?: string;
  effective_date?: string | null;
}

interface Item {
  text: string;
  itemUrl: string;
  title?: string;
  publishedAt?: string;
  pageHash?: string; // html pages only
}

export interface ItemTrace {
  url: string;
  title?: string;
  outcome: 'unchanged' | 'not_relevant' | 'too_old' | 'no_facts' | 'saved' | 'failed';
  chars: number;
  found: number;
  saved: number;
}

export interface Stats {
  itemsChecked: number;
  itemsUnchanged: number;
  itemsNotRelevant: number;
  itemsFailed: number;
  factsRejected: number;
  factsDuplicate: number;
  factsSaved: number;
  factsUpdates: number;
  trace: ItemTrace[];
  rejectedSamples: Array<{ reason: string; fact: string; evidence: string; url: string }>;
}

const TIMEZONE = 'Africa/Addis_Ababa';
const UA = 'TebibBot/1.0 (Ethiopian Government Services Assistant; educational project)';
const DUP_SCORE = Number(process.env.SCRAPER_DUP_SCORE ?? 0.93); // same meaning + same numbers = duplicate
const UPDATE_SCORE = Number(process.env.SCRAPER_UPDATE_SCORE ?? 0.8); // same topic, different content = update

const WORD_NUM: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  ten: '10', eleven: '11', twelve: '12', fifteen: '15', twenty: '20', thirty: '30', sixty: '60', ninety: '90',
};

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private isRunning = false;
  private progress = {
    running: false, startedAt: 0, sourceName: '', sourcesDone: 0, sourcesTotal: 0, itemsDone: 0, itemsTotal: 0, savedTotal: 0,
    lastFinished: null as null | { at: string; saved: number; sources: number; seconds: number },
  };
  private services: Array<{ id: string; name_en: string }> = [];

  // Hosts that may be fetched: built-in + SCRAPER_ALLOWED_HOSTS (comma list) + hosts of rows in scrape_sources.
  private readonly BASE_HOSTS = ['ics.gov.et', 'immigration.gov.et', 'etrade.gov.et', 'motri.gov.et', 'id.gov.et', 't.me'];
  private dbHosts = new Set<string>();
  private dbHostsAt = 0;
  private robots = new Map<string, { rules: Array<{ allow: boolean; re: RegExp; len: number }>; at: number }>();

  constructor(
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  get busy() {
    return this.isRunning;
  }

  /** Live progress for the admin panel. */
  status() {
    return { ...this.progress, elapsedSec: this.progress.running ? Math.floor((Date.now() - this.progress.startedAt) / 1000) : 0 };
  }

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

  @Cron('0 6 * * *', { timeZone: TIMEZONE }) // daily: fee/requirement changes should not wait a week
  async scheduledWebsiteRun() {
    if (!this.cronEnabled()) return;
    this.logger.log('⏰ Scheduled run: website sources');
    try {
      await this.runPipeline(['website']);
    } catch (error) {
      this.logger.error(`Scheduled website run failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Security: host allow-list, private-network block, robots.txt
  // ---------------------------------------------------------------------------

  async refreshHosts(force = false) {
    if (!force && Date.now() - this.dbHostsAt < 60_000) return;
    const { data } = await supabase.from('scrape_sources').select('url');
    this.dbHosts = new Set(
      (data ?? [])
        .map((r: any) => {
          try {
            return new URL(r.url).hostname.toLowerCase();
          } catch {
            return '';
          }
        })
        .filter(Boolean),
    );
    this.dbHostsAt = Date.now();
  }

  isPrivateHost(host: string) {
    return (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '::1' ||
      host.startsWith('[') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }

  isAllowedUrl(url: string): boolean {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (!['http:', 'https:'].includes(u.protocol) || this.isPrivateHost(host)) return false;
      const extra = (process.env.SCRAPER_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
      const allowed = [...this.BASE_HOSTS, ...extra, ...this.dbHosts];
      return allowed.some((h) => host === h || host.endsWith('.' + h));
    } catch {
      return false;
    }
  }

  private parseRobots(txt: string) {
    const rules: Array<{ allow: boolean; re: RegExp; len: number }> = [];
    let applies = false;
    let inAgentBlock = false;
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.split('#')[0].trim();
      const idx = line.indexOf(':');
      if (!line || idx < 0) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      if (key === 'user-agent') {
        if (!inAgentBlock) applies = false; // a new group starts
        inAgentBlock = true;
        const agent = value.toLowerCase();
        if (agent === '*' || agent.includes('tebibbot')) applies = true;
      } else {
        inAgentBlock = false;
        if (applies && (key === 'allow' || key === 'disallow') && value) {
          const re = new RegExp('^' + value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'));
          rules.push({ allow: key === 'allow', re, len: value.length });
        }
      }
    }
    return rules;
  }

  /** Respect robots.txt. Set SCRAPER_RESPECT_ROBOTS=false only for sites you own or have permission to scrape. */
  private async robotsAllows(url: string): Promise<boolean> {
    if (process.env.SCRAPER_RESPECT_ROBOTS === 'false') return true;
    const u = new URL(url);
    let entry = this.robots.get(u.origin);
    if (!entry || Date.now() - entry.at > 6 * 3_600_000) {
      let rules: Array<{ allow: boolean; re: RegExp; len: number }> = [];
      try {
        const res = await axios.get(`${u.origin}/robots.txt`, {
          timeout: 8000,
          responseType: 'text',
          validateStatus: (s) => s < 500,
          headers: { 'User-Agent': UA },
        });
        if (res.status === 200) rules = this.parseRobots(String(res.data));
      } catch {
        /* robots.txt unreachable: treated as allowed */
      }
      entry = { rules, at: Date.now() };
      this.robots.set(u.origin, entry);
    }
    const target = u.pathname + u.search;
    let best: { allow: boolean; len: number } | null = null;
    for (const r of entry.rules) {
      if (!r.re.test(target)) continue;
      if (!best || r.len > best.len || (r.len === best.len && r.allow)) best = { allow: r.allow, len: r.len };
    }
    return best ? best.allow : true;
  }

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  private sha(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
  private norm(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
  /** Comparison form: ignores case, quotes, punctuation (incl. Amharic ። ፣) and whitespace. */
  private loose(text: string): string {
    return text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[\s"'`“”‘’.,;:!?()\[\]{}\-–—•|።፣፤፥፦፧]+/g, ' ')
      .trim();
  }
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  private cleanLines(text: string): string {
    return text
      .split(/\r?\n/)
      .map((l) => l.replace(/[ \t\u00a0\u200b]+/g, ' ').replace(/(\s*\|\s*)+$/, '').trim())
      .filter((l) => l && l !== '•')
      .join('\n');
  }

  private async fetchText(url: string): Promise<string> {
    if (!this.isAllowedUrl(url)) throw new Error(`Host not allowed: ${url}`);
    if (!(await this.robotsAllows(url))) {
      throw new Error(`Blocked by robots.txt: ${url}. Ask the site owner for permission or use another source.`);
    }

    const response = await axios.get(url, {
      timeout: 20000,
      maxRedirects: 3,
      maxContentLength: 5 * 1024 * 1024,
      responseType: 'text',
      headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'am,en-US;q=0.9,en;q=0.8' },
    });

    const finalUrl: string = response.request?.res?.responseUrl ?? url;
    if (!this.isAllowedUrl(finalUrl)) throw new Error(`Redirected to a disallowed host: ${finalUrl}`);
    return String(response.data);
  }

  /**
   * HTML -> readable text that KEEPS structure: list items become "• item",
   * table cells become "cell | cell", blocks become separate lines.
   * (Fee tables are the most important content on service pages and used to be flattened into one blob.)
   */
  private htmlToText($: any, root: any): string {
    const el = root.clone();
    el.find(
      'script, style, noscript, iframe, svg, nav, footer, aside, input, select, textarea, button, ' +
        '.skip-link, .screen-reader-text, .breadcrumb, .main-navigation, ul.menu, .widget, .sharedaddy, .cookie-notice',
    ).remove();
    el.find('br').replaceWith('\n');
    el.find('li').each((_: number, n: any) => {
      $(n).prepend('• ').append('\n');
    });
    el.find('td, th').each((_: number, n: any) => {
      $(n).append(' | ');
    });
    el.find('tr, p, div, section, article, h1, h2, h3, h4, h5, h6, dt, dd, blockquote, ul, ol, table').each((_: number, n: any) => {
      $(n).append('\n');
    });
    return this.cleanLines(el.text());
  }

  // ---------------------------------------------------------------------------
  // Fetchers: each returns a list of items (nothing is written to the database here)
  // ---------------------------------------------------------------------------

  async scrapeWebsite(url: string, selector?: string): Promise<ScrapeResult> {
    try {
      this.logger.log(`🌐 Fetching: ${url}`);
      const html = await this.fetchText(url);
      const $ = cheerio.load(html);
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      let content = '';
      if (selector && $(selector).length > 0) {
        content = this.cleanLines(
          $(selector)
            .toArray()
            .map((n: any) => this.htmlToText($, $(n)))
            .join('\n'),
        );
      } else {
        for (const sel of ['main', 'article', '#content', '.entry-content', '.page-content', '.content', '#main']) {
          const node = $(sel).first();
          if (!node.length) continue;
          const text = this.htmlToText($, node);
          if (text.length >= 400) {
            content = text;
            break;
          }
        }
        if (!content) content = this.htmlToText($, $('body'));
      }

      const wordCount = content.split(/\s+/).filter(Boolean).length;
      this.logger.log(`✅ Extracted: "${title}" (${wordCount} words)`);
      return { success: true, url, title, content, contentHash: this.sha(content), wordCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to scrape ${url}: ${errorMessage}`);
      return { success: false, url, title: '', content: '', contentHash: '', wordCount: 0, error: errorMessage };
    }
  }

  private async collectWordPress(src: SourceRow): Promise<Item[]> {
    const u = new URL(src.url);
    if (!u.searchParams.has('per_page')) u.searchParams.set('per_page', '30');
    if (!u.searchParams.has('_fields')) u.searchParams.set('_fields', 'link,date,modified,title,content');

    const posts = JSON.parse(await this.fetchText(u.toString()));
    if (!Array.isArray(posts)) {
      throw new Error(`Unexpected WordPress API response${posts?.message ? `: ${posts.message}` : ' (not a list)'}`);
    }

    const items: Item[] = [];
    for (const post of posts) {
      const $c = cheerio.load(`<div>${post.content?.rendered ?? ''}</div>`);
      const text = this.htmlToText($c, $c('div').first());
      const title = this.norm(cheerio.load(post.title?.rendered ?? '').root().text());
      if (text.length < 40) continue;
      const date = post.modified ?? post.date;
      items.push({
        text: title ? `${title}\n${text}` : text,
        itemUrl: post.link,
        title,
        publishedAt: date ? new Date(date).toISOString() : undefined,
      });
    }
    return items;
  }

  private async collectTelegram(src: SourceRow): Promise<Item[]> {
    const channel = new URL(src.url).pathname.split('/').filter(Boolean).filter((p) => p !== 's').pop();
    if (!channel) throw new Error(`Could not read channel name from ${src.url}`);

    const pages = Math.max(1, Number(process.env.SCRAPER_TELEGRAM_PAGES ?? 2));
    const seen = new Set<string>();
    const items: Item[] = [];
    let before: string | null = null;

    for (let page = 0; page < pages; page++) {
      const html = await this.fetchText(`https://t.me/s/${channel}${before ? `?before=${before}` : ''}`);
      const $ = cheerio.load(html);
      let minId = Infinity;
      let count = 0;

      $('.tgme_widget_message').each((_: number, el: any) => {
        const post = $(el).attr('data-post'); // e.g. "ICS_Ethiopia/1234"
        const id = Number(post?.split('/')[1]);
        if (Number.isFinite(id) && id < minId) minId = id;
        count++;

        const body = $(el).find('.tgme_widget_message_text').first();
        body.find('br').replaceWith('\n'); // keeps lists of requirements on separate lines
        const text = this.cleanLines(body.text());
        const date = $(el).find('time').attr('datetime');
        if (post && text.length >= 30 && !seen.has(post)) {
          seen.add(post);
          items.push({ text, itemUrl: `https://t.me/${post}`, publishedAt: date ? new Date(date).toISOString() : undefined });
        }
      });

      if (!count || !Number.isFinite(minId)) break;
      before = String(minId);
      await this.sleep(400);
    }

    if (!items.length) {
      throw new Error('No messages found: the channel web preview is probably disabled (or posts are only images).');
    }
    return items;
  }

  private async collectHtml(src: SourceRow): Promise<Item[]> {
    const result = await this.scrapeWebsite(src.url, src.css_selector ?? undefined);
    if (!result.success) throw new Error(result.error ?? 'Scrape failed');
    return [{ text: result.content, itemUrl: src.url, title: result.title, pageHash: result.contentHash }];
  }

  /**
   * Index crawl: open a listing page (for example https://ics.gov.et/information/), then read every page it
   * links to under the same path. This is how a whole "information center" becomes many readable items.
   */
  private async collectHtmlIndex(src: SourceRow, limit?: number): Promise<Item[]> {
    const html = await this.fetchText(src.url);
    const $ = cheerio.load(html);
    const base = new URL(src.url);
    const scope = src.css_selector && $(src.css_selector).length ? $(src.css_selector) : $('body');

    const links = new Map<string, string>();
    scope.find('a[href]').each((_: number, a: any) => {
      try {
        const u = new URL($(a).attr('href') as string, base);
        u.hash = '';
        u.search = '';
        const same = u.hostname === base.hostname && u.pathname.startsWith(base.pathname) && u.pathname !== base.pathname;
        if (same && !/\.(pdf|jpe?g|png|gif|zip|docx?|xlsx?)$/i.test(u.pathname)) links.set(u.toString(), $(a).text().trim());
      } catch {
        /* ignore bad links */
      }
    });

    const max = limit ?? Math.max(1, Number(process.env.SCRAPER_INDEX_MAX ?? 40));
    const items: Item[] = [];
    let firstError = '';
    for (const [url, label] of [...links].slice(0, max)) {
      const page = await this.scrapeWebsite(url);
      if (page.success && page.content.length > 80) {
        items.push({ text: page.title ? `${page.title}\n${page.content}` : page.content, itemUrl: url, title: page.title || label });
      } else if (!firstError) {
        firstError = page.error ?? 'page had no readable text';
      }
      await this.sleep(500);
    }
    if (!links.size) throw new Error(`No links under ${base.pathname} were found on ${src.url}. The page may be built with JavaScript.`);
    if (!items.length) throw new Error(`Found ${links.size} linked pages but none could be read. First problem: ${firstError}`);
    return items;
  }

  private async collectItems(src: SourceRow, limit?: number): Promise<Item[]> {
    const method: FetchMethod = src.fetch_method ?? (src.source_type === 'telegram' ? 'telegram_preview' : 'html');
    if (method === 'html_index') return this.collectHtmlIndex(src, limit);
    if (method === 'wordpress_api') return this.collectWordPress(src);
    if (method === 'telegram_preview') return this.collectTelegram(src);
    return this.collectHtml(src);
  }

  /** Plain connectivity check used by the admin System Check page. */
  async probeUrl(url: string) {
    const started = Date.now();
    try {
      await this.refreshHosts(true);
      try {
        const u = new URL(url);
        if (['http:', 'https:'].includes(u.protocol) && !this.isPrivateHost(u.hostname.toLowerCase())) this.dbHosts.add(u.hostname.toLowerCase());
      } catch {
        return { ok: false, error: 'Invalid URL' };
      }
      const robotsOk = await this.robotsAllows(url);
      if (!robotsOk) return { ok: false, robots: false, error: 'robots.txt does not allow this bot (TebibBot) to read this URL', ms: Date.now() - started };
      const res = await axios.get(url, { timeout: 12000, responseType: 'text', validateStatus: () => true, maxContentLength: 3 * 1024 * 1024, headers: { 'User-Agent': UA, 'Accept-Language': 'am,en;q=0.8' } });
      const text = cheerio.load(String(res.data)).root().text().replace(/\s+/g, ' ').trim();
      return { ok: res.status === 200, robots: true, status: res.status, words: text.split(' ').filter(Boolean).length, ms: Date.now() - started, error: res.status === 200 ? undefined : `HTTP ${res.status}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error), ms: Date.now() - started };
    }
  }

  /** Dry run for the admin panel: fetch + extract text, no Gemini calls, nothing saved. */
  async testSource(input: { url: string; fetch_method?: FetchMethod | null; css_selector?: string | null; source_type?: SourceType }) {
    await this.refreshHosts(true);
    const src: SourceRow = {
      id: 'test',
      source_type: input.source_type ?? 'website',
      name: 'test',
      url: input.url,
      fetch_method: input.fetch_method ?? null,
      css_selector: input.css_selector ?? null,
      service_id: null,
      last_content_hash: null,
    };
    if (!this.isAllowedUrl(src.url)) {
      // Admin-initiated test of a not-yet-saved public URL: allow its host in memory only
      try {
        const u = new URL(src.url);
        if (['http:', 'https:'].includes(u.protocol) && !this.isPrivateHost(u.hostname.toLowerCase())) this.dbHosts.add(u.hostname.toLowerCase());
      } catch {
        /* handled below */
      }
    }
    if (!this.isAllowedUrl(src.url)) {
      return { ok: false, error: 'This URL is not allowed (invalid, or a private network address).' };
    }
    try {
      const items = await this.collectItems(src, 5);
      const rows = items.slice(0, 20).map((i) => ({
        title: i.title ?? '',
        url: i.itemUrl,
        chars: i.text.length,
        words: i.text.split(/\s+/).filter(Boolean).length,
        relevant: this.isRelevant(i.text),
        preview: i.text.slice(0, 300),
      }));
      const hints: string[] = [];
      if (!items.length) hints.push('No items were found. Check the URL, the fetch method and the CSS selector.');
      if (items.length && items.every((i) => i.text.split(/\s+/).length < 120)) {
        hints.push('Very little text was extracted. The page may be built with JavaScript (the scraper cannot run it) or the selector is too narrow.');
      }
      if (items.length && !rows.some((r) => r.relevant)) {
        hints.push('No item mentions fees, documents, licences or similar words. This source may only publish news, which rarely contains service facts.');
      }
      return { ok: true, itemCount: items.length, items: rows, sample: items[0]?.text.slice(0, 2500) ?? '', hints };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ---------------------------------------------------------------------------
  // Extraction + validation
  // ---------------------------------------------------------------------------

  private isRelevant(text: string): boolean {
    const en =
      /\b(passports?|e-?passport|fees?|costs?|price|kebele|fayda|id card|licen[sc]es?|birth|certificates?|requirements?|documents?|apply|application|visa|residence|renew\w*|urgent|trade|tin|tax|register\w*|registration|permit|online|portal|deadline|branch)\b/i;
    const am = [
      'ፓስፖርት', 'ኢ-ፓስፖርት', 'ቀበሌ', 'ክፍያ', 'መታወቂያ', 'ፋይዳ', 'ልደት', 'ፈቃድ', 'ቪዛ', 'እድሳት', 'አስቸኳይ',
      'ንግድ', 'ሰነድ', 'ማመልከቻ', 'ምዝገባ', 'አገልግሎት', 'ዋጋ', 'ታክስ', 'መመዝገብ', 'ቅርንጫፍ',
    ];
    return en.test(text) || am.some((k) => text.includes(k));
  }

  private numbersIn(text: string): string[] {
    return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '').replace(/\.0+$/, ''));
  }

  private sourceNumbers(source: string): Set<string> {
    const set = new Set(this.numbersIn(source));
    for (const m of source.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|sixty|ninety)\b/g) ?? []) {
      set.add(WORD_NUM[m]);
    }
    return set;
  }

  private numbersGrounded(fact: string, allowed: Set<string>): boolean {
    return this.numbersIn(fact).every((n) => allowed.has(n));
  }

  private sameNumbers(a: string, b: string): boolean {
    const x = [...new Set(this.numbersIn(a))].sort().join(',');
    const y = [...new Set(this.numbersIn(b))].sort().join(',');
    return x === y;
  }

  private matchServiceId(name: string | null | undefined, fallback: string | null): string | null {
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

  private chunkText(text: string, size = 4500, maxChunks = 8): string[] {
    if (text.length <= size) return [text];
    const chunks: string[] = [];
    let cur: string[] = [];
    let len = 0;
    for (const line of text.split('\n')) {
      if (len + line.length + 1 > size && cur.length) {
        chunks.push(cur.join('\n'));
        if (chunks.length >= maxChunks) return chunks;
        cur = cur.slice(-2); // small overlap so a fee row is not cut from its heading
        len = cur.reduce((a, l) => a + l.length + 1, 0);
      }
      cur.push(line);
      len += line.length + 1;
    }
    if (cur.length && chunks.length < maxChunks) chunks.push(cur.join('\n'));
    return chunks;
  }

  private buildPrompt(text: string, url: string, title?: string, serviceHint?: string | null): string {
    const names = this.services.map((s) => `"${s.name_en}"`).join(', ') || '"Passport Services", "Kebele ID & Vital Events", "Business License Registration", "Driving License", "Birth Certificate"';
    return `You extract facts for a public-service information app used by Ethiopian citizens.
Source: ${url}
Today's date: ${new Date().toISOString().slice(0, 10)}
${title ? `Title: ${title}\n` : ''}${serviceHint ? `This source is about the service: ${serviceHint}\n` : ''}
Return a JSON array. Each item has exactly these fields:
- "service": the best match from [${names}], or null if none fits
- "category": one of "fee", "requirement", "step", "contact", "office", "deadline", "update", "other"
- "fact_en": ONE self-contained sentence in English. Name the service or document in the sentence so it makes sense on its own (for example "A new passport costs 5,000 ETB.", not "It costs 5,000 ETB.")
- "fact_am": the same fact in Amharic
- "evidence": an exact quote copied from the text below (10 to 250 characters) that supports the fact
- "effective_date": the date from which the fact applies if the text states one, otherwise null

Rules:
1. Use ONLY information stated in the text. Never use outside knowledge. Never invent, round or convert numbers, fees, dates or names. Copy numbers exactly as written. Keep Ethiopian-calendar dates as written.
2. Keep only facts a citizen can act on: fees, required documents, application steps, where or how to apply, deadlines, processing times, contact numbers, and changes to a service (new online portal, new requirement, new fee).
3. One fact per item. Split lists and tables into separate items (one fee per item, one required document per item).
4. Ignore meetings, visits, appointments, workshops, ceremonies, statistics and opinions.
5. Ignore announcements about deadlines, extensions or periods that have already ended, and anything that applies only to a past period (for example a past fiscal year).
6. If the text contains no such facts, return [].

Text:
"""
${text.substring(0, 6500)}
"""`;
  }

  private async markSeen(sourceType: string, itemUrl: string, itemHash: string, found: number, saved: number) {
    const { error } = await supabase.from('scraped_items').insert([
      { source_type: sourceType, item_url: itemUrl, content_hash: itemHash, facts_found: found, facts_saved: saved },
    ]);
    if (error && error.code !== '23505') this.logger.warn(`Could not record scraped item: ${error.message}`);
  }

  /** Same topic already published? -> update (shown side by side in admin). Same facts? -> duplicate. */
  private async reconcile(factEn: string): Promise<{ kind: 'new' | 'duplicate' | 'update'; supersedesId?: string; score?: number }> {
    try {
      const similar = await this.knowledgeService.findSimilar(factEn, UPDATE_SCORE, 5);
      const dup = similar.find((s) => s.similarity >= DUP_SCORE && this.sameNumbers(s.chunk_text, factEn));
      if (dup) return { kind: 'duplicate', score: dup.similarity };
      const approved = similar.find((s) => s.status === 'approved');
      if (approved) return { kind: 'update', supersedesId: approved.id, score: approved.similarity };
    } catch (error) {
      this.logger.warn(`reconcile skipped: ${error instanceof Error ? error.message : error}`);
    }
    return { kind: 'new' };
  }

  private async processItem(src: SourceRow, stats: Stats, item: Item) {
    const { text, itemUrl, publishedAt, title } = item;
    stats.itemsChecked++;
    const itemHash = this.sha(text);
    const trace: ItemTrace = { url: itemUrl, title, outcome: 'no_facts', chars: text.length, found: 0, saved: 0 };
    if (stats.trace.length < 60) stats.trace.push(trace);

    // 0. Old news-style items are skipped: their deadlines and fees are usually out of date
    const maxAge = Number(process.env.SCRAPER_MAX_AGE_DAYS ?? 400);
    const srcMethod: FetchMethod = src.fetch_method ?? (src.source_type === 'telegram' ? 'telegram_preview' : 'html');
    if (maxAge > 0 && srcMethod !== 'html' && srcMethod !== 'html_index' && publishedAt && Date.now() - new Date(publishedAt).getTime() > maxAge * 86_400_000) {
      stats.itemsNotRelevant++;
      trace.outcome = 'too_old';
      return;
    }

    // 1. Same content already processed? Skip (no Gemini call)
    const { data: seen } = await supabase
      .from('scraped_items')
      .select('id')
      .eq('item_url', itemUrl)
      .eq('content_hash', itemHash)
      .maybeSingle();
    if (seen) {
      stats.itemsUnchanged++;
      trace.outcome = 'unchanged';
      return;
    }

    // 2. Keyword gate (only for broad sources such as news feeds and channels; targeted pages always go through)
    const method: FetchMethod = src.fetch_method ?? (src.source_type === 'telegram' ? 'telegram_preview' : 'html');
    if (!src.service_id && method !== 'html' && !this.isRelevant(text)) {
      stats.itemsNotRelevant++;
      trace.outcome = 'not_relevant';
      await this.markSeen(src.source_type, itemUrl, itemHash, 0, 0);
      return;
    }

    // 3. Gemini extraction over every chunk of the item
    const serviceName = this.services.find((s) => s.id === src.service_id)?.name_en ?? null;
    const facts: ExtractedFact[] = [];
    try {
      for (const chunk of this.chunkText(text)) {
        facts.push(...((await this.aiService.extractFacts(this.buildPrompt(chunk, itemUrl, title, serviceName))) as ExtractedFact[]));
        await this.sleep(400);
      }
    } catch (error) {
      stats.itemsFailed++;
      trace.outcome = 'failed';
      this.logger.error(`❌ Gemini extraction failed for ${itemUrl}: ${error instanceof Error ? error.message : error}`);
      return; // not marked as seen: retried next run
    }
    trace.found = facts.length;

    // 4. Validate every fact against the source, reconcile with what is already published, save as pending
    let saved = 0;
    let hadHardError = false;
    const looseSource = this.loose(text);
    const allowedNumbers = this.sourceNumbers(text);
    const batchHashes = new Set<string>();

    const reject = (reason: string, f: ExtractedFact) => {
      stats.factsRejected++;
      if (stats.rejectedSamples.length < 15) {
        stats.rejectedSamples.push({ reason, fact: (f.fact_en ?? '').slice(0, 140), evidence: (f.evidence ?? '').slice(0, 140), url: itemUrl });
      }
      this.logger.warn(`🚫 Rejected (${reason}): "${(f.fact_en ?? '').substring(0, 80)}"`);
    };

    for (const f of facts) {
      if (!f?.fact_en || !f?.evidence) {
        reject('missing fields', f ?? {});
        continue;
      }
      const evidence = f.evidence.trim();
      if (evidence.length < 10 || !looseSource.includes(this.loose(evidence))) {
        reject('evidence not found in source', f);
        continue;
      }
      // English fact must use only numbers present in the source; the Amharic fact only numbers of the English one
      const enNumbers = new Set([...allowedNumbers, ...this.numbersIn(f.fact_en)]);
      if (!this.numbersGrounded(f.fact_en, allowedNumbers) || !this.numbersGrounded(f.fact_am ?? '', enNumbers)) {
        reject('number not in source', f);
        continue;
      }

      const factHash = this.sha(this.norm(f.fact_en).toLowerCase());
      if (batchHashes.has(factHash)) continue;
      batchHashes.add(factHash);

      const rec = await this.reconcile(f.fact_en);
      if (rec.kind === 'duplicate') {
        stats.factsDuplicate++;
        continue;
      }

      const category: Category = (CATEGORIES as readonly string[]).includes(f.category ?? '') ? (f.category as Category) : 'other';
      try {
        await this.knowledgeService.addKnowledgeChunk(
          this.matchServiceId(f.service, src.service_id),
          f.fact_en,
          f.fact_am ?? '',
          src.source_type,
          src.name,
          {
            status: 'pending',
            sourceUrl: itemUrl.startsWith('http') ? itemUrl : undefined,
            sourcePublishedAt: publishedAt,
            contentHash: factHash,
            category,
            supersedesId: rec.supersedesId ?? null,
            trustLevel: src.trust_level ?? 'official',
            metadata: {
              scraped_at: new Date().toISOString(),
              service: f.service ?? null,
              evidence,
              effective_date: f.effective_date ?? null,
              kind: rec.kind,
              similar_score: rec.score ?? null,
              source_hash: itemHash,
            },
          },
        );
        saved++;
        stats.factsSaved++;
        if (rec.kind === 'update') stats.factsUpdates++;
      } catch (error: any) {
        if (error?.code === '23505') stats.factsDuplicate++;
        else {
          hadHardError = true;
          this.logger.error(`❌ Could not save fact: ${error?.message ?? error}`);
        }
      }
    }

    trace.saved = saved;
    trace.outcome = saved > 0 ? 'saved' : 'no_facts';
    if (!hadHardError) await this.markSeen(src.source_type, itemUrl, itemHash, facts.length, saved);
  }

  // ---------------------------------------------------------------------------
  // Pipeline + logging
  // ---------------------------------------------------------------------------

  private emptyStats(): Stats {
    return {
      itemsChecked: 0, itemsUnchanged: 0, itemsNotRelevant: 0, itemsFailed: 0,
      factsRejected: 0, factsDuplicate: 0, factsSaved: 0, factsUpdates: 0,
      trace: [], rejectedSamples: [],
    };
  }

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
        details: {
          unchanged: stats.itemsUnchanged,
          not_relevant: stats.itemsNotRelevant,
          rejected: stats.factsRejected,
          duplicates: stats.factsDuplicate,
          updates: stats.factsUpdates,
          rejected_samples: stats.rejectedSamples,
          trace: stats.trace,
        },
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
    this.progress.sourceName = src.name;
    this.progress.itemsDone = 0;
    this.progress.itemsTotal = 0;

    if (!this.isAllowedUrl(src.url)) {
      status = 'failed';
      errorMessage = 'URL host is not allowed (invalid or private address)';
    } else {
      try {
        const items = await this.collectItems(src);
        this.progress.itemsTotal = items.length;
        if (!items.length) {
          status = 'empty';
          errorMessage = 'The source returned no items. Test it in Admin → Sources.';
        }
        for (const item of items) {
          await this.processItem(src, stats, item);
          this.progress.itemsDone++;
        }

        const pageHash = items[0]?.pageHash;
        if (pageHash) {
          const changed = pageHash !== src.last_content_hash;
          await supabase
            .from('scrape_sources')
            .update({ last_content_hash: pageHash, ...(changed ? { last_changed_at: new Date().toISOString() } : {}) })
            .eq('id', src.id);
        }
      } catch (error) {
        status = 'failed';
        errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ ${src.name}: ${errorMessage}`);
      }
    }

    if (status === 'success' && stats.itemsFailed > 0) status = 'partial';

    await supabase
      .from('scrape_sources')
      .update({ last_checked_at: new Date().toISOString(), last_error: status === 'failed' || status === 'empty' ? errorMessage : null })
      .eq('id', src.id);
    await this.logRun(src, stats, status, errorMessage, startedAt);
    this.progress.sourcesDone++;
    this.progress.savedTotal += stats.factsSaved;

    const { trace, rejectedSamples, ...counts } = stats;
    return { source: src.name, status, error: errorMessage, ...counts, rejectedSamples: rejectedSamples.slice(0, 5) };
  }

  private async loadServices() {
    const { data } = await supabase.from('services').select('id, name_en');
    this.services = data ?? [];
  }

  /**
   * Turn text an admin pasted (from an official page, a PDF, an office notice, a Telegram post) into
   * pending facts. Same extraction and validation as the scraper, but it needs no source setup and
   * no website access, so it works for sources the scraper cannot reach.
   */
  async importText(input: { text: string; url?: string | null; serviceId?: string | null; trust?: string | null; title?: string | null }) {
    await this.loadServices();
    const text = input.text.replace(/\r/g, '').trim();
    let host = 'Pasted text';
    if (input.url) {
      try {
        host = new URL(input.url).hostname;
      } catch {
        /* keep default */
      }
    }
    const src: SourceRow = {
      id: 'import',
      source_type: 'website',
      name: `Admin import (${host})`,
      url: input.url || 'https://admin.import',
      fetch_method: 'html',
      css_selector: null,
      service_id: input.serviceId ?? null,
      last_content_hash: null,
      trust_level: input.trust === 'secondary' ? 'secondary' : 'official',
    };
    const stats = this.emptyStats();
    const itemUrl = input.url?.startsWith('http') ? input.url : `admin-import:${this.sha(text).slice(0, 12)}`;
    await this.processItem(src, stats, { text, itemUrl, title: input.title ?? undefined });
    const outcome = stats.trace[0]?.outcome ?? 'no_facts';
    return {
      outcome,
      found: stats.trace[0]?.found ?? 0,
      saved: stats.factsSaved,
      updates: stats.factsUpdates,
      duplicates: stats.factsDuplicate,
      rejected: stats.factsRejected,
      rejectedSamples: stats.rejectedSamples.slice(0, 5),
      failed: stats.itemsFailed > 0,
    };
  }

  /** Run every active source (optionally only some types, or exactly one source by id) */
  async runPipeline(types?: SourceType[], sourceId?: string) {
    if (this.isRunning) {
      this.logger.warn('⏭️ Pipeline already running, skipping this trigger.');
      return { skipped: 'already running' };
    }

    this.isRunning = true;
    this.progress = { ...this.progress, running: true, startedAt: Date.now(), sourceName: '', sourcesDone: 0, sourcesTotal: 0, itemsDone: 0, itemsTotal: 0, savedTotal: 0 };
    this.logger.log('🚀 Starting scraping pipeline...');

    try {
      await this.refreshHosts(true);
      const { data: services } = await supabase.from('services').select('id, name_en');
      this.services = services ?? [];

      let query = supabase.from('scrape_sources').select('*');
      if (sourceId) query = query.eq('id', sourceId);
      else {
        query = query.eq('is_active', true);
        if (types?.length) query = query.in('source_type', types);
      }
      const { data: sources, error } = await query;
      if (error) throw error;
      this.progress.sourcesTotal = sources?.length ?? 0;

      if (!sources?.length) {
        this.logger.warn('No matching sources in scrape_sources.');
        return { results: [], note: 'No matching sources' };
      }

      const results: any[] = [];
      for (const src of sources as SourceRow[]) results.push(await this.runSource(src));

      this.logger.log(`✅ Pipeline complete: ${JSON.stringify(results.map((r) => ({ source: r.source, status: r.status, saved: r.factsSaved })))}`);
      return { results };
    } finally {
      this.isRunning = false;
      this.progress.running = false;
      this.progress.lastFinished = { at: new Date().toISOString(), saved: this.progress.savedTotal, sources: this.progress.sourcesDone, seconds: Math.round((Date.now() - this.progress.startedAt) / 1000) };
    }
  }
}
