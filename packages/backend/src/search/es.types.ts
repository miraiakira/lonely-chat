// 统一定义 ES 搜索与索引相关类型，避免临时类型
// 说明：这些类型围绕业务索引文档与高亮信息进行约束

// 高亮字段：key 为字段名，值为字符串数组（ES 可能返回多段）
export type EsTextHighlight = { [field: string]: string[] | undefined };

// 命中项（最小子集），只保留我们实际使用到的字段
export type EsHit<T> = {
  _source?: T;
  highlight?: EsTextHighlight;
  sort?: unknown;
};

// hits 包裹结构（最小子集）
export type EsHits<T> = {
  hits?: Array<EsHit<T>>;
  total?: number | { value?: number };
};

// SearchResponse 的 body 结构（最小子集）
export type EsSearchBody<T> = {
  hits?: EsHits<T>;
};

// 兼容 ES 客户端返回体（可能是带 body 的包装，也可能直接是 body）
export type WithBody<T> = { body?: T };

// 业务索引文档类型定义
export type PostIndexDoc = {
  id: number;
  content: string;
  authorId: number;
  authorUsername: string;
  images: string[] | null;
  likesCount: number;
  commentsCount: number;
  createdAt: number;
  updatedAt?: number;
};

export type UserIndexDoc = {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  createdAt: number;
};

export type ModuleIndexDoc = {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
  version: string | null;
  ownerRoles: string[] | null;
  createdAt: number;
};
