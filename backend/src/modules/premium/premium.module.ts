import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { PackService } from './pack.service';
import { UserGuard } from './user.guard';

@Module({
  imports: [AiModule],
  controllers: [PremiumController],
  providers: [PremiumService, PackService, UserGuard],
})
export class PremiumModule {}
