import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
export declare class PermissionController {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    create(permission: Partial<Permission>): Promise<Permission>;
    findAll(): Promise<Permission[]>;
    findOne(id: string): Promise<Permission>;
    update(id: string, permission: Partial<Permission>): Promise<Permission>;
    remove(id: string): Promise<void>;
}
