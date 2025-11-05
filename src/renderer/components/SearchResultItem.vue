<template>
  <div class="file-item" @click="handleClick">
    <div class="file-header">
      <div class="file-title">
        <span class="file-name">{{ file.fileName }}</span>
        <a-tag color="blue" class="match-badge">{{ file.matchCount }} 处匹配</a-tag>
      </div>
      <a-tag color="success">{{ file.fileType.toUpperCase() }}</a-tag>
    </div>
    <div class="file-preview">{{ preview }}</div>
    <div class="file-footer">
      <span class="file-path" @click.stop="handleShowFolder">
        <folder-open-outlined class="folder-icon" />
        {{ file.filePath }}
      </span>
      <span v-if="file.totalPages" class="page-info">共 {{ file.totalPages }} 页</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpenOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';

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
}

interface GroupedFile {
  fileName: string;
  filePath: string;
  fileType: string;
  totalPages?: number;
  matchCount: number;
  matches: SearchHit[];
}

interface Props {
  file: GroupedFile;
}

interface Emits {
  (e: 'click', file: GroupedFile): void;
  (e: 'showInFolder', filePath: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

/**
 * 获取预览内容
 */
const preview = computed(() => {
  if (props.file.matches.length === 0) return '';

  const firstMatch = props.file.matches[0];

  if (firstMatch._formatted?.content) {
    const text = firstMatch._formatted.content.replace(/<\/?mark>/g, '');
    const maxLength = 100;
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
  }

  const maxLength = 100;
  const content = firstMatch.content;
  return content.length <= maxLength ? content : content.substring(0, maxLength) + '...';
});

/**
 * 点击卡片
 */
const handleClick = () => {
  emit('click', props.file);
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
