import { forwardRef, Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { AiModule } from '../ai/ai.module'; // Add this

@Module({
  imports: [forwardRef(() => AiModule)],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}