<template>
  <div class="home-container" :class="{ 'has-results': hasSearched }">
    <div class="search-wrapper" :class="{ 'search-active': hasSearched }">
      <div v-show="!hasSearched" class="logo-wrapper">
        <img :src="logoSearch" alt="logo" class="logo-image" draggable="false" />
      </div>
      <div class="search-box" :class="{ 'search-box-hover': isHovered }">
        <a-input
          v-model:value="searchQuery"
          placeholder="搜索..."
          class="search-input"
          size="large"
          @mouseenter="isHovered = true"
          @mouseleave="isHovered = false"
          @pressEnter="handleSearch"
        >
          <template #suffix>
            <a-button type="text" :loading="searching" class="search-button" @click="handleSearch">
              <img :src="candyIcon" alt="search" class="search-icon" />
            </a-button>
          </template>
        </a-input>
      </div>
      <!-- 拖拽提示 -->
      <div v-show="!hasSearched" class="drag-hint">可直接拖拽文件到页面进行收录</div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="hasSearched" class="results-container">
      <div v-if="searching" class="loading-wrapper">
        <a-spin size="large" tip="搜索中..." />
      </div>

      <template v-else-if="groupedFiles.length > 0">
        <!-- 搜索信息 - 固定在顶部 -->
        <div class="results-header">
          <span class="results-count">
            找到 {{ groupedFiles.length }} 个文件，用时 {{ searchTime }} ms
          </span>
        </div>

        <!-- 可滚动的内容区域 -->
        <div class="results-content">
          <!-- 文件列表（按文件分组） -->
          <div class="results-list">
            <search-result-item
              v-for="file in groupedFiles"
              :key="file.fileId"
              :file="file"
              :search-query="searchQuery"
              @show-in-folder="handleShowInFolder"
            />
          </div>
        </div>

        <!-- 分页 - 固定在底部 -->
        <div v-if="totalPages > 1" class="pagination-wrapper">
          <a-pagination
            v-model:current="currentPage"
            :page-size="pageSize"
            :total="totalFileCount"
            :show-size-changer="false"
            :show-total="(total) => `共 ${total} 个文件`"
            @change="handlePageChange"
          />
        </div>
      </template>

      <a-empty v-else description="未找到相关结果" class="empty-state" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GroupedFile, SearchHit } from '@shared/types';
import { message } from 'ant-design-vue';
import { computed } from 'vue';

import candyIcon from '@/assets/icons/美食-棒棒糖.svg';
import logoSearch from '@/assets/logo/悠闲.svg';
import SearchResultItem from '@/components/SearchResultItem.vue';

const searchQuery = ref('');
const isHovered = ref(false);
const hasSearched = ref(false);
const searching = ref(false);

// 搜索结果（原始chunks）
const searchResults = ref<SearchHit[]>([]);
const totalResults = ref(0);
const searchTime = ref(0);

// 文件分组结果
const allGroupedFiles = ref<GroupedFile[]>([]);
const totalFileCount = ref(0);

// 分页
const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.ceil(totalFileCount.value / pageSize.value));

// 当前页的文件列表
const groupedFiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return allGroupedFiles.value.slice(start, end);
});

/**
 * 执行搜索
 */
const handleSearch = async () => {
  const query = searchQuery.value.trim();

  if (!query) {
    clearSearch();
    return;
  }

  // 立即触发搜索框上移动画
  hasSearched.value = true;
  searching.value = true;
  currentPage.value = 1;

  try {
    // 将查询词用引号包裹，实现精确短语匹配
    const exactQuery = `"${query}"`;
    console.log('搜索:', exactQuery);

    const result = await window.api.search.query(exactQuery);

    if (result.success && result.data) {
      searchResults.value = result.data.hits;
      totalResults.value = result.data.estimatedTotalHits;
      searchTime.value = result.data.processingTimeMs;

      // 使用 facets 按文件ID分组（优化版）
      groupFilesByFileIdWithFacets(result.data.hits, result.data.facetDistribution);
    } else {
      message.error(result.error || '搜索失败');
      searchResults.value = [];
      totalResults.value = 0;
      allGroupedFiles.value = [];
      totalFileCount.value = 0;
    }
  } catch (error) {
    console.error('搜索错误:', error);
    message.error('搜索过程中出现错误');
    searchResults.value = [];
    totalResults.value = 0;
    allGroupedFiles.value = [];
    totalFileCount.value = 0;
  } finally {
    searching.value = false;
  }
};

/**
 * 统计 chunk 的命中次数
 */
const getChunkMatchCount = (hit: SearchHit): number => {
  const contentMatches = hit._matchesPosition?.content;
  if (Array.isArray(contentMatches) && contentMatches.length > 0) {
    return contentMatches.length;
  }
  return 1;
};

/**
 * 使用 Facets 按文件ID分组（优化版）
 * 只保存每个文件的第一个 chunk 作为预览，匹配数按 chunk 中的实际命中次数累加
 */
