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
      
      const embedding = await this.aiService.generateEmbedding(chunkText);
      const embeddingAm = await this.aiService.generateEmbedding(chunkTextAm);

    
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


async searchKnowledgeBase(query: string, limit: number = 3) {
  try {
    const queryEmbedding = await this.aiService.generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, // ← INCREASED from 0.5 to 0.7
      match_count: limit,
    });

    if (error) {
      console.error('Supabase vector search error:', error);
      return [];
    }

    // Filter out results with low similarity (only keep matches > 0.7)
    const relevantResults = (data || []).filter(
      (item: any) => item.similarity > 0.7
    );

    return relevantResults;
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
}

}