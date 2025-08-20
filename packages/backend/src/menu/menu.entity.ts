import { Entity, PrimaryGeneratedColumn, Column, Tree, TreeChildren, TreeParent } from 'typeorm';

@Entity()
@Tree('closure-table')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  icon: string;

  @Column()
  path: string;

  @Column()
  component: string;

  @Column({ default: 0 })
  order: number;

  @TreeChildren()
  children: Menu[];

  @TreeParent()
  parent: Menu;
}