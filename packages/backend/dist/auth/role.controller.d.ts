import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
export declare class RoleController {
    private readonly roleService;
    constructor(roleService: RoleService);
    create(role: Partial<Role>): Promise<Role>;
    findAll(): Promise<Role[]>;
    findOne(id: string): Promise<Role>;
    update(id: string, role: Partial<Role>): Promise<Role>;
    remove(id: string): Promise<void>;
    assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto): Promise<Role>;
}
