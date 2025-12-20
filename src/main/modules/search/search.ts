import { MEILISEARCH_CONFIG } from '@shared/config';
import { ipcMain } from 'electron';
import { MeiliSearch } from 'meilisearch';

import { meilisearchService } from './meilisearch';

/**
 * 搜索结果（与上传模块的ParsedChunk对应）
 */
export interface SearchHit {
  /** 分块ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 文本内容 */
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
  /** 搜索命中的文档 */
  hits: SearchHit[];
  /** 搜索耗时（毫秒） */
  processingTimeMs: number;
  /** 查询关键字 */
  query: string;
  /** 结果总数 */
  estimatedTotalHits: number;
}

/**
 * Meilisearch 客户端单例
 */
let meiliClient: MeiliSearch | null = null;

/**
 * 获取或创建 Meilisearch 客户端
 */
function getMeiliClient(): MeiliSearch {
  if (!meiliClient) {
    meiliClient = new MeiliSearch({
      host: meilisearchService.getUrl(),
      apiKey: meilisearchService.getMasterKey(),
    });
  }
  return meiliClient;
}

/**
 * 初始化索引（设置可搜索字段和排序规则）
 */
async function initializeIndex(): Promise<void> {
  const client = getMeiliClient();
  const index = client.index(MEILISEARCH_CONFIG.DEFAULT_INDEX);

  try {
    // 检查索引是否存在
    await index.getRawInfo();
    console.log('[Search] 索引已存在:', MEILISEARCH_CONFIG.DEFAULT_INDEX);
  } catch {
    // 索引不存在，创建新索引
    console.log('[Search] 创建新索引:', MEILISEARCH_CONFIG.DEFAULT_INDEX);
    await client.createIndex(MEILISEARCH_CONFIG.DEFAULT_INDEX, { primaryKey: 'id' });
  }

  // 配置可搜索的字段
  await index.updateSearchableAttributes(['fileName', 'content', 'filePath']);

  // 配置可过滤的字段
  await index.updateFilterableAttributes(['fileType', 'createdAt']);

  // 配置排序字段
  await index.updateSortableAttributes(['createdAt', 'fileName']);

  console.log('[Search] 索引配置完成');
}

/**
 * 搜索文档
 */
async function searchDocuments(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    filter?: string;
    sort?: string[];
  },
): Promise<SearchResult> {
  const client = getMeiliClient();
  const index = client.index(MEILISEARCH_CONFIG.DEFAULT_INDEX);

  const result = await index.search<SearchHit>(query, {
    limit: options?.limit || 10,
    offset: options?.offset || 0,
    filter: options?.filter,
    sort: options?.sort,
    // 只返回必要的字段，排除完整的 content 字段以节省性能
    attributesToRetrieve: [
      'id',
      'fileName',
      'fileType',
      'pageRange',
      'totalPages',
      'chunkIndex',
      'totalChunks',
      'filePath',
      'createdAt',
    ],
    attributesToCrop: ['content'], // 启用内容裁剪和高亮
    cropLength: 50, // 裁剪长度：匹配位置前后的字符数
    cropMarker: '...', // 裁剪标记
    attributesToHighlight: ['content', 'fileName'],
    highlightPreTag: '<mark>', // 高亮开始标签
    highlightPostTag: '</mark>', // 高亮结束标签
    showMatchesPosition: true, // 显示匹配位置
  });

  return {
    hits: result.hits,
    processingTimeMs: result.processingTimeMs,
    query: result.query || query,
    estimatedTotalHits: result.estimatedTotalHits || 0,
  };
}

/**
 * 获取索引统计信息
 */
async function getIndexStats(): Promise<{
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
}> {
  const client = getMeiliClient();
  const index = client.index(MEILISEARCH_CONFIG.DEFAULT_INDEX);

  const stats = await index.getStats();

  return {
    numberOfDocuments: stats.numberOfDocuments,
    isIndexing: stats.isIndexing,
    fieldDistribution: stats.fieldDistribution,
  };
}

/**
 * 清空索引
 */
async function clearIndex(): Promise<void> {
  const index = getMeiliClient().index(MEILISEARCH_CONFIG.DEFAULT_INDEX);

  const task = await index.deleteAllDocuments();
  console.log('[Search] 清空索引任务:', task.taskUid);
  console.log('[Search] 索引已清空');
}

/**
 * 注册搜索相关的 IPC 处理程序
 */
export function registerSearchHandlers(): void {
  // 初始化索引
  ipcMain.handle('search:init', async () => {
    try {
      await initializeIndex();
      return { success: true };
    } catch (error: any) {
      console.error('[Search] 初始化索引失败:', error);
      return { success: false, error: error.message };
    }
  });


  // 搜索
  ipcMain.handle(
    'search:query',
    async (
      _event,
      query: string,
      options?: {
        limit?: number;
        offset?: number;
        filter?: string;
        sort?: string[];
      },
    ) => {
      try {
        const result = await searchDocuments(query, options);
        return { success: true, data: result };
      } catch (error: any) {
        console.error('[Search] 搜索失败:', error);
        return { success: false, error: error.message };
      }
    },
  );

  // 获取统计信息
  ipcMain.handle('search:stats', async () => {
    try {
      const stats = await getIndexStats();
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('[Search] 获取统计信息失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 清空索引
  ipcMain.handle('search:clear', async () => {
    try {
      await clearIndex();
      return { success: true };
    } catch (error: any) {
      console.error('[Search] 清空索引失败:', error);
      return { success: false, error: error.message };
    }
  });
}

