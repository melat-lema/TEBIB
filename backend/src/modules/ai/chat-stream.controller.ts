import { Body, Controller, Headers, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { ChatGraph, ChatSource } from './chat.graph';
import { supabase } from '../../config/supabase.config';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SESSIONS = 500;

/**
 * POST /chat/stream  (Server-Sent Events)
 *   body: { message: string, language?: 'en' | 'am', sessionId?: uuid }
 *   events: {type:'meta'} · {type:'token', text} · {type:'done', sources, sessionId} · {type:'error', message}
 *
 * Conversation memory is kept in RAM per sessionId (same as before: it resets on server restart).
 * Each finished exchange is also written to chat_history (best effort, never blocks the answer).
 */
@Controller('chat')
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);
  private readonly sessions = new Map<string, string[]>();

  constructor(private readonly chatGraph: ChatGraph) {}

  private async userIdFromAuth(authHeader?: string): Promise<string | null> {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    } catch {
      return null;
    }
  }

  private remember(sessionId: string, user: string, assistant: string) {
    const prev = this.sessions.get(sessionId) ?? [];
    this.sessions.delete(sessionId); // re-insert = most recently used
    this.sessions.set(sessionId, [...prev, `User: ${user}`, `Assistant: ${assistant.slice(0, 300)}`].slice(-6));
    if (this.sessions.size > MAX_SESSIONS) this.sessions.delete(this.sessions.keys().next().value as string);
  }

  @Post('stream')
  async stream(
    @Body() body: { message?: string; language?: string; sessionId?: string },
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: Response,
  ) {
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const language: 'en' | 'am' = body?.language === 'am' ? 'am' : 'en';
    const sessionId = body?.sessionId && UUID_RE.test(body.sessionId) ? body.sessionId : randomUUID();

    if (!message || message.length > 1000) {
      res.status(400).json({ success: false, message: 'Message must be 1-1000 characters.' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // stops nginx-style proxies from buffering the stream
    res.flushHeaders();

    let clientGone = false;
    res.on('close', () => {
      clientGone = true;
    });
    const send = (event: unknown) => {
      if (!clientGone) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const userIdPromise = this.userIdFromAuth(authHeader); // runs while the model works
      const history = this.sessions.get(sessionId) ?? [];
      let finalResponse = '';
      let finalSources: ChatSource[] = [];
      let decision = 'rag';

      for await (const evt of this.chatGraph.stream(message, language, history)) {
        if (clientGone) break;
        if (evt.type === 'meta') decision = evt.decision;
        if (evt.type === 'done') {
          finalResponse = evt.response;
          finalSources = evt.sources;
          send({ type: 'done', sources: evt.sources, sessionId });
        } else {
          send(evt);
        }
      }

      if (finalResponse) {
        this.remember(sessionId, message, finalResponse);
        const userId = await userIdPromise;
        const { error } = await supabase.from('chat_history').insert([
          {
            user_id: userId,
            user_message: message,
            ai_response: finalResponse,
            language_used: language,
            session_id: sessionId,
            sources: finalSources,
            // a question counts as unanswered when it needed facts but nothing verified matched
            answered: decision !== 'rag' || finalSources.length > 0,
          },
        ]);
        if (error) this.logger.warn(`chat_history insert failed: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Stream failed: ${error instanceof Error ? error.message : error}`);
      send({
        type: 'error',
        message: language === 'am' ? 'ይቅርታ፣ ስህተት ተፈጥሯል።' : 'Sorry, something went wrong. Please try again.',
      });
    } finally {
      res.end();
    }
  }
}
