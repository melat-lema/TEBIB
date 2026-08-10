import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { AiModule } from '../ai/ai.module'; // Add this

@Module({
  imports: [AiModule], // Add this
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}