export class CreateModuleMetaDto {
  code!: string
  name!: string
  description?: string
  status?: 'enabled' | 'disabled'
  version?: string
  ownerRoles?: string[]
}