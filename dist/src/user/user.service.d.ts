import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../auth/entities/role.entity';
export declare class UserService {
    private readonly userRepository;
    private readonly roleRepository;
    constructor(userRepository: Repository<User>, roleRepository: Repository<Role>);
    findOneByUsername(username: string): Promise<User | null>;
    create(createUserDto: CreateUserDto, roleNames?: string[]): Promise<User>;
}
