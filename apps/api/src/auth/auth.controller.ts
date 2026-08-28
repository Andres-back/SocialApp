import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../iam/public.decorator';
import type { RequestUser } from '../iam/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const { refreshToken, ...session } = await this.auth.login(dto, { ipAddress: request.ip, userAgent: request.get('user-agent') });
    this.setRefreshCookie(response, refreshToken);
    return session;
  }

  @Public() @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.socialapp_refresh as string | undefined;
    if (!token) {
      response.status(204);
      return;
    }
    const { refreshToken, ...session } = await this.auth.refresh(token);
    this.setRefreshCookie(response, refreshToken);
    return session;
  }

  @Post('logout')
  async logout(@Req() request: Request & { user: RequestUser }, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.user.sessionId);
    response.clearCookie('socialapp_refresh', { path: '/api/v1/auth' });
    return { success: true };
  }

  private setRefreshCookie(response: Response, token: string) {
    const secure = process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';
    response.cookie('socialapp_refresh', token, { httpOnly: true, secure, sameSite: 'lax', path: '/api/v1/auth', maxAge: 7 * 86_400_000 });
  }
}
