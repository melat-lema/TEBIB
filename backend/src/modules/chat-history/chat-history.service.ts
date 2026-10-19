// backend/src/modules/chat-history/chat-history.service.ts
import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';

@Injectable()
export class ChatHistoryService {
  
  async saveMessage(
    userId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    language: 'en' | 'am',
    sources: any[] = [],
    serviceId?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: userId,
            session_id: sessionId,
            user_message: userMessage,
            ai_response: aiResponse,
            language_used: language,
            sources: sources,
            service_id: serviceId || null,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving chat message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Fatal error saving chat message:', error);
      return null;
    }
  }

  async getUserSessions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('session_id, user_message, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      const sessions = new Map<string, any>();
      (data ?? []).forEach((row) => {
        const s = sessions.get(row.session_id);
        if (!s) {
          sessions.set(row.session_id, {
            session_id: row.session_id,
            preview: row.user_message,          // first message of the chat
            created_at: row.created_at,
            last_message_at: row.created_at,
          });
        } else {
          s.last_message_at = row.created_at;
        }
      });

      return Array.from(sessions.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
      );
    } catch (error) {
      console.error('Fatal error fetching sessions:', error);
      return [];
    }
  }

  async getSessionMessages(userId: string, sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching session messages:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Fatal error fetching session messages:', error);
      return [];
    }
  }

  async deleteSession(userId: string, sessionId: string) {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fatal error deleting session:', error);
      return false;
    }
  }

    async getRecentTurns(userId: string, sessionId: string, turns = 3): Promise<string[]> {
    const { data, error } = await supabase
      .from('chat_history')
      .select('user_message, ai_response')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(turns);

    if (error || !data) return [];
    return data
      .reverse()
      .flatMap((r) => [`User: ${r.user_message}`, `Assistant: ${(r.ai_response ?? '').slice(0, 300)}`]);
  }
}