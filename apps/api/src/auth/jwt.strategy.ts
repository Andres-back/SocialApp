import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { PermissionCode, RoleCode } from '@socialapp/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload, RequestUser } from '../iam/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET') });
  }
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findFirst({ where: { id: payload.sub, status: 'ACTIVE', deletedAt: null }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user) throw new UnauthorizedException('La sesión ya no es válida.');
    return { id: user.id, email: user.email, displayName: user.displayName, sessionId: payload.sessionId, roles: user.roles.map(({ role }) => role.code as RoleCode), permissions: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code as PermissionCode)))] };
  }
}

