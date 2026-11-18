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
  @Get('me')
  me(@Req() req: any) {
    return this.premium.me(req.user);
  }

  @UseGuards(UserGuard)
  @Post('checkout')
  checkout(@Req() req: any) {
    return this.premium.checkout(req.user);
  }

  @UseGuards(UserGuard)
  @Get('verify/:txRef')
  verify(@Req() req: any, @Param('txRef') txRef: string) {
    return this.premium.verifyAndFulfill(txRef, req.user.id);
  }

  // Optional Chapa webhook: it only triggers a server-side verify and grants nothing by itself.
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
  @Post('packs')
  createPack(@Req() req: any, @Body() body: any) {
    return this.premium.createPack(req.user, body);
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
