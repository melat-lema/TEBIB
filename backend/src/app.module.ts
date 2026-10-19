import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ServicesModule } from './modules/services/services.module';
import { AiModule } from './modules/ai/ai.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { SeedModule } from './modules/seed/seed.module';
import { ChatModule } from './modules/chat/chat.module';
import { ChatHistoryModule } from './modules/chat-history/chat-history.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServicesModule,
    AiModule,
    KnowledgeModule,
    SeedModule,
    ChatModule,
    ChatHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
