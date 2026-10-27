import {
  Controller, Get, Post, Query, Headers, Logger,
  UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(private readonly scraperService: ScraperService) {}

  private assertAdmin(key?: string) {
    const expected = process.env.SCRAPER_ADMIN_KEY;
    if (!expected || key !== expected) throw new UnauthorizedException();
  }

  @Get('test')
  async testScrape(@Query('url') url: string, @Query('selector') selector?: string) {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();

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

   @Post('run-pipeline')
  async runPipeline(@Headers('x-admin-key') key?: string, @Query('types') types?: string) {
    this.assertAdmin(key);

    const list = types
      ? (types.split(',').map((t) => t.trim()).filter((t) => t === 'website' || t === 'telegram') as Array<'website' | 'telegram'>)
      : undefined;

    this.logger.log(`🧪 Manual pipeline trigger${list ? ` (${list.join(', ')})` : ''}`);
    const outcome = await this.scraperService.runPipeline(list);

    return {
      success: true,
      ...outcome,
      instruction: "Review rows with status = 'pending' in knowledge_base",
    };
  }
}