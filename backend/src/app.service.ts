import { Injectable } from '@nestjs/common';
import {supabase} from './config/supabase.config';
import { KnowledgeService } from './modules/knowledge/knowledge.service';
@Injectable()
export class AppService {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  async getTestService() {
    try {
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .limit(1);

      if (error) {
        return { success: false, message: 'Database error', error: error.message };
      }

      return { success: true, message: 'Connected to Supabase successfully!', data };
    } catch (err) {
      return { success: false, message: 'Connection failed', error: err };
    }
  }

   async testRagSearch(query: string) {
    const results = await this.knowledgeService.searchKnowledgeBase(query, 3);
    return { 
      query, 
      found: results.length, 
      results: results.map(r => ({ 
        text: r.chunk_text, 
        similarity: r.similarity.toFixed(4) // Show how close the match was
      })) 
    };
  }
}
