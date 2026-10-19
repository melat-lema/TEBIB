import { Injectable } from '@nestjs/common';
import { ChatGraph } from '../ai/chat.graph';
import { ChatHistoryService } from '../chat-history/chat-history.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatGraph: ChatGraph,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  async processMessage(
    userMessage: string,
    language: 'en' | 'am',
    sessionId: string,
    userId: string | null,
  ) {
    try {
      console.log(`\n💬 New Chat Message: "${userMessage}" (Lang: ${language})`);

      // load earlier turns from the database so resumed chats keep their context
      const history = userId
        ? await this.chatHistoryService.getRecentTurns(userId, sessionId)
        : [];

      const result = await this.chatGraph.run(userMessage, language, history);

      if (!userId) {
        console.warn('⚠️ Not saving: no logged-in user for this request.');
      } else if (!result.success) {
        console.warn('⚠️ Not saving: chat result was not successful.');
      } else {
        const saved = await this.chatHistoryService.saveMessage(
          userId, sessionId, userMessage, result.response, language, result.sources,
        );
        console.log(saved ? '💾 Chat saved.' : '❌ Chat save FAILED (see error above).');
      }

      return result;
    } catch (error) {
      console.error('❌ Chat processing error:', error);
      return {
        success: false,
        response:
          language === 'am'
            ? 'ይቅርታ፣ ጥያቄዎን በማስተናገድ ላይ ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።'
            : "I'm sorry, I encountered an error while processing your request. Please try again.",
      };
    }
  }
}