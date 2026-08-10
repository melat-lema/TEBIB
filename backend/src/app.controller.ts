import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello(){
    return await this.appService.getTestService();
  }

 
  // NEW: Test RAG Search Endpoint
  @Get('test-search')
  async testSearch(@Query('q') query: string) {
    if (!query) return { error: 'Please provide a query parameter, e.g., ?q=passport fee' };
    return await this.appService.testRagSearch(query);
  }
}
