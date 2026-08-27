import type { AuthUser } from '@socialapp/shared';
export interface JwtPayload { sub: string; email: string; sessionId: string; }
export interface RequestUser extends AuthUser { sessionId: string; }

