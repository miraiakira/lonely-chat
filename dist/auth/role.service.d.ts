import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
export declare class RoleService {
    private readonly roleRepository;
    private readonly permissionRepository;
    constructor(roleRepository: Repository<Role>, permissionRepository: Repository<Permission>);
    create(role: Partial<Role>): Promise<Role>;
    findAll(): Promise<Role[]>;
    findOne(id: number): Promise<Role>;
    update(id: number, role: Partial<Role>): Promise<Role>;
    remove(id: number): Promise<void>;
    addPermissionToRole(roleId: number, permissionIds: number[]): Promise<Role>;
    removePermissionFromRole(roleId: number, permissionId: number): Promise<Role>;
}
