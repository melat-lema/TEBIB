// backend/src/modules/knowledge/knowledge.service.ts
import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';
import { AiService } from '../ai/ai.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly aiService: AiService) {}

    async addKnowledgeChunk(
    serviceId: string | null,
    chunkText: string,
    chunkTextAm: string,
    sourceType: string,
    sourceDetails: string,
    extra: {
      status?: 'pending' | 'approved' | 'rejected';
      sourceUrl?: string;
      sourcePublishedAt?: string;
      contentHash?: string;
      metadata?: Record<string, any>;
    } = {},
  ) {
    try {
      const embedding = await this.aiService.generateEmbedding(chunkText, 'doc');
      const embeddingAm = chunkTextAm
        ? await this.aiService.generateEmbedding(chunkTextAm, 'doc')
        : null;

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert([
          {
            service_id: serviceId,
            chunk_text: chunkText,
            chunk_text_am: chunkTextAm || null,
            embedding,
            embedding_am: embeddingAm,
            source_type: sourceType,
            source_details: sourceDetails,
            status: extra.status ?? 'approved', // manual seed stays live; the scraper passes 'pending'
            source_url: extra.sourceUrl ?? null,
            source_published_at: extra.sourcePublishedAt ?? null,
            content_hash: extra.contentHash ?? null,
            metadata: { language: 'bilingual', ...(extra.metadata ?? {}) },
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if ((error as any)?.code !== '23505') console.error('Error adding knowledge chunk:', error);
      throw error; // 23505 = duplicate, handled by the caller
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