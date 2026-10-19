import { forwardRef, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { RouterAgent } from './router.agent';
import { RagAgent } from './rag.agent';
import { ActionAgent } from './action.agent';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ChatGraph } from './chat.graph';

@Module({
  imports: [forwardRef(() => KnowledgeModule)],
  providers: [AiService, RouterAgent, ActionAgent, RagAgent, ChatGraph],
  exports: [AiService, RouterAgent, ActionAgent, RagAgent, ChatGraph],
})
export class AiModule {}
