import { MEILISEARCH_CONFIG } from '@shared/config';
import type { IndexStats, SearchHit, SearchOptions, SearchResult } from '@shared/types';
import { ipcMain } from 'electron';

import { getMeilisearchClient } from './meilisearch';

const DEFAULT_BATCH_SIZE = 500;

/**
 * 初始化索引（设置可搜索字段和排序规则）
 */
async function initializeIndex(): Promise<void> {
  const client = getMeilisearchClient();
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

  // 配置可过滤的字段（fileId 用于快速删除和过滤）
  await index.updateFilterableAttributes(['fileType', 'createdAt', 'fileId']);

  // 配置排序字段
  await index.updateSortableAttributes(['createdAt', 'fileName']);

  console.log('[Search] 索引配置完成');
}

/**
 * 搜索文档
 */
async function searchDocuments(query: string, options?: SearchOptions): Promise<SearchResult> {
  const client = getMeilisearchClient();
  const index = client.index(MEILISEARCH_CONFIG.DEFAULT_INDEX);
  const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;

  const baseParams = {
    filter: options?.filter,
    sort: options?.sort,
  };

  // 第一步：轻量查询，仅获取总命中数和 facets
  const countResult = await index.search<SearchHit>(query, {
    ...baseParams,
    limit: 0,
    offset: 0,
    facets: ['fileId'],
  });

  const totalHits = countResult.estimatedTotalHits || 0;
  if (totalHits === 0) {
    return {
      hits: [],
      processingTimeMs: countResult.processingTimeMs,
      query: countResult.query || query,
      estimatedTotalHits: 0,
      facetDistribution: countResult.facetDistribution,
    };
  }

  // 第二步：按照批次把所有命中的 chunk 全量取回
  const allHits: SearchHit[] = [];
  let offset = 0;
  let retrieved = 0;
  let totalProcessingTime = countResult.processingTimeMs || 0;
  const attributesToRetrieve = [
    'id',
    'fileId',
    'fileName',
    'fileType',
    'pageRange',
    'totalPages',
    'chunkIndex',
    'totalChunks',
    'filePath',
    'createdAt',
  ];

  if (options?.includeContent) {
    attributesToRetrieve.push('content');
  }

  const shouldFetchAll = options?.fetchAllHits !== false;
  const requestedLimit = options?.limit ?? batchSize;
  const requestedOffset = options?.offset ?? 0;

  const fetchBatch = async (limit: number, currentOffset: number) => {
    const batchResult = await index.search<SearchHit>(query, {
      ...baseParams,
      limit,
      offset: currentOffset,
      attributesToRetrieve,
      attributesToCrop: ['content'],
      cropLength: 50,
      cropMarker: '...',
      attributesToHighlight: ['content', 'fileName'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      showMatchesPosition: true,
    });

    totalProcessingTime += batchResult.processingTimeMs;
    allHits.push(...batchResult.hits);
    return batchResult.hits.length;
  };

  if (!shouldFetchAll) {
    await fetchBatch(requestedLimit, requestedOffset);
  } else {
    while (retrieved < totalHits) {
    const remaining = totalHits - retrieved;
    const currentLimit = Math.min(batchSize, remaining);

      const fetched = await fetchBatch(currentLimit, offset);
      retrieved += fetched;
      offset += currentLimit;

      if (fetched < currentLimit) {
        break;
      }
    }
  }

  console.log('[Search] 搜索结果:', {
    batches: shouldFetchAll ? Math.ceil(totalHits / batchSize) : 1,
    hits: allHits.length,
    estimatedTotal: totalHits,
    facets: countResult.facetDistribution?.fileId
      ? Object.keys(countResult.facetDistribution.fileId).length
      : 0,
  });

  return {
    hits: allHits,
    processingTimeMs: totalProcessingTime,
    query: countResult.query || query,
    estimatedTotalHits: totalHits,
    facetDistribution: countResult.facetDistribution,
  };
}

/**
 * 获取索引统计信息
 */
async function getIndexStats(): Promise<IndexStats> {
  const client = getMeilisearchClient();
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
  const index = getMeilisearchClient().index(MEILISEARCH_CONFIG.DEFAULT_INDEX);

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
  ipcMain.handle('search:query', async (_event, query: string, options?: SearchOptions) => {
    try {
      const result = await searchDocuments(query, options);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[Search] 搜索失败:', error);
      return { success: false, error: error.message };
    }
  });

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
