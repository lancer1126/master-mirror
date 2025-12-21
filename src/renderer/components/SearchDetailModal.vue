<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    :width="700"
    :footer="null"
    class="search-detail-modal"
    @cancel="handleCancel"
  >
    <div class="detail-content">
      <!-- 文件信息 -->
      <div v-if="file" class="file-info-header">
        <div class="file-title-row">
          <div class="file-stats">
            <a-tag color="blue">{{ file.matchCount }} 处匹配</a-tag>
            <a-tag v-if="file.totalPages" color="default">共 {{ file.totalPages }} 页</a-tag>
          </div>
        </div>
        <div class="file-path-row" @click="handleShowInFolder">
          <folder-open-outlined class="path-icon" />
          <span class="path-text">{{ file.filePath }}</span>
        </div>
      </div>

      <a-divider style="margin: 16px 0" />

      <!-- 匹配列表 -->
      <div v-if="file" class="matches-container">
        <div v-for="(match, index) in file.matches" :key="match.id" class="match-item">
          <div class="match-header">
            <span class="match-number">#{{ index + 1 }}</span>
            <span v-if="match.pageRange" class="page-info">{{ match.pageRange }}</span>
            <span class="chunk-info">分块 {{ match.chunkIndex + 1 }}/{{ match.totalChunks }}</span>
            <a-tag v-if="getMatchCountInChunk(match) > 1" color="orange" size="small">
              {{ getMatchCountInChunk(match) }} 次
            </a-tag>
          </div>
          <div class="match-content" v-html="getFormattedContent(match)"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <a-empty v-if="!file || file.matches.length === 0" description="暂无匹配内容" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { FolderOpenOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { computed } from 'vue';

import type { SearchDetailModalEmits, SearchDetailModalProps, SearchHit } from '@/types';

const props = defineProps<SearchDetailModalProps>();
const emit = defineEmits<SearchDetailModalEmits>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const modalTitle = computed(() => {
  return props.file ? `"${props.file.fileName}" 的搜索结果` : '搜索结果';
});

/**
 * 获取chunk中的实际匹配次数
 */
const getMatchCountInChunk = (match: SearchHit): number => {
  if (match._matchesPosition?.content && Array.isArray(match._matchesPosition.content)) {
    return match._matchesPosition.content.length;
  }
  return 1;
};

/**
 * 获取格式化的内容（带高亮）
 */
const getFormattedContent = (match: SearchHit): string => {
  if (match._formatted?.content) {
    return match._formatted.content;
  }
  return '无法加载内容片段';
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
  overflow-y: auto;
}

/* 文件信息 */
.file-info-header {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
}

.file-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.file-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16px;
}

.file-stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
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
  gap: 16px;
}

.match-item {
  padding: 16px;
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
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.page-info {
  font-size: 13px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 500;
}

.chunk-info {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.match-content {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.8;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 8px;
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

.match-footer {
  display: flex;
  justify-content: flex-end;
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
