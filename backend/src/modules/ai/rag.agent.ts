// backend/src/modules/ai/rag.agent.ts
import { Injectable } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AiService } from './ai.service';
import { Annotation } from '@langchain/langgraph';

export const RagState = Annotation.Root({
  userInput: Annotation<string>({ reducer: (x: string, y: string) => y ?? x }),
  language: Annotation<'en' | 'am'>({ reducer: (x: 'en' | 'am', y: 'en' | 'am') => y ?? x }),
  response: Annotation<string>({ reducer: (x: string, y: string) => y ?? x, default: () => '' }),
  sources: Annotation<any[]>({ reducer: (x: any[], y: any[]) => y ?? x, default: () => [] }),
});

@Injectable()
export class RagAgent {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly aiService: AiService,
  ) {}

  async ragNode(state: typeof RagState.State): Promise<Partial<typeof RagState.State>> {
    console.log(`\n📚 RAG Agent is processing: "${state.userInput}"`);

    try {
      // 1. Search the database (will use keyword fallback if vector fails)
      const searchResults = await this.knowledgeService.searchKnowledgeBase(state.userInput, 3);
      
      if (searchResults.length > 0) {
        const context = searchResults.map((result: any, index: number) => {
          const text = state.language === 'am' && result.chunk_text_am ? result.chunk_text_am : result.chunk_text;
          return `Fact ${index + 1}: ${text}`;
        }).join('\n\n');

        // 2. Ask AI to format the answer based STRICTLY on the retrieved context
        const aiResponse = await this.aiService.generateText(state.userInput, context, state.language);

        console.log(`✅ RAG Agent found ${searchResults.length} relevant sources.`);

        return {
          response: aiResponse,
          sources: searchResults.map((r: any) => ({
            text: state.language === 'am' && r.chunk_text_am ? r.chunk_text_am : r.chunk_text,
            source: 'Tebib Database'
          }))
        };
      } else {
        return {
          response: state.language === 'am'
            ? 'ይቅርታ፣ ስለዚህ ጉዳይ በውሂብ ጎታዬ ውስጥ የተወሰነ መረጃ የለኝም።'
            : "I'm sorry, I don't have specific information about that in my database.",
          sources: []
        };
      }

    } catch (error) {
      console.error('❌ RAG Agent error:', error);
      return { 
        response: state.language === 'am' ? 'ይቅርታ፣ ስህተት ተፈጥሯል።' : "I'm sorry, an error occurred.",
        sources: [] 
      };
    }
  }
}