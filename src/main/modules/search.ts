import { ipcMain } from 'electron';
import { MeiliSearch } from 'meilisearch';

import { meilisearchService } from './meilisearch';

/**
 * 文件索引文档结构
 */
export interface FileDocument {
  /** 文件唯一ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 文件完整路径 */
  filePath: string;
  /** 文件内容（可选，用于全文搜索） */
  content?: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件类型/扩展名 */
  fileType: string;
  /** 上传时间戳 */
  uploadTime: number;
  /** 文件修改时间戳 */
  modifiedTime: number;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 搜索命中的文档 */
  hits: FileDocument[];
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
 * 索引名称
 */
const INDEX_NAME = 'files';

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
  const index = client.index(INDEX_NAME);

  try {
    // 检查索引是否存在
    await index.getRawInfo();
    console.log('[Search] 索引已存在:', INDEX_NAME);
  } catch {
    // 索引不存在，创建新索引
    console.log('[Search] 创建新索引:', INDEX_NAME);
    await client.createIndex(INDEX_NAME, { primaryKey: 'id' });
  }

  // 配置可搜索的字段
  await index.updateSearchableAttributes(['fileName', 'content', 'filePath']);

  // 配置可过滤的字段
  await index.updateFilterableAttributes(['fileType', 'uploadTime']);

  // 配置排序字段
  await index.updateSortableAttributes(['uploadTime', 'fileName', 'fileSize']);

  console.log('[Search] 索引配置完成');
}

/**
 * 添加文档到索引
 */
async function addDocuments(documents: FileDocument[]): Promise<void> {
  const index = getMeiliClient().index(INDEX_NAME);

  const task = await index.addDocuments(documents);
  console.log('[Search] 添加文档任务:', task.taskUid);

  // 等待任务完成（简化版：不等待，异步处理）
  // 在实际使用中，Meilisearch 会在后台处理，不需要阻塞
  console.log('[Search] 文档添加完成, 数量:', documents.length);
}

/**
 * 更新文档
 */
async function updateDocuments(documents: FileDocument[]): Promise<void> {
  const index = getMeiliClient().index(INDEX_NAME);

  const task = await index.updateDocuments(documents);
  console.log('[Search] 文档更新任务:', task.taskUid);
  console.log('[Search] 文档更新完成, 数量:', documents.length);
}

/**
 * 删除文档
 */
async function deleteDocuments(documentIds: string[]): Promise<void> {
  const index = getMeiliClient().index(INDEX_NAME);

  const task = await index.deleteDocuments(documentIds);
  console.log('[Search] 文档删除任务:', task.taskUid);
  console.log('[Search] 文档删除完成, 数量:', documentIds.length);
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
  const index = client.index(INDEX_NAME);

  const result = await index.search<FileDocument>(query, {
    limit: options?.limit || 20,
    offset: options?.offset || 0,
    filter: options?.filter,
    sort: options?.sort,
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
  const index = client.index(INDEX_NAME);

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
  const index = getMeiliClient().index(INDEX_NAME);

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

  // 添加文档
  ipcMain.handle('search:addDocuments', async (_event, documents: FileDocument[]) => {
    try {
      await addDocuments(documents);
      return { success: true };
    } catch (error: any) {
      console.error('[Search] 添加文档失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新文档
  ipcMain.handle('search:updateDocuments', async (_event, documents: FileDocument[]) => {
    try {
      await updateDocuments(documents);
      return { success: true };
    } catch (error: any) {
      console.error('[Search] 更新文档失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除文档
  ipcMain.handle('search:deleteDocuments', async (_event, documentIds: string[]) => {
    try {
      await deleteDocuments(documentIds);
      return { success: true };
    } catch (error: any) {
      console.error('[Search] 删除文档失败:', error);
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

