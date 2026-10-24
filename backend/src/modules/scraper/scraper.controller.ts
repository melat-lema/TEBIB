// backend/src/modules/scraper/scraper.controller.ts
import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(private readonly scraperService: ScraperService) {}

  /**
   * 🧪 TEST ENDPOINT (development only)
   * Usage: GET /scraper/test?url=https://ics.gov.et/&selector=.entry-content
   */
  @Get('test')
  async testScrape(@Query('url') url: string, @Query('selector') selector?: string) {
    if (!url) {
      return { success: false, message: 'Please provide a URL. Example: /scraper/test?url=https://ics.gov.et/' };
    }

    if (!this.scraperService.isAllowedUrl(url)) {
      return { success: false, message: 'This host is not on the allowed list.' };
    }

    this.logger.log(`🧪 Manual scrape triggered for: ${url}${selector ? ` (selector: ${selector})` : ''}`);
    const result = await this.scraperService.scrapeWebsite(url, selector);

    return {
      success: result.success,
      url: result.url,
      title: result.title,
      wordCount: result.wordCount,
      contentHash: result.contentHash,
      contentPreview: result.content.substring(0, 500) + '...',
      fullContentLength: result.content.length,
      error: result.error,
    };
  }
}