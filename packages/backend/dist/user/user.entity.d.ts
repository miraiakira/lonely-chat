import { UserProfile } from './user-profile.entity';
import { Role } from '../auth/entities/role.entity';
export declare class User {
    id: number;
    username: string;
    password: string;
    roles: Role[];
    createdAt: Date;
    updatedAt: Date;
    profile: UserProfile;
    hashPassword(): Promise<void>;
}
