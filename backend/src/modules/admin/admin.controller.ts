import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const result = await this.adminService.validateAdmin(email, password);
    return result;
  }

  @Get('pending-facts')
  async getPendingFacts(@Headers('authorization') authHeader: string) {
    this.verifyAdmin(authHeader);
    return await this.adminService.getPendingFacts();
  }

  @Post('approve/:factId')
  async approveFact(
    @Headers('authorization') authHeader: string,
    @Body() body: { factId: string },
  ) {
    this.verifyAdmin(authHeader);
    return await this.adminService.approveFact(body.factId);
  }

  @Post('reject/:factId')
  async rejectFact(
    @Headers('authorization') authHeader: string,
    @Body() body: { factId: string },
  ) {
    this.verifyAdmin(authHeader);
    return await this.adminService.rejectFact(body.factId);
  }

  @Get('scraper-logs')
  async getScraperLogs(
    @Headers('authorization') authHeader: string,
  ) {
    this.verifyAdmin(authHeader);
    return await this.adminService.getScraperLogs();
  }

  private verifyAdmin(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    // In a production app, you'd verify the JWT token here
    // For now, we trust that if they have a valid Supabase token, they're authenticated
    // The frontend will send the token from the login response
  }
}