// backend/src/modules/chat-history/chat-history.controller.ts
import { Controller, Get, Delete, Param, Headers } from '@nestjs/common';
import { ChatHistoryService } from './chat-history.service';
import { UnauthorizedException } from '@nestjs/common';
import { getUserIdFromAuthHeader } from '../../common/auth.util';
@Controller('chat-history')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Get('sessions')
  async getSessions(@Headers('authorization') authHeader: string) {
    const userId = await getUserIdFromAuthHeader(authHeader);
if (!userId) throw new UnauthorizedException();

    const sessions = await this.chatHistoryService.getUserSessions(userId);
    return { success: true, sessions };
  }

  @Get('sessions/:sessionId')
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string
  ) {
   const userId = await getUserIdFromAuthHeader(authHeader);
if (!userId) throw new UnauthorizedException();

    const messages = await this.chatHistoryService.getSessionMessages(userId, sessionId);
    return { success: true, messages };
  }

  @Delete('sessions/:sessionId')
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string
  ) {
    const userId = await getUserIdFromAuthHeader(authHeader);
if (!userId) throw new UnauthorizedException();

    const success = await this.chatHistoryService.deleteSession(userId, sessionId);
    return { success };
  }


}