import { Controller, Post, UseGuards, Request, Body, HttpCode, Get, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import type { Response, CookieOptions } from 'express';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { MenuItem } from './dto/menu-item.dto';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT, RecentActiveBatcher } from '../redis/redis.module';
import { KAFKA_PRODUCER } from '../kafka/kafka.module';
import type { Producer } from 'kafkajs';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
    @Inject(KAFKA_PRODUCER) private readonly kafkaProducer: Producer,
    private readonly recentActiveBatcher: RecentActiveBatcher,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const remember = Boolean(req.body?.remember);
    const { access_token, refresh_token } = await this.authService.login(req.user, remember);
    const cookieOpts: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    };
    if (remember) {
      cookieOpts.maxAge = 7 * 24 * 60 * 60 * 1000;
    }
    res.cookie('refresh_token', refresh_token, cookieOpts);

    // 写入最近活跃用户：改为进程内队列 + 批量提交（非阻塞）
    try {
      const now = Date.now();
      this.recentActiveBatcher.enqueue(String(req.user.id), now);
    } catch {}

    // 发送登录事件到 Kafka：非阻塞 fire-and-forget
    try {
      void this.kafkaProducer
        .send({
          topic: 'user.logged_in',
          messages: [
            {
              key: String(req.user.id),
              value: JSON.stringify({ userId: req.user.id, ts: Date.now(), type: 'login' }),
            },
          ],
        })
        .catch((err) => {
          // 轻量采样日志（10%），避免刷屏
          if (Math.random() < 0.1) {
            // eslint-disable-next-line no-console
            console.warn('[Kafka] user.logged_in send failed:', err?.message || err)
          }
        });
    } catch {}

    return { access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('menus')
  async getMenus(@Request() req) {
    return this.authService.getMenus(req.user.id);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Request() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      return { access_token: null };
    }
    try {
      const payload = (await this.jwtService.verifyAsync(refreshToken)) as any;
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        return { access_token: null };
      }
      const remember = Boolean(payload?.remember);
      const jti = payload?.jti as string | undefined;
      const { access_token, refresh_token } = await this.authService.refresh(user, refreshToken, remember, jti!);
      const cookieOpts: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
      };
      if (remember) {
        cookieOpts.maxAge = 7 * 24 * 60 * 60 * 1000;
      }
      res.cookie('refresh_token', refresh_token, cookieOpts);

      // 刷新也更新活跃时间（非阻塞，走批量器）
      try {
        const now = Date.now();
        this.recentActiveBatcher.enqueue(String(user.id), now);
      } catch {}

      // 发送刷新事件到 Kafka（非阻塞）
      try {
        void this.kafkaProducer
          .send({
            topic: 'user.logged_in',
            messages: [
              {
                key: String(user.id),
                value: JSON.stringify({ userId: user.id, ts: Date.now(), type: 'refresh' }),
              },
            ],
          })
          .catch((err) => {
            if (Math.random() < 0.1) {
              // eslint-disable-next-line no-console
              console.warn('[Kafka] user.logged_in send failed:', err?.message || err)
            }
          });
      } catch {}

      return { access_token };
    } catch (e) {
      res.clearCookie('refresh_token', { path: '/api/auth' });
      return { access_token: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token as string | undefined;
      if (refreshToken) {
        try {
          const payload = (await this.jwtService.verifyAsync(refreshToken)) as any;
          if (payload?.sub) {
            await this.authService.logout(payload.sub, payload?.jti);
          }
        } catch {
          // 若 Cookie 无效，则回退到清空该用户所有会话
          if (req.user?.id) {
            await this.authService.logout(req.user.id);
          }
        }
      } else if (req.user?.id) {
        // 没有 Cookie 时，只能清空该用户所有会话
        await this.authService.logout(req.user.id);
      }
    } finally {
      res.clearCookie('refresh_token', { path: '/api/auth' });
    }
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() body: { email?: string; username?: string }) {
    return { success: true };
  }
}