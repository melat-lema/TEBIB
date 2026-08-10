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
      // 1. Search the knowledge base for relevant context
      const searchResults = await this.knowledgeService.searchKnowledgeBase(userMessage, 3);

      // 2. Format the context into a single readable string for the AI
      let context = '';
      if (searchResults.length > 0) {
        context = searchResults.map((result, index) => {
          // Return Amharic text if user is chatting in Amharic, else English
          const text = language === 'am' && result.chunk_text_am ? result.chunk_text_am : result.chunk_text;
          return `Fact ${index + 1}: ${text}`;
        }).join('\n\n');
      } else {
        context = "No specific information found in the database.";
      }

      // 3. Send the user's message + the retrieved context to Gemini
      const aiResponse = await this.aiService.generateText(userMessage, context);

      return {
        success: true,
        query: userMessage,
        sourcesFound: searchResults.length,
        response: aiResponse,
        // Optional: return sources for UI transparency (e.g., "Source: Manual")
        sources: searchResults.map(r => ({
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