
import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { Annotation } from '@langchain/langgraph';

export const ActionState = Annotation.Root({
  userInput: Annotation<string>({ reducer: (x: string, y: string) => y ?? x }),
  language: Annotation<'en' | 'am'>({ reducer: (x: 'en' | 'am', y: 'en' | 'am') => y ?? x }),
  response: Annotation<string>({ reducer: (x: string, y: string) => y ?? x, default: () => '' }),
});

@Injectable()
export class ActionAgent {
  constructor(private readonly aiService: AiService) {}

  async actionNode(state: typeof ActionState.State): Promise<Partial<typeof ActionState.State>> {
    console.log(`\n Action Agent is drafting a document for: "${state.userInput}"`);

    try {
      const prompt = state.language === 'am' 
        ? `አንተ የኢትዮጵያ መንግስት አገልግሎት ረዳት ነህ። ተጠቃሚው የሚከተለውን ሰነድ እንድትጽፍለት ጠይቋል። እባክህ በጣም ፎርማል፣ ሙያዊ እና ግልጽ በሆነ አማርኛ ሰነዱን አዘጋጅ። በሰነዱ ውስጥ ባዶ ቦታዎችን በ [ ] አመልክት።\n\nጥያቄ: ${state.userInput}`
        : `You are a professional Ethiopian Government Services assistant. The user has requested that you draft a formal document or letter. Please write a highly professional, clear, and formal template in English. Use placeholders like [Your Name], [Date], etc., where the user needs to fill in their specific details.\n\nRequest: ${state.userInput}`;

      // We pass NO context, so the AI relies purely on its general knowledge to draft the letter
      const aiResponse = await this.aiService.generateText(prompt, undefined, state.language);

      console.log(` Action Agent successfully drafted the document.`);

      return { response: aiResponse };

    } catch (error) {
      console.error(' Action Agent error:', error);
      return { 
        response: state.language === 'am' ? 'ይቅርታ፣ ሰነዱን ማዘጋጀት አልተቻለም።' : "I'm sorry, I encountered an error while drafting the document." 
      };
    }
  }
}