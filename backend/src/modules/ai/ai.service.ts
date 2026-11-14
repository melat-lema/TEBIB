import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

type Lang = 'en' | 'am';

/**
 * Optional .env settings (all have safe defaults):
 *   GEMINI_CHAT_MODEL       default: gemini-3.5-flash
 *   GEMINI_FALLBACK_MODEL   default: gemini-3.5-flash-lite   (used on the last retry)
 *   GEMINI_THINKING_LEVEL   default: unset. If your model supports a thinking level, setting it
 *                           to the lowest value is the single biggest latency win for chat.
 *                           Check the current Gemini docs for the exact value your model accepts;
 *                           an unsupported value makes the API return 400.
 */
@Injectable()
export class AiService {
  private genAI: GoogleGenAI;
  private chatModel: any;

  // Tiny LRU for query embeddings: repeated questions skip one network round-trip
  private embeddingCache = new Map<string, number[]>();
  private readonly EMBEDDING_CACHE_MAX = 300;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('CRITICAL: GEMINI_API_KEY is missing from .env file!');
    this.genAI = new GoogleGenAI({ apiKey });
    this.chatModel = this.genAI.models;
  }

  // ---------------------------------------------------------------- helpers

  private primaryModel() {
    return process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash';
  }
  private fallbackModel() {
    return process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
  }
  private modelFor(attempt: number, retries: number) {
    return attempt < retries ? this.primaryModel() : this.fallbackModel();
  }

  /** Chat/rewrite config. Extraction keeps its own config (it benefits from thinking). */
  private chatConfig(extra: Record<string, any> = {}) {
    const cfg: Record<string, any> = { temperature: 0.3, ...extra };
    const level = process.env.GEMINI_THINKING_LEVEL;
    if (level) cfg.thinkingConfig = { thinkingLevel: level };
    return cfg;
  }

  private isRetryable(error: any) {
    const status = error?.status ?? error?.code;
    return status === 503 || status === 429;
  }

  private buildAnswerPrompt(userMessage: string, context: string | undefined, language: Lang) {
    if (!context || context === 'NO_RELEVANT_INFO_FOUND') return userMessage;
    return `You are a helpful, concise assistant for Ethiopian government services.
Use ONLY the following context to answer the user's question.
CRITICAL: Answer ONLY what the user specifically asked. If they ask for a fee, state ONLY the fee. Do not list unrelated requirements unless explicitly asked.
If the context does not contain the answer, say you do not have verified information and suggest checking with the relevant office.
Keep the answer short. Use a short list only when the answer has several separate items.

Context:
${context}

User Question: ${userMessage}

Answer in ${language === 'am' ? 'Amharic' : 'English'}:`;
  }

  private busyMessage(language: Lang) {
    return language === 'am'
      ? 'ይቅርታ፣ አገልግሎቱ አሁን በጣም ተጠምዷል። እባክዎ ከትንሽ ጊዜ በኋላ እንደገና ይሞክሩ።'
      : 'Sorry, the assistant is very busy right now. Please try again in a minute.';
  }

  // ---------------------------------------------------------------- chat

  async generateText(userMessage: string, context?: string, language: Lang = 'en'): Promise<string> {
    const prompt = this.buildAnswerPrompt(userMessage, context, language);
    const retries = 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.chatModel.generateContent({
          model: this.modelFor(attempt, retries),
          contents: prompt,
          config: this.chatConfig(),
        });
        return result.text ?? '';
      } catch (error: any) {
        console.error(`❌ generateText attempt ${attempt} failed (${error?.status ?? error?.code ?? 'unknown'})`);
        if (!this.isRetryable(error) || attempt === retries) break;
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
    return this.busyMessage(language);
  }

  /**
   * Streams the answer token-by-token. The first words reach the user in
   * roughly the time of one model "time to first token" instead of waiting
   * for the whole answer.
   */
  async *generateTextStream(userMessage: string, context: string | undefined, language: Lang = 'en'): AsyncGenerator<string> {
    const prompt = this.buildAnswerPrompt(userMessage, context, language);
    // 1) main model, 2) the lighter model right away (it is often less loaded), 3) main model once more
    const plan = [this.primaryModel(), this.fallbackModel(), this.primaryModel()];

    for (let attempt = 0; attempt < plan.length; attempt++) {
      let started = false;
      try {
        const stream = await this.chatModel.generateContentStream({
          model: plan[attempt],
          contents: prompt,
          config: this.chatConfig(),
        });
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            started = true;
            yield text;
          }
        }
        return;
      } catch (error: any) {
        console.error(`❌ generateTextStream attempt ${attempt + 1} (${plan[attempt]}) failed (${error?.status ?? error?.code ?? 'unknown'})`);
        // Never retry after the user already saw part of an answer
        if (started || !this.isRetryable(error) || attempt === plan.length - 1) break;
        await new Promise((r) => setTimeout(r, attempt === 0 ? 300 : 1500));
      }
    }
    yield this.busyMessage(language);
  }

  // ---------------------------------------------------------------- embeddings

  async generateEmbedding(text: string, type: 'doc' | 'query' = 'doc'): Promise<number[]> {
    const key = type === 'query' ? text.trim().toLowerCase() : '';
    if (key && this.embeddingCache.has(key)) {
      const hit = this.embeddingCache.get(key)!;
      this.embeddingCache.delete(key); // refresh LRU position
      this.embeddingCache.set(key, hit);
      return hit;
    }

    const res = await this.genAI.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: {
        taskType: type === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      },
    });
    const values = res.embeddings![0].values!;

    if (key) {
      this.embeddingCache.set(key, values);
      if (this.embeddingCache.size > this.EMBEDDING_CACHE_MAX) {
        this.embeddingCache.delete(this.embeddingCache.keys().next().value as string);
      }
    }
    return values;
  }

  // ---------------------------------------------------------------- query rewriting

  async rewriteQuery(question: string, history: string[] = [], retry = false): Promise<string> {
    try {
      const prompt = retry
        ? `Rewrite this question as a short search query for a database of Ethiopian government service information (fees, requirements, documents, offices). Use the main service name and the topic. Output only the query.\n\nQuestion: ${question}`
        : `Given the conversation so far and the user's latest message, rewrite the latest message as a complete standalone question. Keep the same language. If it is already standalone, return it unchanged. Output only the question.\n\nConversation:\n${history.join('\n')}\n\nLatest message: ${question}`;

      const result = await this.chatModel.generateContent({
        model: this.primaryModel(),
        contents: prompt,
        config: this.chatConfig({ temperature: 0 }),
      });
      return (result.text ?? '').trim() || question;
    } catch (error) {
      console.error('❌ rewriteQuery failed:', error);
      return question;
    }
  }

  // ---------------------------------------------------------------- structured JSON (premium packs)

  async generateJson(prompt: string, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.chatModel.generateContent({
          model: this.modelFor(attempt, retries),
          contents: prompt,
          config: { temperature: 0.2, responseMimeType: 'application/json' },
        });
        const parsed = JSON.parse((result.text ?? '').trim());
        if (parsed && typeof parsed === 'object') return parsed;
        throw new SyntaxError('Model did not return a JSON object');
      } catch (error: any) {
        const retryable = this.isRetryable(error) || error instanceof SyntaxError;
        if (!retryable || attempt === retries) throw error;
        await new Promise((r) => setTimeout(r, attempt * 2500));
      }
    }
    throw new Error('generateJson failed');
  }

  // ---------------------------------------------------------------- scraper extraction

  async extractFacts(prompt: string, retries = 3): Promise<any[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.chatModel.generateContent({
          model: this.modelFor(attempt, retries),
          contents: prompt,
          config: { temperature: 0, responseMimeType: 'application/json' },
        });
        const parsed = JSON.parse((result.text ?? '').trim());
        return Array.isArray(parsed) ? parsed : [];
      } catch (error: any) {
        if (!this.isRetryable(error) || attempt === retries) throw error;
        const wait = attempt * 4000;
        console.warn(`⚠️ Gemini busy (${error?.status ?? error?.code}), retry ${attempt}/${retries - 1} in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    return [];
  }
}
