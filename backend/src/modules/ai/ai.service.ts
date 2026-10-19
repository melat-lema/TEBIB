import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private genAI: GoogleGenAI;
  private chatModel: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error(' CRITICAL: GEMINI_API_KEY is missing from .env file!');
    }

    console.log(` Gemini API Key loaded (starts with: ${apiKey.substring(0, 6)}...)`);

    this.genAI = new GoogleGenAI({apiKey});
    this.chatModel = this.genAI.models;
  }
async generateText(userMessage: string, context?: string, language: 'en' | 'am' = 'en'): Promise<string> {
  try {
    let prompt = userMessage;
    if (context && context !== "NO_RELEVANT_INFO_FOUND") {
      prompt = `You are a helpful, concise assistant for Ethiopian government services. 
        Use ONLY the following context to answer the user's question. 
        CRITICAL: Answer ONLY what the user specifically asked. If they ask for a fee, state ONLY the fee. Do not list unrelated requirements unless explicitly asked.
        
        
      Context:
      ${context}
      
      User Question: ${userMessage}
      
      Answer in ${language === 'am' ? 'Amharic' : 'English'}:`;
    }

      const result = await this.chatModel.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.3 },
    });
    return result.text ?? '';
    
  } catch (error) {
    console.error('❌ generateText failed:', error);
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
async generateEmbedding(text: string, type: 'doc' | 'query' = 'doc'): Promise<number[]> {
  const res = await this.genAI.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
    config: {
      taskType: type === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768,
    },
  });
  return res.embeddings![0].values!;
}

  async rewriteQuery(question: string, history: string[] = [], retry = false): Promise<string> {
    try {
      const prompt = retry
        ? `Rewrite this question as a short search query for a database of Ethiopian government service information (fees, requirements, documents, offices). Use the main service name and the topic. Output only the query.\n\nQuestion: ${question}`
        : `Given the conversation so far and the user's latest message, rewrite the latest message as a complete standalone question. Keep the same language. If it is already standalone, return it unchanged. Output only the question.\n\nConversation:\n${history.join('\n')}\n\nLatest message: ${question}`;

      const result = await this.chatModel.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: { temperature: 0 },
      });
      return (result.text ?? '').trim() || question;
    } catch (error) {
      console.error('❌ rewriteQuery failed:', error);
      return question; // safe fallback: use the original question
    }
  }
}