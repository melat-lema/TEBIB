import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { RouterAgent } from './router.agent';

@Module({
  providers: [AiService, RouterAgent],
  exports: [AiService, RouterAgent],
})
export class AiModule {}
