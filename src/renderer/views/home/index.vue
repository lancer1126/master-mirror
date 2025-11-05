<template>
  <div class="home-container" :class="{ 'has-results': hasSearched }">
    <div class="search-wrapper" :class="{ 'search-active': hasSearched }">
      <div class="search-box" :class="{ 'search-box-hover': isHovered }">
        <a-input
          v-model:value="searchQuery"
          placeholder="搜索文档内容..."
          class="search-input"
          size="large"
          @mouseenter="isHovered = true"
          @mouseleave="isHovered = false"
          @pressEnter="handleSearch"
        >
          <template #suffix>
            <a-button type="text" :loading="searching" class="search-button" @click="handleSearch">
              <search-outlined />
            </a-button>
          </template>
        </a-input>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="hasSearched" class="results-container">
      <div v-if="searching" class="loading-wrapper">
        <a-spin size="large" tip="搜索中..." />
      </div>

      <div v-else-if="searchResults.length > 0" class="results-content">
        <!-- 搜索信息 -->
        <div class="results-header">
          <span class="results-count">
            找到 {{ totalResults }} 个结果，用时 {{ searchTime }}ms
          </span>
        </div>

        <!-- 结果列表 -->
        <div class="results-list">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="result-item"
            @click="handleOpenFile(item)"
          >
            <div class="result-header">
              <span class="file-name" v-html="getFormattedFileName(item)"></span>
              <span v-if="item.pageRange" class="page-range">{{ item.pageRange }}</span>
            </div>
            <div class="result-content" v-html="getFormattedContent(item)"></div>
            <div class="result-footer">
              <span class="file-type">{{ item.fileType }}</span>
              <span class="divider">•</span>
              <span class="file-path">{{ item.filePath }}</span>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="totalResults"
            :show-size-changer="false"
            :show-total="(total) => `共 ${total} 个结果`"
            @change="handlePageChange"
          />
        </div>
      </div>

      <a-empty v-else description="未找到相关结果" class="empty-state" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SearchOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

interface SearchHit {
  id: string;
  fileName: string;
  fileType: string;
  content: string;
  pageRange?: string;
  totalPages?: number;
  chunkIndex: number;
  totalChunks: number;
  filePath: string;
  createdAt: number;
  _formatted?: {
    content?: string;
    fileName?: string;
    [key: string]: any;
  };
  _matchesPosition?: Record<string, Array<{ start: number; length: number }>>;
}

const searchQuery = ref('');
const isHovered = ref(false);
const hasSearched = ref(false);
const searching = ref(false);

// 搜索结果
const searchResults = ref<SearchHit[]>([]);
const totalResults = ref(0);
const searchTime = ref(0);

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

/**
 * 执行搜索
 */
const handleSearch = async () => {
  const query = searchQuery.value.trim();

  if (!query) {
    message.warning('请输入搜索关键词');
    return;
  }

  // 立即触发搜索框上移动画
  hasSearched.value = true;
  searching.value = true;
  currentPage.value = 1;

  try {
    // 将查询词用引号包裹，实现精确短语匹配
    const exactQuery = `"${query}"`;
    console.log('精确搜索:', exactQuery);

    const result = await window.api.search.query(exactQuery, {
      limit: pageSize.value,
      offset: 0,
    });

    if (result.success && result.data) {
      searchResults.value = result.data.hits;
      totalResults.value = result.data.estimatedTotalHits;
      searchTime.value = result.data.processingTimeMs;
      console.log('搜索结果:', result.data);
    } else {
      message.error(result.error || '搜索失败');
      searchResults.value = [];
      totalResults.value = 0;
    }
  } catch (error) {
    console.error('搜索错误:', error);
    message.error('搜索过程中出现错误');
    searchResults.value = [];
    totalResults.value = 0;
  } finally {
    searching.value = false;
  }
};

/**
 * 页码改变
 */
const handlePageChange = async (page: number) => {
  const query = searchQuery.value.trim();
  if (!query) return;

  searching.value = true;

  try {
    // 使用精确匹配
    const exactQuery = `"${query}"`;

    const result = await window.api.search.query(exactQuery, {
      limit: pageSize.value,
      offset: (page - 1) * pageSize.value,
    });

    if (result.success && result.data) {
      searchResults.value = result.data.hits;
      searchTime.value = result.data.processingTimeMs;

      // 滚动到顶部
      document.querySelector('.results-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (error) {
    console.error('加载分页错误:', error);
    message.error('加载失败');
  } finally {
    searching.value = false;
  }
};

/**
 * 打开文件
 */
const handleOpenFile = (item: SearchHit) => {
  console.log('打开文件:', item);
  // TODO: 实现文件打开逻辑
};

/**
 * 获取格式化的文件名（带高亮）
 */
const getFormattedFileName = (item: SearchHit): string => {
  // 优先使用格式化后的文件名（包含高亮）
  if (item._formatted?.fileName) {
    return item._formatted.fileName;
  }
  return item.fileName;
};

/**
 * 获取格式化的内容（带高亮和裁剪）
 */
const getFormattedContent = (item: SearchHit): string => {
  // 优先使用格式化后的内容（已裁剪到匹配位置附近）
  if (item._formatted?.content) {
    return item._formatted.content;
  }

  // 降级方案：使用原始内容的前200个字符
  const maxLength = 200;
  if (item.content.length <= maxLength) {
    return item.content;
  }
  return item.content.substring(0, maxLength) + '...';
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
  padding-top: calc(50vh - 100px);
}

.home-container.has-results {
  /* 搜索后：固定在顶部 */
  padding-top: 40px;
}

.search-wrapper {
  width: 100%;
  max-width: 600px;
  padding: 0 24px;
  transition: margin-bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 0;
}

.search-wrapper.search-active {
  margin-bottom: 32px;
}

.search-box {
  transition: all 0.3s ease;
}

.search-box-hover {
  transform: translateY(-2px);
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
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 50%;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff !important;
}

.search-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 搜索结果容器 */
.results-container {
  width: 100%;
  max-width: 800px;
  padding: 0 24px;
  flex: 1;
  overflow-y: auto;
  animation: fadeIn 0.3s ease;
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

.results-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.results-header {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.results-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.result-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
  transform: translateY(-2px);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.page-range {
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.result-content {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* 高亮标记样式 */
.result-content:deep(mark),
.file-name:deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.result-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.file-type {
  text-transform: uppercase;
  font-weight: 500;
  color: #1890ff;
}

.divider {
  color: rgba(0, 0, 0, 0.25);
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.empty-state {
  padding: 60px 0;
}

/* 滚动条样式 */
.results-container::-webkit-scrollbar {
  width: 6px;
}

.results-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.results-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.results-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
