<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    :width="700"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="detail-content">
      <div class="detail-scroll">
        <!-- 文件信息 -->
        <div v-if="file" class="file-info-header">
          <div class="file-title-row">
            <a-tag color="blue">{{ file.matchCount }} 处匹配</a-tag>
            <a-tag color="success">{{ file.fileType.toUpperCase() }}</a-tag>
          </div>
          <div class="file-path-row" @click="handleShowInFolder">
            <folder-open-outlined class="path-icon" />
            <span class="path-text">{{ file.filePath }}</span>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <a-spin tip="正在加载详细匹配内容..." />
        </div>

        <!-- 匹配列表 -->
        <div v-else-if="file && file.matches && file.matches.length > 0" class="matches-container">
          <div v-for="(match, index) in file.matches" :key="match.id" class="match-item">
            <div class="match-header">
              <span class="match-number">
                {{ index + 1 }}
              </span>
              <span v-if="match.pageRange" class="page-info">页数范围：{{ match.pageRange }}</span>
            </div>
            <div class="match-content" v-html="getFormattedContent(match)"></div>
          </div>
        </div>

        <!-- 空状态 -->
        <a-empty v-else description="暂无匹配内容" />
      </div>

      <div v-if="!loading && file && totalChunkHits > CHUNK_PAGE_SIZE" class="pagination-container">
        <a-pagination
          size="small"
          :current="currentPage"
          :page-size="CHUNK_PAGE_SIZE"
          :show-size-changer="false"
          :total="totalChunkHits"
          @change="handlePageChange"
        />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { FolderOpenOutlined } from '@ant-design/icons-vue';
import type {
  DetailMatch,
  SearchDetailModalEmits,
  SearchDetailModalProps,
  SearchHit,
} from '@shared/types';
import { message } from 'ant-design-vue';
import { computed, ref, watch } from 'vue';

const CHUNK_PAGE_SIZE = 5;
const SNIPPET_RADIUS = 60;

const props = defineProps<SearchDetailModalProps>();
const emit = defineEmits<SearchDetailModalEmits>();

const loading = ref(false);
const totalChunkHits = ref(0);
const currentPage = ref(1);

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const modalTitle = computed(() => {
  return props.file ? `"${props.file.fileName}" 的搜索结果` : '搜索结果';
});

const searchKeyword = computed(() => props.searchQuery.trim());

const resetState = () => {
  totalChunkHits.value = 0;
  currentPage.value = 1;
  if (props.file) {
    props.file.matches = [];
    props.file.detailsLoaded = false;
  }
};

watch(
  () => props.open,
  (newVal) => {
    if (newVal && props.file) {
      loadPage(1, true);
    } else {
      resetState();
    }
  },
  { immediate: true },
);

watch(
  () => props.file,
  (newFile, oldFile) => {
    if (newFile !== oldFile) {
      resetState();
      if (props.open && newFile) {
        loadPage(1, true);
      }
    }
  },
);

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const buildSnippet = (
  content: string | undefined,
  position?: { start: number; length: number },
): string => {
  if (!content || content.length === 0) {
    return '无法加载内容片段';
  }

  if (!position) {
    const preview = content.slice(0, SNIPPET_RADIUS * 2);
    return (
      (preview.length < content.length ? `${escapeHtml(preview)}…` : escapeHtml(preview)) ||
      '无法加载内容片段'
    );
  }

  const snippetStart = Math.max(0, position.start - SNIPPET_RADIUS);
  const snippetEnd = Math.min(content.length, position.start + position.length + SNIPPET_RADIUS);
  const prefix = snippetStart > 0 ? '…' : '';
  const suffix = snippetEnd < content.length ? '…' : '';
  const snippet = content.slice(snippetStart, snippetEnd);

  const highlightStart = Math.max(0, position.start - snippetStart);
  const highlightEnd = Math.min(snippet.length, highlightStart + position.length);

  const before = escapeHtml(snippet.slice(0, highlightStart));
  const highlighted = escapeHtml(snippet.slice(highlightStart, highlightEnd));
  const after = escapeHtml(snippet.slice(highlightEnd));

  return `${prefix}${before}<mark>${highlighted}</mark>${after}${suffix}`;
};

