// backend/src/modules/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private chatModel: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('❌ CRITICAL: GEMINI_API_KEY is missing from .env file!');
    }

    console.log(`✅ Gemini API Key loaded (starts with: ${apiKey.substring(0, 6)}...)`);

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateText(userMessage: string, context?: string, language: 'en' | 'am' = 'en'): Promise<string> {
    try {
      const result = await this.chatModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3 },
      });
      return result.response.text();
      
    } catch (error) {
      console.warn('⚠️ Google API failed. Using MOCK AI response to keep development unblocked.');

      
      const lowerMsg = userMessage.toLowerCase();

      // 1. Handle Greetings
      if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('ሰላም') || lowerMsg.includes('አሰላም አለኩም')) {
        return language === 'am' 
          ? 'ሰላም! እንኳን ደህና መጡ። ስለ ኢትዮጵያ መንግስት አገልግሎቶች፣ ክፍያዎች ወይም መስፈርቶች ምን ልርዳዎ?' 
          : 'Hello! Welcome to Tebib. How can I help you with Ethiopian government services, fees, or requirements today?';
      }

      // 2. Handle Thanks
      if (lowerMsg.includes('thank') || lowerMsg.includes('አመሰግናለሁ')) {
        return language === 'am' ? 'እንኳን ደስ አለዎት! ሌላ ጥያቄ ካለዎት ይጠይቁኝ።' : "You're very welcome! Let me know if you have any other questions.";
      }

      // 3. Handle No Relevant Info Found (from chat.service.ts)
      if (context === "NO_RELEVANT_INFO_FOUND") {
        return language === 'am'
          ? 'ይቅርታ፣ ስለዚህ ጉዳይ በውሂብ ጎታዬ ውስጥ የተወሰነ መረጃ የለኝም። እባክዎ ጥያቄዎን ይለውጡ ወይም በቀጥታ ከተመለከተው መስሪያ ቤት ያረጋግጡ።'
          : "I'm sorry, I don't have specific information about that in my database. Could you try rephrasing your question, or verify directly with the relevant government office?";
      }

      // 4. Fallback for when we DO have context
      if (context && context.includes('Fact')) {
        const facts = context.split('Fact').filter((f: string) => f.trim().length > 0);
        return `Based on the official guidelines: ${facts[0].trim()} \n\nPlease note that requirements and fees are subject to change.`;
      }

      return "I am here to help with Ethiopian government services. Could you please provide more details?";
    }
  }
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.warn("⚠️ Gemini Embedding API failed. Using mock embedding to keep development moving.");
      
      // DEVELOPMENT FALLBACK: Generate a valid 768-dimensional vector of random numbers
      const mockEmbedding = Array(768).fill(0).map(() => Math.random() * 2 - 1);
      return mockEmbedding;
    }
  }
}