import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createAdmin(createUserDto: CreateUserDto): Promise<import("./user.entity").User>;
    create(createUserDto: CreateUserDto): Promise<import("./user.entity").User>;
    findAll(): Promise<import("./user.entity").User[]>;
    remove(id: string): Promise<void>;
    update(id: string, body: {
        user: UpdateUserDto;
        profile: UpdateUserProfileDto;
    }): Promise<import("./user.entity").User>;
    assignRoles(id: string, assignRolesDto: AssignRolesDto): Promise<import("./user.entity").User>;
    protectedResource(): string;
}
