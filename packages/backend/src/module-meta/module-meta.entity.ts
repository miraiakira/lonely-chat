import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

// 后台“模块管理”的元数据实体，避免与 Nest 的 @Module 名称冲突
@Entity('module_meta')
export class ModuleMeta {
  @PrimaryGeneratedColumn()
  id!: number

  // 唯一的模块标识码（用于前后端路由/菜单挂载）
  @Column({ type: 'varchar', length: 128, unique: true })
  @Index()
  code!: string

  // 显示名称（用于管理后台显示与搜索）
  @Column({ type: 'varchar', length: 255 })
  name!: string

  // 描述信息（可搜索）
  @Column({ type: 'text', nullable: true })
  description?: string | null

  // 启用状态：enabled/disabled
  @Column({ type: 'varchar', length: 32, default: 'enabled' })
  status!: string

  // 版本号（可选，便于灰度/比对）
  @Column({ type: 'varchar', length: 64, nullable: true })
  version?: string | null

  // 拥有角色（字符串数组），用于前端控制可见性；实际权限由 RBAC 决定
  @Column('text', { array: true, nullable: true })
  ownerRoles?: string[] | null

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}