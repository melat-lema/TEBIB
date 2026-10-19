// backend/src/modules/knowledge/knowledge.service.ts
import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';
import { AiService } from '../ai/ai.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly aiService: AiService) {}

  async addKnowledgeChunk(
    serviceId: string,
    chunkText: string,
    chunkTextAm: string,
    sourceType: string,
    sourceDetails: string,
  ) {
    try {
      const embedding = await this.aiService.generateEmbedding(chunkText, 'doc');
      const embeddingAm = await this.aiService.generateEmbedding(chunkTextAm, 'doc');

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert([
          {
            service_id: serviceId,
            chunk_text: chunkText,
            chunk_text_am: chunkTextAm,
            embedding: embedding,
            embedding_am: embeddingAm,
            source_type: sourceType,
            source_details: sourceDetails,
            metadata: { language: 'bilingual' },
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding knowledge chunk:', error);
      throw error;
    }
  }

   async searchKnowledgeBase(query: string, limit: number = 3, threshold: number = 0.3) {
    console.log(`\n🔍 Searching database for: "${query}"`);

    const queryEmbedding = await this.aiService.generateEmbedding(query, 'query');

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('❌ match_documents error:', error);
      throw error;
    }

    console.log(
      '📊 Similarity scores:',
      (data ?? []).map((d: any) => Number(d.similarity).toFixed(3)),
    );

    return data ?? [];
  }
}