const findKeywordPositions = (
  content: string,
  keyword: string,
): Array<{ start: number; length: number }> => {
  if (!keyword) {
    return [];
  }
  const positions: Array<{ start: number; length: number }> = [];
  let offset = 0;
  while (offset <= content.length - keyword.length) {
    const index = content.indexOf(keyword, offset);
    if (index === -1) {
      break;
    }
    positions.push({ start: index, length: keyword.length });
    offset = index + keyword.length;
  }
  return positions;
};

const resolvePositions = (
  hit: SearchHit,
  keyword: string,
): Array<{ start: number; length: number }> => {
  const content = hit.content || '';
  if (content && keyword) {
    const keywordPositions = findKeywordPositions(content, keyword);
    if (keywordPositions.length > 0) {
      return keywordPositions;
    }
  }
  return (
    hit._matchesPosition?.content?.map((pos) => ({
      start: pos.start,
      length: pos.length,
    })) || []
  );
};

const expandMatches = (hits: SearchHit[], keyword: string): DetailMatch[] => {
  const expanded: DetailMatch[] = [];

  hits.forEach((hit) => {
    const content = hit.content;
    const positions = resolvePositions(hit, keyword);

    if (positions && positions.length > 0) {
      positions.forEach((pos, idx) => {
        expanded.push({
          ...hit,
          id: `${hit.id}-m${idx}`,
          matchOccurrenceIndex: idx + 1,
          occurrencesInChunk: positions.length,
          snippet: buildSnippet(content, pos),
        });
      });
    } else {
      expanded.push({
        ...hit,
        id: `${hit.id}-m0`,
        matchOccurrenceIndex: 1,
        occurrencesInChunk: 1,
        snippet: hit._formatted?.content || buildSnippet(content),
      });
    }
  });

  return expanded;
};

const loadPage = async (page = 1, resetMatches = false) => {
  if (!props.file) {
    return;
  }

  if (resetMatches && props.file) {
    props.file.matches = [];
  }

  loading.value = true;

  try {
    const exactQuery = `"${props.searchQuery}"`;
    const result = await window.api.search.query(exactQuery, {
      filter: `fileId = "${props.file.fileId}"`,
      limit: CHUNK_PAGE_SIZE,
      offset: (page - 1) * CHUNK_PAGE_SIZE,
      includeContent: true,
      fetchAllHits: false,
    });

    if (result.success && result.data) {
      totalChunkHits.value = result.data.estimatedTotalHits || 0;
      currentPage.value = page;
      const expandedMatches = expandMatches(result.data.hits, searchKeyword.value);
      props.file.matches = expandedMatches;
      props.file.detailsLoaded = true;
    } else {
      message.error(result.error || '加载详情失败');
    }
  } catch (error) {
    console.error('加载文件详情失败:', error);
    message.error('加载详情失败');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  if (page === currentPage.value) return;
  loadPage(page, true);
};

const getFormattedContent = (match: DetailMatch): string => {
  return match.snippet || match._formatted?.content || '无法加载内容片段';
};

/**
 * 在文件管理器中显示文件
 */
const handleShowInFolder = async () => {
  if (!props.file) return;

  try {
    const result = await window.api.shell.showItemInFolder(props.file.filePath);
    if (!result.success) {
      message.error(result.error || '无法打开文件夹');
    }
  } catch (error) {
    console.error('打开文件夹失败:', error);
    message.error('打开文件夹失败');
  }
};

/**
 * 关闭弹窗
 */
const handleCancel = () => {
  visible.value = false;
};
</script>

<style scoped>
.detail-content {
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.detail-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 12px;
  margin-right: -12px;
  box-sizing: border-box;
}

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 文件信息 */
.file-info-header {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.file-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.file-path-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-path-row:hover {
  background: #e6f7ff;
}

.path-icon {
  font-size: 16px;
  color: #1890ff;
  flex-shrink: 0;
}

.path-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 匹配列表 */
.matches-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pagination-container {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 10px 0 0;
  margin-bottom: -8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #fff 40%);
}

.match-item {
  padding: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.match-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.match-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.match-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #97ccd5 0%, #aeddc3 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.page-info {
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.match-content {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.8;
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
  word-break: break-word;
}

/* 高亮样式 */
.match-content:deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

/* 滚动条样式 */
.detail-content::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
