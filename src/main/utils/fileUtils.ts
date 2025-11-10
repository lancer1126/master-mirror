/**
 * 文件处理相关工具函数
 */

import { createHash } from 'crypto';

/**
 * 生成文件哈希值（用于生成唯一且符合Meilisearch规范的ID）
 * 使用MD5哈希生成唯一标识，避免中文字符问题
 *
 * @param filePath 文件路径
 * @param length 哈希长度，默认16位
 * @returns 文件哈希值
 */
export function generateFileHash(filePath: string, length: number = 16): string {
  // 使用MD5哈希生成唯一标识
  const hash = createHash('md5').update(filePath).digest('hex');
  // 只取指定长度，默认16位足够唯一
  return hash.substring(0, length);
}

/**
 * 生成文档分块的唯一ID
 *
 * @param filePath 文件路径
 * @param chunkIndex 分块索引
 * @returns 分块ID
 */
export function generateChunkId(filePath: string, chunkIndex: number): string {
  const fileHash = generateFileHash(filePath);
  return `${fileHash}_chunk_${chunkIndex}`;
}

