import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
export declare class PermissionService {
    private readonly permissionRepository;
    constructor(permissionRepository: Repository<Permission>);
    create(permission: Partial<Permission>): Promise<Permission>;
    findAll(): Promise<Permission[]>;
    findOne(id: number): Promise<Permission>;
    update(id: number, permission: Partial<Permission>): Promise<Permission>;
    remove(id: number): Promise<void>;
}
