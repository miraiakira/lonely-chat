import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { Role } from '../auth/entities/role.entity';
import { UserProfile } from './user-profile.entity';
import { AssignRolesDto } from './dto/assign-roles.dto';
export declare class UserService {
    private readonly userRepository;
    private readonly roleRepository;
    private readonly userProfileRepository;
    constructor(userRepository: Repository<User>, roleRepository: Repository<Role>, userProfileRepository: Repository<UserProfile>);
    findOneByUsername(username: string): Promise<User | null>;
    findOne(id: number): Promise<User | null>;
    findAll(): Promise<User[]>;
    remove(id: number): Promise<void>;
    update(id: number, updateUserDto: UpdateUserDto, updateUserProfileDto: UpdateUserProfileDto): Promise<User>;
    assignRoles(id: number, assignRolesDto: AssignRolesDto): Promise<User>;
    create(createUserDto: CreateUserDto, roleNames?: string[]): Promise<User>;
}
