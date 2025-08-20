import { AuthService } from './auth.service';
import { MenuItem } from './dto/menu-item.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(req: any): Promise<{
        access_token: string;
    }>;
    getMenus(req: any): Promise<MenuItem[]>;
}
