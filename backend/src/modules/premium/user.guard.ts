import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { supabase } from '../../config/supabase.config';

/** Any signed-in user. Verifies the Supabase access token on the server. */
@Injectable()
export class UserGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Please sign in');

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new UnauthorizedException('Session expired. Please sign in again.');

    const meta: any = data.user.user_metadata ?? {};
    req.user = { id: data.user.id, email: data.user.email ?? '', name: String(meta.full_name ?? meta.name ?? '') };
    return true;
  }
}
