// backend/src/modules/scraper/scraper.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';

export interface ScrapeResult {
  success: boolean;
  url: string;
  title: string;
  content: string;
  contentHash: string;
  wordCount: number;
  error?: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  // Only these official hosts may be fetched
  private readonly ALLOWED_HOSTS = [
    'ics.gov.et', 'www.ics.gov.et',
    'immigration.gov.et', 'www.immigration.gov.et',
    'passport.ics.gov.et',
    'id.gov.et', 'www.id.gov.et',
    't.me',
  ];

  // 🧪 TEST CRON: replaced by the real schedules on Day 34
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    this.logger.debug('⏰ Cron Job Running: Scraper service is alive!');
  }

  isAllowedUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return ['http:', 'https:'].includes(u.protocol) && this.ALLOWED_HOSTS.includes(u.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Fetches a page and extracts clean text.
   * @param url      page to fetch (must be on the allowed list)
   * @param selector optional CSS selector of the element that holds the real content
   */
  async scrapeWebsite(url: string, selector?: string): Promise<ScrapeResult> {
    if (!this.isAllowedUrl(url)) {
      return {
        success: false, url, title: '', content: '', contentHash: '', wordCount: 0,
        error: 'URL host is not allowed',
      };
    }

    try {
      this.logger.log(`🌐 Fetching: ${url}`);

      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 3,
        maxContentLength: 5 * 1024 * 1024,
        responseType: 'text',
        headers: {
          'User-Agent': 'TebibBot/1.0 (Ethiopian Government Services Assistant; educational project)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'am,en-US;q=0.9,en;q=0.8',
        },
      });

      // a whitelisted site must not redirect us to another host
      const finalUrl: string = response.request?.res?.responseUrl ?? url;
      if (!this.isAllowedUrl(finalUrl)) {
        throw new Error(`Redirected to a disallowed host: ${finalUrl}`);
      }

      const html = String(response.data);
      this.logger.log(`✅ Fetched ${html.length} bytes of HTML`);

      const $ = cheerio.load(html);

      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // remove things that are never real content
      $(
        'script, style, noscript, iframe, form, nav, footer, ' +
        '.skip-link, .screen-reader-text, .breadcrumb, .breadcrumbs, ' +
        '.main-navigation, .menu-toggle, ul.menu',
      ).remove();

      // pick the content container
      let rawText = '';
      if (selector && $(selector).length > 0) {
        rawText = $(selector).text(); // exact container you chose
      } else {
        const mainText = $('main, article, #content, .entry-content')
          .first().text().replace(/\s+/g, ' ').trim();
        rawText = mainText.length >= 500 ? mainText : $('body').text();
      }

      const cleanContent = rawText.replace(/\s+/g, ' ').trim();

      const contentHash = crypto.createHash('sha256').update(cleanContent).digest('hex');
      const wordCount = cleanContent.split(/\s+/).filter((w) => w.length > 0).length;

      this.logger.log(`✅ Extracted: "${title}" (${wordCount} words)`);

      return { success: true, url, title, content: cleanContent, contentHash, wordCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to scrape ${url}: ${errorMessage}`);

      return {
        success: false, url, title: '', content: '', contentHash: '', wordCount: 0,
        error: errorMessage,
      };
    }
  }

  /** true if the content differs from the last stored hash */
  hasContentChanged(newHash: string, oldHash: string | null): boolean {
    if (!oldHash) return true;
    return newHash !== oldHash;
  }
}