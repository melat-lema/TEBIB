import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports:[KnowledgeModule],
  controllers: [SeedController],
  providers: [SeedService]
})
export class SeedModule {}
