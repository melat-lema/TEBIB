import { Injectable } from '@nestjs/common';
import {supabase} from './config/supabase.config';
@Injectable()
export class AppService {
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
}
