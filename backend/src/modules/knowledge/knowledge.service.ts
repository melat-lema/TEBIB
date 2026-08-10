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
      // 1. Convert the user's query into a vector embedding
      const queryEmbedding = await this.aiService.generateEmbedding(query);

      // 2. Call the Supabase RPC function we just created to find the closest matches
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Only return results that are at least 50% similar
        match_count: limit,   // Return top 3 matches
      });

      if (error) {
        console.error('Supabase vector search error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return []; // Return empty array on error so the app doesn't crash
    }
  }

}