import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    this.logger.debug('⏰ Cron Job Running: Hello from the scraper service!');
  }

 
}