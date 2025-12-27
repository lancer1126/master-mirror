import type { IndexStats, SearchHit, SearchOptions, SearchResult } from '@shared/types';
import { message } from 'ant-design-vue';
import { computed, ref } from 'vue';

/**
 * Meilisearch 搜索功能 Composable
 */
export function useSearch() {
  // 搜索关键字
  const searchQuery = ref('');

  // 搜索结果
  const searchResults = ref<SearchHit[]>([]);

  // 搜索加载状态
  const isSearching = ref(false);

  // 搜索耗时
  const searchTime = ref(0);

  // 结果总数
  const totalHits = ref(0);

  // 索引统计信息
  const indexStats = ref<IndexStats | null>(null);

  // 是否有结果
  const hasResults = computed(() => searchResults.value.length > 0);

  // 是否为空查询
  const isEmptyQuery = computed(() => searchQuery.value.trim() === '');

  /**
   * 初始化索引
   */
  const initIndex = async (): Promise<boolean> => {
    try {
      const result = await window.api.search.init();
      if (result.success) {
        console.log('[useSearch] 索引初始化成功');
        return true;
      } else {
        message.error(`索引初始化失败: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('[useSearch] 索引初始化失败:', error);
      message.error(`索引初始化失败: ${error.message}`);
      return false;
    }
  };


  /**
   * 搜索
   */
  const search = async (query?: string, options?: SearchOptions): Promise<SearchResult | null> => {
    const queryText = query || searchQuery.value;

    if (!queryText.trim()) {
      searchResults.value = [];
      totalHits.value = 0;
      return null;
    }

    isSearching.value = true;

    try {
      const result = await window.api.search.query(queryText, options);

      if (result.success && result.data) {
        searchResults.value = result.data.hits;
        searchTime.value = result.data.processingTimeMs;
        totalHits.value = result.data.estimatedTotalHits;

        console.log(
          `[useSearch] 搜索完成: "${queryText}", 找到 ${result.data.hits.length} 个结果, 耗时 ${result.data.processingTimeMs}ms`,
        );

        return result.data;
      } else {
        message.error(`搜索失败: ${result.error}`);
        return null;
      }
    } catch (error: any) {
      console.error('[useSearch] 搜索失败:', error);
      message.error(`搜索失败: ${error.message}`);
      return null;
    } finally {
      isSearching.value = false;
    }
  };

  /**
   * 清空搜索结果
   */
  const clearResults = () => {
    searchQuery.value = '';
    searchResults.value = [];
    searchTime.value = 0;
    totalHits.value = 0;
  };

  /**
   * 获取索引统计信息
   */
  const getStats = async (): Promise<IndexStats | null> => {
    try {
      const result = await window.api.search.stats();
      if (result.success && result.data) {
        indexStats.value = result.data;
        return result.data;
      } else {
        message.error(`获取统计信息失败: ${result.error}`);
        return null;
      }
    } catch (error: any) {
      console.error('[useSearch] 获取统计信息失败:', error);
      message.error(`获取统计信息失败: ${error.message}`);
      return null;
    }
  };

  /**
   * 清空索引
   */
  const clearIndex = async (): Promise<boolean> => {
    try {
      const result = await window.api.search.clear();
      if (result.success) {
        message.success('索引已清空');
        clearResults();
        return true;
      } else {
        message.error(`清空索引失败: ${result.error}`);
        return false;
      }
    } catch (error: any) {
      console.error('[useSearch] 清空索引失败:', error);
      message.error(`清空索引失败: ${error.message}`);
      return false;
    }
  };

  return {
    // 状态
    searchQuery,
    searchResults,
    isSearching,
    searchTime,
    totalHits,
    indexStats,
    hasResults,
    isEmptyQuery,

    // 方法
    initIndex,
    search,
    clearResults,
    getStats,
    clearIndex,
  };
}

