import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController, AdminAuthController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { ScraperModule } from '../scraper/scraper.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ScraperModule, KnowledgeModule, AiModule],
  providers: [AdminService, AdminGuard],
  controllers: [AdminAuthController, AdminController],
  exports: [AdminService],
})
export class AdminModule {}
