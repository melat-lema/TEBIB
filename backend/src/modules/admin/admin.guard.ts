import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';

/**
 * Verifies the Supabase access token for real (the old verifyAdmin only checked that the
 * header started with "Bearer ", so any string was accepted) and requires profiles.role = 'admin'.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Missing token');

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new UnauthorizedException('Invalid or expired token');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profile?.role !== 'admin') throw new ForbiddenException('Admin access required');

    req.adminUser = { id: data.user.id, email: data.user.email };
    return true;
  }
}
