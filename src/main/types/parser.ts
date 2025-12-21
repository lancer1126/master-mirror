/**
 * 文件解析器类型定义
 */

/**
 * 解析后的文档分块
 */
export interface ParsedChunk {
  /** 分块ID（唯一标识） */
  id: string;
  /** 文件ID（用于快速过滤和删除，与数据库 fileId 一致，由上传模块填充） */
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

/**
 * 解析进度信息
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
 * 解析结果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean;
  /** 文件名 */
  fileName: string;
  /** 解析的文档分块 */
  chunks: ParsedChunk[];
  /** 总页数/总行数等 */
  total: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 文件解析器接口
 */
export interface IFileParser {
  /**
   * 支持的文件扩展名
   */
  readonly supportedExtensions: string[];

  /**
   * 解析文件
   * @param filePath 文件路径
   * @param options 解析选项
   * @param progressCallback 进度回调
   */
  parse(
    filePath: string,
    options?: ParseOptions,
    progressCallback?: (progress: ParseProgress) => void,
  ): Promise<ParseResult>;
}

/**
 * 解析选项
 */
export interface ParseOptions {
  /** 每个分块的大小（页数、行数等） */
  chunkSize?: number;
  /** 最大分块数（防止文件过大） */
  maxChunks?: number;
  /** 是否提取元数据 */
  extractMetadata?: boolean;
}

