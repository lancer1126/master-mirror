/**
 * 通用类型定义
 * 用于主进程和渲染进程共同使用的数据类型
 */

// ============ 搜索相关类型 ============

/**
 * 搜索命中结果（对应 Meilisearch 返回的文档）
 */
export interface SearchHit {
  /** 分块ID */
  id: string;
  /** 文件ID（用于唯一标识文件） */
  fileId?: string;
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 文本内容（完整 chunk） */
  content?: string;
  /** 页码范围 */
  pageRange?: string;
  /** 总页数 */
  totalPages?: number;
  /** 分块索引 */
  chunkIndex: number;
  /** 总分块数 */
  totalChunks: number;
  /** 文件路径 */
  filePath: string;
  /** 创建时间 */
  createdAt: number;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 格式化后的内容（包含高亮和裁剪） */
  _formatted?: {
    content?: string;
    fileName?: string;
    [key: string]: any;
  };
  /** 匹配位置信息 */
  _matchesPosition?: Record<string, Array<{ start: number; length: number }>>;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 搜索命中的文档列表 */
  hits: SearchHit[];
  /** 搜索关键字 */
  query: string;
  /** 搜索耗时（毫秒） */
  processingTimeMs: number;
  /** 估计总命中数 */
  estimatedTotalHits: number;
  /** Facet 分布（按 fileId 统计每个文件的 chunks 数量） */
  facetDistribution?: {
    fileId?: Record<string, number>;
  };
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 返回结果数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 过滤条件 */
  filter?: string;
  /** 排序规则 */
  sort?: string[];
  /** 每次批量获取的 chunk 数量（默认 500） */
  batchSize?: number;
  /** 是否在搜索结果中返回完整内容 */
  includeContent?: boolean;
  /** 是否需要一次性取回所有命中（默认 true） */
  fetchAllHits?: boolean;
  /** 裁剪长度 */
  cropLength?: number;
}

/**
 * 索引统计信息
 */
export interface IndexStats {
  /** 文档总数 */
  numberOfDocuments: number;
  /** 是否正在索引 */
  isIndexing: boolean;
  /** 字段分布 */
  fieldDistribution: Record<string, number>;
}

// ============ 文件上传相关类型 ============

/**
 * 上传记录（数据库记录）
 */
export interface UploadRecord {
  /** 文件ID（哈希值） */
  fileId: string;
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  filePath: string;
  /** 上传时间 (yyyy-MM-dd HH:mm:ss) */
  uploadTime: string;
}

/**
 * 文件解析进度信息（通过 IPC 传递）
 */
export interface ParseProgress {
  /** 文件名 */
  fileName: string;
  /** 当前进度（已处理的页数或行数等） */
  current: number;
  /** 总数 */
  total: number;
  /** 百分比 */
  percentage: number;
  /** 当前状态 */
  status: 'parsing' | 'indexing' | 'completed' | 'failed';
  /** 状态消息 */
  message?: string;
}

/**
 * 解析后的文档分块（存储在 Meilisearch 中）
 */
export interface ParsedChunk {
  /** 分块ID（唯一标识） */
  id: string;
  /** 文件ID（用于快速过滤和删除，与数据库 fileId 一致） */
  fileId?: string;
  /** 原文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 文本内容 */
  content: string;
  /** 页码范围（如果适用） */
  pageRange?: string;
  /** 总页数（如果适用） */
  totalPages?: number;
  /** 分块索引 */
  chunkIndex: number;
  /** 总分块数 */
  totalChunks: number;
  /** 文件路径 */
  filePath: string;
  /** 创建时间 */
  createdAt: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

