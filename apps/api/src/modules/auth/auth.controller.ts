import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService, type LoginMeta } from './auth.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Public } from './public.decorator';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { OAuth2Client } from 'google-auth-library';
import type { FastifyRequest } from 'fastify';

class SignUpDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() email: string;
  @IsString() @IsNotEmpty() password: string;
  @IsString() @IsOptional() phone?: string;
}

class LoginDto {
  @IsString() @IsNotEmpty() email: string;
  @IsString() @IsNotEmpty() password: string;
}

class GoogleLoginDto {
  @IsString() @IsOptional() idToken?: string;
  @IsString() @IsOptional() accessToken?: string;
}

class SupabaseLoginDto {
  @IsString() @IsNotEmpty() accessToken: string;
}

class SwitchTenantDto {
  @IsString() @IsNotEmpty() tenantId: string;
}

class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @IsNotEmpty() newPassword: string;
}

class TwoFactorDto {
  @IsBoolean()
  enabled: boolean;
}

@Controller('auth')
export class AuthController {
  private googleClient: OAuth2Client;

  constructor(private readonly authService: AuthService) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private requestMeta(req: FastifyRequest): LoginMeta {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0].trim() || (req as any).ip || undefined;
    return { ip, userAgent: req.headers['user-agent'] as string | undefined };
  }

  @Public()
  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    return { data: await this.authService.signUp(dto) };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest) {
    return {
      data: await this.authService.login(dto.email, dto.password, this.requestMeta(req)),
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto, @Req() req: FastifyRequest) {
    let payload: { sub: string; email?: string; given_name?: string; family_name?: string; picture?: string; name?: string };

    if (dto.idToken) {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      if (!p || !p.email) throw new UnauthorizedException('Invalid Google ID token');
      payload = {
        sub: p.sub,
        email: p.email,
        given_name: p.given_name,
        family_name: p.family_name,
        picture: p.picture,
        name: p.name,
      };
    } else if (dto.accessToken) {
      const resp = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${dto.accessToken}`);
      if (!resp.ok) throw new UnauthorizedException('Invalid Google access token');
      const data = await resp.json() as any;
      if (!data || !data.email) throw new UnauthorizedException('Invalid Google access token');
      payload = {
        sub: data.sub || data.user_id || dto.accessToken,
        email: data.email,
        given_name: data.given_name,
        family_name: data.family_name,
        picture: data.picture,
        name: data.name,
      };
    } else {
      throw new UnauthorizedException('Either idToken or accessToken is required');
    }

    return {
      data: await this.authService.googleLogin(
        {
          id: payload.sub,
          email: payload.email!,
          firstName: payload.given_name || payload.name || 'User',
          lastName: payload.family_name || '',
          avatarUrl: payload.picture,
        },
        this.requestMeta(req),
      ),
    };
  }

  @Public()
  @Post('supabase/exchange')
  @HttpCode(HttpStatus.OK)
  async supabaseLogin(@Body() dto: SupabaseLoginDto, @Req() req: FastifyRequest) {
    const profile = await this.authService.resolveSupabaseUser(dto.accessToken);
    return {
      data: await this.authService.googleLogin(profile, this.requestMeta(req)),
    };
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user);
  }

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  async switchTenant(@Body() dto: SwitchTenantDto, @CurrentUser() user: any) {
    return this.authService.switchTenant(user.id, dto.tenantId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: any) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('two-factor')
  @HttpCode(HttpStatus.OK)
  async setTwoFactor(@Body() dto: TwoFactorDto, @CurrentUser() user: any) {
    return this.authService.setTwoFactor(user.id, Boolean(dto.enabled));
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: any) {
    return this.authService.listSessions(user.id);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: any) {
    return this.authService.revokeAllSessions(user.id);
  }
}
