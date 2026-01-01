<template>
  <div class="file-item" @click="handleClick">
    <div class="file-header">
      <div class="file-title">
        <span class="file-name">{{ file.fileName }}</span>
        <a-tag color="blue" class="match-badge">{{ matchDescription }}</a-tag>
      </div>
      <a-tag color="success">{{ file.fileType.toUpperCase() }}</a-tag>
    </div>
    <div class="file-preview" v-html="preview"></div>
    <div class="file-footer">
      <span class="file-path" @click.stop="handleShowFolder">
        <folder-open-outlined class="folder-icon" />
        {{ file.filePath }}
      </span>
      <span v-if="file.totalPages" class="page-info">共 {{ file.totalPages }} 页</span>
    </div>

    <!-- 详情弹窗 -->
    <search-detail-modal
      v-model:open="detailModalVisible"
      :file="file"
      :search-query="searchQuery"
    />
  </div>
</template>

<script setup lang="ts">
import { FolderOpenOutlined } from '@ant-design/icons-vue';
import type { SearchResultItemEmits, SearchResultItemProps } from '@shared/types';
import { computed, ref } from 'vue';

import SearchDetailModal from './SearchDetailModal.vue';

const props = defineProps<SearchResultItemProps>();
const emit = defineEmits<SearchResultItemEmits>();

// 详情弹窗状态
const detailModalVisible = ref(false);

/**
 * 匹配描述（区分chunk数和匹配数）
 */
const matchDescription = computed(() => {
  return `${props.file.matchCount} 处匹配`;
});

/**
 * 获取预览内容（保留高亮标记）
 * 使用 previewChunk 而不是完整的 matches 列表
 */
const preview = computed(() => {
  const previewChunk = props.file.previewChunk;

  if (!previewChunk) return '';

  if (previewChunk._formatted?.content) {
    const htmlContent = previewChunk._formatted.content;
    const maxLength = 150;

    // 如果内容太长，截取但保留完整的标签
    if (htmlContent.length > maxLength) {
      return htmlContent.substring(0, maxLength) + '...';
    }

    return htmlContent;
  }

  // 如果没有格式化内容，返回空（通常不会发生）
  return '';
});

/**
 * 点击卡片 - 打开详情弹窗
 */
const handleClick = () => {
  detailModalVisible.value = true;
};

/**
 * 点击文件夹图标
 */
const handleShowFolder = () => {
  emit('showInFolder', props.file.filePath);
};
</script>

<style scoped>
.file-item {
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.file-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-badge {
  flex-shrink: 0;
}

.file-preview {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 高亮搜索关键词 */
.file-preview:deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.file-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12px;
  cursor: pointer;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 16px;
}

.file-path:hover {
  color: #1890ff;
}

.folder-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.page-info {
  flex-shrink: 0;
}
</style>
