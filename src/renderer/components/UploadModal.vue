<template>
  <a-modal
    v-model:open="visible"
    title="上传文件"
    :width="600"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="upload-modal-content">
      <!-- 上传区域 -->
      <a-upload-dragger
        v-model:file-list="fileList"
        :before-upload="handleBeforeUpload"
        :custom-request="handleCustomRequest"
        :multiple="true"
        :show-upload-list="true"
        @drop="handleDrop"
      >
        <p class="ant-upload-drag-icon">
          <inbox-outlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域进行收录</p>
        <p class="ant-upload-hint">支持单个或批量上传。支持的格式：PDF</p>
      </a-upload-dragger>

      <!-- 进度显示 -->
      <div v-if="progressMap.size > 0" class="progress-section">
        <a-divider>上传进度</a-divider>
        <div v-for="[fileName, progress] in progressMap" :key="fileName" class="progress-item">
          <div class="progress-info">
            <span class="file-name">{{ fileName }}</span>
            <span class="progress-status">{{ getStatusText(progress.status) }}</span>
          </div>
          <a-progress
            :percent="progress.percentage"
            :status="getProgressStatus(progress.status)"
            :show-info="true"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <a-button @click="handleCancel">
          {{ uploading ? '上传中...' : '关闭' }}
        </a-button>
        <a-button
          type="primary"
          :loading="uploading"
          :disabled="pendingFiles.length === 0 || uploading"
          @click="handleUpload"
        >
          {{ pendingFiles.length > 0 ? `确认上传 (${pendingFiles.length})` : '请选择文件' }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { InboxOutlined } from '@ant-design/icons-vue';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, ref, watch } from 'vue';

import { useFileUpload } from '@/composables/useFileUpload';
import type { FileProgress, UploadModalEmits, UploadModalProps } from '@/types';

const props = defineProps<UploadModalProps>();
const emit = defineEmits<UploadModalEmits>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

// 使用上传 Hook
const { uploading, progressMap, uploadFileObjects } = useFileUpload();

// 待上传的文件列表
const fileList = ref<any[]>([]);
const pendingFiles = ref<File[]>([]);

/**
 * 上传前的处理
 */
const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
  // 检查文件类型
  const isPDF = file.type === 'application/pdf';
  if (!isPDF) {
    message.error(`${file.name} 不是PDF文件`);
    return false;
  }

  // 添加到待上传列表
  pendingFiles.value.push(file as File);

  // 返回 false 阻止自动上传
  return false;
};

/**
 * 自定义上传请求（阻止默认行为）
 */
const handleCustomRequest = () => {
  // 什么都不做，由确认按钮触发上传
};

/**
 * 处理拖放事件
 */
const handleDrop = (e: DragEvent) => {
  console.log('Modal内拖放文件:', e.dataTransfer?.files);
};

/**
 * 获取进度状态文本
 */
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    parsing: '解析中',
    indexing: '索引中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[status] || status;
};

/**
 * 获取进度条状态
 */
const getProgressStatus = (status: string): 'success' | 'exception' | 'normal' | 'active' => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'exception';
  return 'active';
};

/**
 * 执行上传
 */
const handleUpload = async () => {
  if (pendingFiles.value.length === 0) {
    message.warning('请先选择文件');
    return;
  }

  // 保存当前待上传文件列表的副本
  const filesToUpload = [...pendingFiles.value];

  // 立即清空待上传列表和文件列表，允许用户继续选择新文件
  pendingFiles.value = [];
  fileList.value = [];

  const result = await uploadFileObjects(filesToUpload, {
    showLoading: false, // Modal内部显示进度，不使用全局loading
    showSuccess: true,
    onProgress: (progress: FileProgress) => {
      // 进度已经通过 progressMap 响应式更新
      console.log('上传进度:', progress);
    },
  });

  console.log('上传结果:', result);
};

/**
 * 取消/关闭弹窗
 */
const handleCancel = () => {
  if (uploading.value) {
    message.warning('正在上传中，请稍候...');
    return;
  }

  // 重置状态
  fileList.value = [];
  pendingFiles.value = [];
  progressMap.value.clear();

  visible.value = false;
};

/**
 * 监听弹窗关闭，重置状态
 */
watch(visible, (newVal) => {
  if (!newVal && !uploading.value) {
    fileList.value = [];
    pendingFiles.value = [];
    progressMap.value.clear();
  }
});
</script>

<style scoped>
.upload-modal-content {
  padding: 8px 0;
}

.progress-section {
  margin-top: 24px;
  max-height: 300px;
  overflow-y: auto;
}

.progress-item {
  margin-bottom: 20px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.file-name {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-status {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 8px;
}

.progress-message {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 滚动条样式 */
.progress-section::-webkit-scrollbar {
  width: 6px;
}

.progress-section::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.progress-section::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.progress-section::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
