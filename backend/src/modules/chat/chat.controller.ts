// backend/src/modules/chat/chat.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

// Define the expected shape of the incoming request
interface ChatRequestDto {
  message: string;
  language?: 'en' | 'am';
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async handleMessage(@Body() body: ChatRequestDto) {
    const { message, language = 'en' } = body;

    if (!message || message.trim() === '') {
      return { success: false, response: 'Message cannot be empty.' };
    }

    return await this.chatService.processMessage(message, language);
  }
}