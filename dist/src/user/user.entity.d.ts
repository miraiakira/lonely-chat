import { Role } from '../auth/entities/role.entity';
export declare class User {
    id: number;
    username: string;
    password: string;
    roles: Role[];
    hashPassword(): Promise<void>;
}
