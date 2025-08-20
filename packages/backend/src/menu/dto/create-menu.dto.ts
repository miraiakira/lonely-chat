export class CreateMenuDto {
  title: string;
  icon?: string;
  path: string;
  component: string;
  order?: number;
  parentId?: number;
}