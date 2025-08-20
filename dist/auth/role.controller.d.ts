import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
export declare class RoleController {
    private readonly roleService;
    constructor(roleService: RoleService);
    create(role: Partial<Role>): Promise<Role>;
    findAll(): Promise<Role[]>;
    findOne(id: string): Promise<Role>;
    update(id: string, role: Partial<Role>): Promise<Role>;
    remove(id: string): Promise<void>;
    addPermissionToRole(roleId: string, permissionIds: number[]): Promise<Role>;
    removePermissionFromRole(roleId: string, permissionId: string): Promise<Role>;
}
