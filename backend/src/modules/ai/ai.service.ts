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

        const retries = 3;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.chatModel.generateContent({
          model: attempt < retries ? 'gemini-3.5-flash' : 'gemini-3.5-flash-lite',
          contents: prompt,
          config: { temperature: 0.3 },
        });
        return result.text ?? '';
      } catch (error: any) {
        const status = error?.status ?? error?.code;
        const retryable = status === 503 || status === 429;
        console.error(`❌ generateText attempt ${attempt} failed (${status ?? 'unknown'})`);
        if (!retryable || attempt === retries) break;
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    }

    return language === 'am'
      ? 'ይቅርታ፣ አገልግሎቱ አሁን በጣም ተጠምዷል። እባክዎ ከትንሽ ጊዜ በኋላ እንደገና ይሞክሩ።'
      : 'Sorry, the assistant is very busy right now. Please try again in a minute.';
  }
  catch (error) {
    console.error('❌ Fatal error in generateText:', error);
    return language === 'am'
      ? 'ይቅርታ፣ ስህተት ተፈጥሯል።'
      : 'Sorry, an error occurred.';
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

    async extractFacts(prompt: string, retries = 3): Promise<any[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.chatModel.generateContent({
          model: attempt < retries ? 'gemini-3.5-flash' : 'gemini-3.5-flash-lite',
          contents: prompt,
          config: { temperature: 0, responseMimeType: 'application/json' },
        });
        const parsed = JSON.parse((result.text ?? '').trim());
        return Array.isArray(parsed) ? parsed : [];
      } catch (error: any) {
        const status = error?.status ?? error?.code;
        const retryable = status === 503 || status === 429;
        if (!retryable || attempt === retries) throw error;
        const wait = attempt * 4000;
        console.warn(`⚠️ Gemini busy (${status}), retry ${attempt}/${retries - 1} in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    return [];
  }
}

