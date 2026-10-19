// backend/src/modules/chat-history/chat-history.module.ts
import { Module } from '@nestjs/common';
import { ChatHistoryService } from './chat-history.service';
import { ChatHistoryController } from './chat-history.controller';

@Module({
  providers: [ChatHistoryService],
  controllers: [ChatHistoryController],
  exports: [ChatHistoryService],
})
export class ChatHistoryModule {}