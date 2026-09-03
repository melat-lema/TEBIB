// backend/src/modules/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly aiService: AiService,
  ) {}

  async processMessage(userMessage: string, language: 'en' | 'am' = 'en') {
    try {
      // 1. Search the knowledge base
      const searchResults = await this.knowledgeService.searchKnowledgeBase(userMessage, 3);

      // 2. Filter out low-similarity results (Crucial for mock embeddings)
      // If similarity is below 0.6, it's basically random noise, so we ignore it.
      const relevantResults = searchResults.filter((r: any) => r.similarity > 0.6);

      let context = '';
      if (relevantResults.length > 0) {
        context = relevantResults.map((result: any, index: number) => {
          const text = language === 'am' && result.chunk_text_am ? result.chunk_text_am : result.chunk_text;
          return `Fact ${index + 1}: ${text}`;
        }).join('\n\n');
      } else {
        // If no relevant facts are found, tell the AI to just be friendly
        context = "NO_RELEVANT_INFO_FOUND";
      }

      // 3. Send to Gemini
      const aiResponse = await this.aiService.generateText(userMessage, context, language);

      return {
        success: true,
        query: userMessage,
        sourcesFound: relevantResults.length,
        response: aiResponse,
        sources: relevantResults.map((r: any) => ({
          text: language === 'am' && r.chunk_text_am ? r.chunk_text_am : r.chunk_text,
          source: r.service_id ? 'Tebib Database' : 'Unknown'
        }))
      };

    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        success: false,
        response: "I'm sorry, I encountered an error while processing your request. Please try again."
      };
    }
  }
}