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

      <div v-else-if="groupedFiles.length > 0" class="results-content">
        <!-- 搜索信息 -->
        <div class="results-header">
          <span class="results-count">
            找到 {{ groupedFiles.length }} 个文件，共 {{ totalResults }} 处匹配，用时
            {{ searchTime }}ms
          </span>
        </div>

        <!-- 文件列表（按文件分组） -->
        <div class="results-list">
          <search-result-item
            v-for="file in groupedFiles"
            :key="file.fileName"
            :file="file"
            @click="handleOpenFileDetail"
            @show-in-folder="handleShowInFolder"
          />
        </div>

        <!-- 分页 -->
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
      </div>

      <a-empty v-else description="未找到相关结果" class="empty-state" />
    </div>

    <!-- 搜索详情弹窗 -->
    <search-detail-modal
      v-model:open="detailModalVisible"
      :file-name="selectedFile?.fileName || ''"
      :file-path="selectedFile?.filePath || ''"
      :matches="selectedFile?.matches || []"
      :total-pages="selectedFile?.totalPages"
    />
  </div>
</template>

<script setup lang="ts">
import { SearchOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { computed } from 'vue';

import SearchDetailModal from '@/components/SearchDetailModal.vue';
import SearchResultItem from '@/components/SearchResultItem.vue';

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

interface GroupedFile {
  fileName: string;
  filePath: string;
  fileType: string;
  totalPages?: number;
  matchCount: number;
  matches: SearchHit[];
}

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

// 详情弹窗
const detailModalVisible = ref(false);
const selectedFile = ref<GroupedFile | null>(null);

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

    // 获取所有匹配的chunks（设置较大的limit）
    const result = await window.api.search.query(exactQuery, {
      limit: 500, // 获取足够多的结果
      offset: 0,
    });

    if (result.success && result.data) {
      searchResults.value = result.data.hits;
      totalResults.value = result.data.estimatedTotalHits;
      searchTime.value = result.data.processingTimeMs;

      // 按文件名分组
      groupFilesByName(result.data.hits);
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
 * 按文件名分组
 */
const groupFilesByName = (hits: SearchHit[]) => {
  const fileMap = new Map<string, GroupedFile>();

  hits.forEach((hit) => {
    if (!fileMap.has(hit.fileName)) {
      fileMap.set(hit.fileName, {
        fileName: hit.fileName,
        filePath: hit.filePath,
        fileType: hit.fileType,
        totalPages: hit.totalPages,
        matchCount: 0,
        matches: [],
      });
    }

    const file = fileMap.get(hit.fileName)!;
    file.matchCount++;
    file.matches.push(hit);
  });

  // 按匹配数量降序排序
  allGroupedFiles.value = Array.from(fileMap.values()).sort((a, b) => b.matchCount - a.matchCount);
  totalFileCount.value = allGroupedFiles.value.length;

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
  document.querySelector('.results-container')?.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * 打开文件详情（显示所有匹配）
 */
const handleOpenFileDetail = (file: GroupedFile) => {
  selectedFile.value = file;
  detailModalVisible.value = true;
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
  margin-bottom: 24px;
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
  gap: 8px;
}

.results-header {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.results-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
