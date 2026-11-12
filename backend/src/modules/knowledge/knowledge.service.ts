import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';
import { AiService } from '../ai/ai.service';

export type KbStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface SimilarFact {
  id: string;
  status: KbStatus;
  chunk_text: string;
  similarity: number;
}

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
      category?: string | null;
      supersedesId?: string | null;
      trustLevel?: string | null;
      metadata?: Record<string, any>;
    } = {},
  ) {
    try {
      const embedding = await this.aiService.generateEmbedding(chunkText, 'doc');
      const embeddingAm = chunkTextAm ? await this.aiService.generateEmbedding(chunkTextAm, 'doc') : null;
      const status = extra.status ?? 'approved'; // manual seed stays live; the scraper passes 'pending'

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
            status,
            category: extra.category ?? null,
            supersedes_id: extra.supersedesId ?? null,
            trust_level: extra.trustLevel ?? null,
            source_url: extra.sourceUrl ?? null,
            source_published_at: extra.sourcePublishedAt ?? null,
            content_hash: extra.contentHash ?? null,
            last_verified_at: status === 'approved' ? new Date().toISOString() : null,
            metadata: { language: 'bilingual', ...(extra.metadata ?? {}) },
          },
        ])
        .select('id, service_id, status, chunk_text, chunk_text_am, category')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if ((error as any)?.code !== '23505') console.error('Error adding knowledge chunk:', error);
      throw error; // 23505 = duplicate, handled by the caller
    }
  }

  /** Edit an existing fact. Text changes are re-embedded so search stays correct. */
  async updateChunk(
    id: string,
    patch: { chunkText?: string; chunkTextAm?: string | null; serviceId?: string | null; category?: string | null },
  ) {
    const update: Record<string, any> = {};

    if (typeof patch.chunkText === 'string') {
      const text = patch.chunkText.trim();
      if (!text) throw new Error('English text cannot be empty');
      update.chunk_text = text;
      update.embedding = await this.aiService.generateEmbedding(text, 'doc');
    }
    if (patch.chunkTextAm !== undefined) {
      const am = (patch.chunkTextAm ?? '').trim();
      update.chunk_text_am = am || null;
      update.embedding_am = am ? await this.aiService.generateEmbedding(am, 'doc') : null;
    }
    if (patch.serviceId !== undefined) update.service_id = patch.serviceId || null;
    if (patch.category !== undefined) update.category = patch.category || null;
    if (!Object.keys(update).length) return null;

    const { data, error } = await supabase
      .from('knowledge_base')
      .update(update)
      .eq('id', id)
      .select('id, service_id, status, chunk_text, chunk_text_am, category')
      .single();
    if (error) throw error;
    return data;
  }

  /** Approved + pending facts that look like `text` (used by the scraper to spot updates and duplicates). */
  async findSimilar(text: string, minScore = 0.8, count = 5): Promise<SimilarFact[]> {
    const embedding = await this.aiService.generateEmbedding(text, 'doc');
    const { data, error } = await supabase.rpc('match_documents_any', {
      query_embedding: embedding,
      match_threshold: minScore,
      match_count: count,
    });
    if (error) throw error;
    return (data ?? []) as SimilarFact[];
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

    console.log('📊 Similarity scores:', (data ?? []).map((d: any) => Number(d.similarity).toFixed(3)));
    return data ?? [];
  }
}
