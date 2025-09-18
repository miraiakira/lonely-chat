export declare class Menu {
    id: number;
    title: string;
    i18nKey: string;
    icon: string;
    path: string;
    component: string;
    order: number;
    permissions: string[];
    isExternal: boolean;
    externalUrl: string;
    hidden: boolean;
    children: Menu[];
    parent: Menu;
}
