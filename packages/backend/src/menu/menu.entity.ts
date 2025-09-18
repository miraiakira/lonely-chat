import { Entity, PrimaryGeneratedColumn, Column, Tree, TreeChildren, TreeParent } from 'typeorm';

@Entity()
@Tree('closure-table')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  i18nKey: string;

  @Column({ nullable: true })
  icon: string;

  @Column()
  path: string;

  @Column({ nullable: true })
  component: string;

  @Column({ default: 0 })
  order: number;

  @Column('simple-array', { nullable: true })
  permissions: string[];

  @Column({ default: false })
  isExternal: boolean;

  @Column({ nullable: true })
  externalUrl: string;

  @Column({ default: false })
  hidden: boolean;

  @TreeChildren()
  children: Menu[];

  @TreeParent()
  parent: Menu;
}