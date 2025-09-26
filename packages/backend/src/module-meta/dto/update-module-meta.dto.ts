export class UpdateModuleMetaDto {
  name?: string
  description?: string
  status?: 'enabled' | 'disabled'
  version?: string
  ownerRoles?: string[]
}