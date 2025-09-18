import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { MenuItem } from './dto/menu-item.dto';
import { MenuService } from '../menu/menu.service';
export declare class AuthService {
    private readonly jwtService;
    private readonly userService;
    private readonly menuService;
    private readonly redis;
    constructor(jwtService: JwtService, userService: UserService, menuService: MenuService, redis: any);
    validateUser(username: string, password: string): Promise<any>;
    private buildPayload;
    private refreshKey;
    private refreshPrefix;
    issueTokens(user: any, remember?: boolean): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refresh(user: any, providedRefreshToken: string, remember: boolean, jti: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: number, jti?: string): Promise<boolean>;
    login(user: any, remember?: boolean): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getMe(userId: number): Promise<any>;
    private mapEntityToItem;
    getMenus(userId: number): Promise<MenuItem[]>;
}
