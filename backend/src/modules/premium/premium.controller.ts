import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { UserGuard } from './user.guard';

@Controller('premium')
export class PremiumController {
  constructor(private readonly premium: PremiumService) {}

  @Get('config')
  config() {
    return this.premium.config();
  }

  @Get('eligibility/:serviceId')
  eligibility(@Param('serviceId') serviceId: string) {
    return this.premium.eligibility(serviceId);
  }

  @UseGuards(UserGuard)
  @Post('checkout')
  checkout(@Req() req: any, @Body() body: any) {
    return this.premium.checkout(req.user, body);
  }

  @UseGuards(UserGuard)
  @Get('verify/:txRef')
  verify(@Req() req: any, @Param('txRef') txRef: string) {
    return this.premium.verifyAndFulfill(txRef, req.user.id);
  }

  // Optional: set this URL as the webhook in the Chapa dashboard. It only triggers a server-side verify, it grants nothing by itself.
  @Post('webhook')
  async webhook(@Body() body: any) {
    const ref = String(body?.tx_ref ?? body?.trx_ref ?? '');
    if (ref) await this.premium.verifyAndFulfill(ref).catch(() => undefined);
    return { received: true };
  }

  @Get('callback')
  async callback(@Query('tx_ref') txRef?: string, @Query('trx_ref') trxRef?: string) {
    const ref = String(txRef ?? trxRef ?? '');
    if (ref) await this.premium.verifyAndFulfill(ref).catch(() => undefined);
    return { received: true };
  }

  @UseGuards(UserGuard)
  @Get('packs')
  packs(@Req() req: any) {
    return this.premium.listPacks(req.user.id);
  }

  @UseGuards(UserGuard)
  @Get('packs/:id')
  pack(@Req() req: any, @Param('id') id: string) {
    return this.premium.getPack(req.user.id, id);
  }
}
