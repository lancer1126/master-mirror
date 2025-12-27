/**
 * 主进程类型定义
 * 主要在主进程中使用，但可能需要通过 IPC 传递给渲染进程
 */

import type { ParsedChunk, ParseProgress } from './common';

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

