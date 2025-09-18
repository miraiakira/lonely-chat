export class CreateMenuDto {
  title: string;
  i18nKey?: string;
  icon?: string;
  path: string;
  component?: string;
  order?: number;
  parentId?: number;
  permissions?: string[];
  isExternal?: boolean;
  externalUrl?: string;
  hidden?: boolean;
}