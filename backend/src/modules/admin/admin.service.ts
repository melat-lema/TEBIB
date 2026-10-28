import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  async validateAdmin(email: string, password: string): Promise<{ token: string; user: any }> {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      throw new UnauthorizedException('User is not an admin');
    }

    this.logger.log(`✅ Admin login successful: ${email}`);

    return {
      token: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile.role,
      },
    };
  }

  async getPendingFacts() {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        id,
        service_id,
        chunk_text,
        chunk_text_am,
        source_type,
        source_details,
        source_url,
        source_published_at,
        metadata,
        created_at
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`❌ Failed to fetch pending facts: ${error.message}`);
      return [];
    }

    return data || [];
  }

  async approveFact(factId: string) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', factId)
      .select()
      .single();

    if (error) {
      this.logger.error(`❌ Failed to approve fact: ${error.message}`);
      throw new Error('Failed to approve fact');
    }

    this.logger.log(`✅ Fact approved: ${factId}`);
    return data;
  }

  async rejectFact(factId: string) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', factId)
      .select()
      .single();

    if (error) {
      this.logger.error(`❌ Failed to reject fact: ${error.message}`);
      throw new Error('Failed to reject fact');
    }

    this.logger.log(`❌ Fact rejected: ${factId}`);
    return data;
  }

  async getScraperLogs(limit: number = 20) {
    const { data, error } = await supabase
      .from('scraper_logs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`❌ Failed to fetch scraper logs: ${error.message}`);
      return [];
    }

    return data || [];
  }
}