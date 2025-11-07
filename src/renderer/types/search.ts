/**
 * 搜索相关的类型定义
 */

/**
 * 搜索命中结果
 */
export interface SearchHit {
  /** 分块ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 文本内容（完整 chunk，已不从后端返回，节省性能） */
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
  /** 格式化的内容（裁剪+高亮） */
  _formatted?: {
    content?: string; // 裁剪+高亮的片段（这是主要使用的字段）
    fileName?: string;
    [key: string]: any;
  };
  /** 匹配位置信息 */
  _matchesPosition?: Record<string, Array<{ start: number; length: number }>>;
}

/**
 * 按文件分组的搜索结果
 */
export interface GroupedFile {
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  filePath: string;
  /** 文件类型 */
  fileType: string;
  /** 总页数 */
  totalPages?: number;
  /** 匹配总次数 */
  matchCount: number;
  /** 匹配的分块列表 */
  matches: SearchHit[];
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 命中结果列表 */
  hits: SearchHit[];
  /** 搜索关键词 */
  query: string;
  /** 处理时间（毫秒） */
  processingTimeMs: number;
  /** 估计总命中数 */
  estimatedTotalHits: number;
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

