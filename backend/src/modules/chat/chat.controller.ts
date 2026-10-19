import { Controller, Post, Body, Headers } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatService } from './chat.service';
import { getUserIdFromAuthHeader } from '../../common/auth.util';

interface ChatRequestDto {
  message: string;
  language?: 'en' | 'am';
  sessionId?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async handleMessage(@Body() body: ChatRequestDto, @Headers('authorization') authHeader?: string) {
    const { message, language = 'en' } = body;
    if (!message || message.trim() === '') {
      return { success: false, response: 'Message cannot be empty.' };
    }

   const userId = await getUserIdFromAuthHeader(authHeader);
console.log(`👤 userId: ${userId ?? 'NONE (no valid token)'} | sessionId: ${body.sessionId ?? 'none sent'}`);
    const sessionId = body.sessionId ?? randomUUID();
    const result = await this.chatService.processMessage(message, language, sessionId, userId);
    return { ...result, sessionId };
  }
}