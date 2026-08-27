import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { AuthSession, AuthUser, PermissionCode, RoleCode } from '@socialapp/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly audit: AuditService) {}

  async login(dto: LoginDto, context: { ipAddress?: string; userAgent?: string }): Promise<AuthSession & { refreshToken: string }> {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email.trim().toLowerCase(), status: 'ACTIVE', deletedAt: null }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      await this.audit.record({ action: 'auth.login', outcome: 'DENIED', ipAddress: context.ipAddress, userAgent: context.userAgent, metadata: { email: dto.email.trim().toLowerCase() } });
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    const sessionId = crypto.randomUUID();
    const refreshToken = await this.jwt.signAsync({ sub: user.id, sessionId, type: 'refresh' }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: `${this.refreshDays()}d` });
    const tokenRecord = await this.prisma.refreshToken.create({ data: { id: sessionId, userId: user.id, tokenHash: await argon2.hash(refreshToken, { type: argon2.argon2id }), expiresAt: new Date(Date.now() + this.refreshDays() * 86_400_000), ipAddress: context.ipAddress, userAgent: context.userAgent } });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorUserId: user.id, action: 'auth.login', ipAddress: context.ipAddress, userAgent: context.userAgent });
    return { accessToken: await this.accessToken(user.id, user.email, tokenRecord.id), refreshToken, user: this.toAuthUser(user) };
  }

  async refresh(token: string): Promise<AuthSession & { refreshToken: string }> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sessionId: string; type: string }>(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      if (payload.type !== 'refresh') throw new Error('invalid type');
      const record = await this.prisma.refreshToken.findFirst({ where: { id: payload.sessionId, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } } });
      if (!record || !(await argon2.verify(record.tokenHash, token)) || record.user.status !== 'ACTIVE' || record.user.deletedAt) throw new Error('invalid record');
      const newToken = await this.jwt.signAsync({ sub: record.userId, sessionId: record.id, type: 'refresh' }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: `${this.refreshDays()}d` });
      await this.prisma.refreshToken.update({ where: { id: record.id }, data: { tokenHash: await argon2.hash(newToken, { type: argon2.argon2id }), expiresAt: new Date(Date.now() + this.refreshDays() * 86_400_000) } });
      return { accessToken: await this.accessToken(record.user.id, record.user.email, record.id), refreshToken: newToken, user: this.toAuthUser(record.user) };
    } catch { throw new UnauthorizedException('La sesión venció. Ingresa nuevamente.'); }
  }

  async logout(sessionId?: string) {
    if (sessionId) await this.prisma.refreshToken.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private accessToken(userId: string, email: string, sessionId: string) { return this.jwt.signAsync({ sub: userId, email, sessionId }, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m' }); }
  private refreshDays() { return Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 7); }
  private toAuthUser(user: { id: string; email: string; displayName: string; roles: Array<{ role: { code: string; permissions: Array<{ permission: { code: string } }> } }> }): AuthUser {
    return { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles.map(({ role }) => role.code as RoleCode), permissions: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code as PermissionCode)))] };
  }
}
