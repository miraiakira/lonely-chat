import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import type { Response } from 'express';
import { MenuItem } from './dto/menu-item.dto';
import { RecentActiveBatcher } from '../redis/redis.module';
import type { Producer } from 'kafkajs';
export declare class AuthController {
    private readonly authService;
    private readonly jwtService;
    private readonly userService;
    private readonly redis;
    private readonly kafkaProducer;
    private readonly recentActiveBatcher;
    constructor(authService: AuthService, jwtService: JwtService, userService: UserService, redis: any, kafkaProducer: Producer, recentActiveBatcher: RecentActiveBatcher);
    login(req: any, res: Response): Promise<{
        access_token: string;
    }>;
    getMe(req: any): Promise<any>;
    getMenus(req: any): Promise<MenuItem[]>;
    refresh(req: any, res: Response): Promise<{
        access_token: null;
    } | {
        access_token: string;
    }>;
    logout(req: any, res: Response): Promise<{
        success: boolean;
    }>;
    forgotPassword(body: {
        email?: string;
        username?: string;
    }): Promise<{
        success: boolean;
    }>;
}
