import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body?.email || !body?.password) throw new BadRequestException('Email and password are required');
    return this.admin.validateAdmin(body.email, body.password);
  }
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ---- dashboards
  @Get('stats') stats() { return this.admin.getStats(); }
  @Get('analytics') analytics() { return this.admin.getAnalytics(); }
  @Get('scraper-logs') logs(@Query('limit') limit?: string) { return this.admin.getScraperLogs(Number(limit) || 30); }

  // ---- review queue
  @Get('pending') pending() { return this.admin.getPending(); }

  @Post('approve/:id')
  approve(@Param('id') id: string, @Body() body: { edits?: any }) {
    return this.admin.approveFact(id, body?.edits);
  }

  @Post('reject/:id')
  reject(@Param('id') id: string) {
    return this.admin.rejectFact(id);
  }

  @Post('bulk')
  bulk(@Body() body: { action?: string; ids?: string[] }) {
    if (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 100) throw new BadRequestException('Provide 1-100 ids');
    if (body.action !== 'approve' && body.action !== 'reject') throw new BadRequestException('action must be approve or reject');
    return this.admin.bulk(body.action, body.ids);
  }

  // ---- knowledge base
  @Get('knowledge')
  knowledge(@Query() q: { status?: string; serviceId?: string; q?: string; page?: string }) {
    return this.admin.listKnowledge(q);
  }

  @Post('knowledge')
  createKnowledge(@Body() body: any) {
    return this.admin.createKnowledge(body);
  }

  @Patch('knowledge/:id')
  updateKnowledge(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateKnowledge(id, body);
  }

  @Post('knowledge/:id/archive')
  archive(@Param('id') id: string) {
    return this.admin.setStatus(id, 'archived');
  }

  @Post('knowledge/:id/restore')
  restore(@Param('id') id: string) {
    return this.admin.setStatus(id, 'approved');
  }

  // ---- sources + scraper
  @Get('sources') sources() { return this.admin.listSources(); }
  @Post('sources') createSource(@Body() body: any) { return this.admin.createSource(body); }
  @Patch('sources/:id') updateSource(@Param('id') id: string, @Body() body: any) { return this.admin.updateSource(id, body); }
  @Delete('sources/:id') deleteSource(@Param('id') id: string) { return this.admin.deleteSource(id); }
  @Post('sources/test') testSource(@Body() body: any) { return this.admin.testSource(body); }

  @Post('import')
  importText(@Body() body: any) {
    return this.admin.importText(body);
  }

  @Get('diagnostics')
  diagnostics() {
    return this.admin.diagnostics();
  }

  @Post('starter-facts')
  starterFacts() {
    return this.admin.loadStarterFacts();
  }

  @Post('scraper/run')
  run(@Body() body: { sourceId?: string; types?: string[] }) {
    return this.admin.runScraper(body);
  }
}
