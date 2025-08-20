import { RoleService } from '../../auth/role.service';
import { PermissionService } from '../../auth/permission.service';
import { UserService } from '../../user/user.service';
export declare class SeedService {
    private readonly roleService;
    private readonly permissionService;
    private readonly userService;
    private readonly logger;
    constructor(roleService: RoleService, permissionService: PermissionService, userService: UserService);
    seed(): Promise<void>;
}
