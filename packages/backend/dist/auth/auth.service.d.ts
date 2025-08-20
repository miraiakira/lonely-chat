import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { MenuItem } from './dto/menu-item.dto';
export declare class AuthService {
    private userService;
    private jwtService;
    constructor(userService: UserService, jwtService: JwtService);
    validateUser(username: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
    }>;
    getMenus(userId: number): Promise<MenuItem[]>;
}