const groupFilesByFileIdWithFacets = (
  hits: SearchHit[],
  facetDistribution?: { fileId?: Record<string, number> },
) => {
  const fileMap = new Map<string, GroupedFile>();
  const facets = facetDistribution?.fileId || {};

  // 遍历所有 hits，每个文件只保留第一个作为预览
  hits.forEach((hit) => {
    const fileKey = hit.fileId || hit.fileName;
    if (!fileKey) {
      return;
    }

    const chunkMatchCount = getChunkMatchCount(hit) || facets[fileKey] || 1;

    if (!fileMap.has(fileKey)) {
      fileMap.set(fileKey, {
        fileId: fileKey,
        fileName: hit.fileName,
        filePath: hit.filePath,
        fileType: hit.fileType,
        totalPages: hit.totalPages,
        matchCount: chunkMatchCount,
        previewChunk: hit,
        detailsLoaded: false,
      });
    } else {
      const existing = fileMap.get(fileKey);
      if (existing) {
        existing.matchCount += chunkMatchCount;
      }
    }
  });

  // 如果有文件在 facets 中但不在 hits 中（理论上不应该发生，但做个兜底）
  Object.entries(facets).forEach(([fileId]) => {
    if (!fileMap.has(fileId)) {
      console.warn(`文件 ${fileId} 在 facets 中但不在 hits 中`);
    }
  });

  allGroupedFiles.value = Array.from(fileMap.values());
  totalFileCount.value = allGroupedFiles.value.length;

  console.log('使用 Facets 优化后的文件分组:');
  console.log(
    allGroupedFiles.value.map((f) => ({
      fileId: f.fileId,
      fileName: f.fileName,
      matchCount: f.matchCount,
      hasPreview: !!f.previewChunk,
      detailsLoaded: f.detailsLoaded,
    })),
  );

  // 重置到第一页
  currentPage.value = 1;
};

/**
 * 页码改变
 */
const handlePageChange = (page: number) => {
  // 只是切换显示的文件列表页，不需要重新搜索
  currentPage.value = page;

  // 滚动到顶部
  document.querySelector('.results-content')?.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * 在文件管理器中显示文件
 */
const handleShowInFolder = async (filePath: string) => {
  try {
    const result = await window.api.shell.showItemInFolder(filePath);
    if (!result.success) {
      message.error(result.error || '无法打开文件夹');
    }
  } catch (error) {
    console.error('打开文件夹失败:', error);
    message.error('打开文件夹失败');
  }
};

/**
 * 清空搜索结果
 */
const clearSearch = () => {
  hasSearched.value = false;
  searching.value = false;
  currentPage.value = 1;
  searchResults.value = [];
  totalResults.value = 0;
  allGroupedFiles.value = [];
  totalFileCount.value = 0;
};
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  transition: padding-top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.home-container:not(.has-results) {
  /* 居中时：使用 calc 将搜索框推到中间 */
  padding-top: calc(57vh - 100px);
}

.home-container.has-results {
  /* 搜索后：固定在顶部 */
  padding-top: 40px;
}

.logo-wrapper {
  position: absolute;
  bottom: calc(100% + 24px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  transition: opacity 0.3s ease;
}

.logo-image {
  max-width: 240px;
  width: 60%;
  min-width: 160px;
  /* 预加载优化 */
  image-rendering: -webkit-optimize-contrast;
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  padding: 0 24px;
  transition: margin-bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 0;
}

.search-wrapper.search-active {
  margin-bottom: 8px;
}

.drag-hint {
  margin-top: 16px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
  text-align: center;
  transition: opacity 0.3s ease;
}

.search-box {
  transition: all 0.3s ease;
}

.search-input {
  border-radius: 24px;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.search-box-hover .search-input {
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(24, 144, 255, 0.3);
}

.search-input:deep(.ant-input) {
  background: #fff;
  border: none;
  font-size: 16px;
  padding: 12px 24px;
}

.search-input:deep(.ant-input-affix-wrapper) {
  background: #fff;
  border: none;
  padding: 12px 24px;
}

.search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  cursor: pointer;
}

.search-button:hover,
.search-button:focus,
.search-button:active {
  background: transparent !important;
  box-shadow: none !important;
}

.search-icon {
  width: 32px;
  height: 32px;
  transition: transform 0.3s ease;
  margin: 2px 4px 0 0;
}

.search-button:hover .search-icon {
  transform: scale(1.15);
}

/* 搜索结果容器 */
.results-container {
  width: 100%;
  max-width: 720px;
  padding: 0 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.3s ease;
  overflow: hidden; /* 防止整体滚动 */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

/* 搜索信息 - 固定在顶部 */
.results-header {
  padding: 10px 0;
  background: #f5f5f5;
  flex-shrink: 0; /* 不收缩 */
}

.results-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

/* 可滚动内容区域 */
.results-content {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 分页 - 固定在底部 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  background: #f5f5f5;
  flex-shrink: 0; /* 不收缩 */
}

.empty-state {
  padding: 60px 0;
}

/* 滚动条样式 */
.results-content::-webkit-scrollbar {
  width: 6px;
}

.results-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.results-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.results-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
