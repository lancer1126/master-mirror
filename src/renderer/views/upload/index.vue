<template>
  <div class="upload-container">
    <section class="upload-header">
      <div class="header-info">
        <h2 class="upload-title">文件收录</h2>
        <p class="upload-desc">支持拖拽或点击选择 PDF 文件，系统会自动解析并构建索引。</p>
      </div>
      <div class="header-actions">
        <a-button @click="handleClear" :disabled="!canClear">
          {{ uploading ? '上传中...' : '清空' }}
        </a-button>
        <a-button
          type="primary"
          :loading="uploading"
          :disabled="pendingFilesCount === 0 || uploading"
          @click="handleUpload"
        >
          {{ pendingFilesCount > 0 ? `确认上传 (${pendingFilesCount})` : '请选择文件' }}
        </a-button>
      </div>
    </section>

    <section class="upload-body">
      <a-upload-dragger
        v-model:file-list="fileList"
        class="upload-dragger"
        :before-upload="handleBeforeUpload"
        :custom-request="handleCustomRequest"
        :multiple="true"
        :show-upload-list="true"
        accept=".pdf"
        @drop="handleDrop"
      >
        <p class="ant-upload-drag-icon">
          <inbox-outlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域进行收录</p>
      </a-upload-dragger>

      <div v-if="progressEntries.length > 0" class="progress-section">
        <a-divider>上传进度</a-divider>
        <div v-for="[fileName, progress] in progressEntries" :key="fileName" class="progress-item">
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { InboxOutlined } from '@ant-design/icons-vue';
import type { ParseProgress } from '@shared/types';
import type { UploadFile, UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, ref } from 'vue';

import { useFileUpload } from '@/composables/useFileUpload';

const { uploading, progressMap, uploadFileObjects, reset } = useFileUpload();

const fileList = ref<UploadFile[]>([]);
const pendingFiles = ref<File[]>([]);

const pendingFilesCount = computed(() => pendingFiles.value.length);
const progressEntries = computed(() => Array.from(progressMap.value.entries()));
const canClear = computed(
  () =>
    pendingFiles.value.length > 0 || fileList.value.length > 0 || progressEntries.value.length > 0,
);

const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isPDF = file.type === 'application/pdf';

  if (!isPDF) {
    message.error(`${file.name} 不是 PDF 文件`);
    return false;
  }

  pendingFiles.value.push(file as File);

  return false;
};

const handleCustomRequest = () => {
  // 交由手动上传按钮处理
};

const handleDrop = (e: DragEvent) => {
  console.log('收录页拖放文件:', e.dataTransfer?.files);
};

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    parsing: '解析中',
    indexing: '索引中',
    completed: '已完成',
    failed: '失败',
  };

  return statusMap[status] || status;
};

const getProgressStatus = (status: string): 'success' | 'exception' | 'normal' | 'active' => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'exception';
  return 'active';
};

const handleUpload = async () => {
  if (pendingFiles.value.length === 0) {
    message.warning('请先选择文件');
    return;
  }

  const filesToUpload = [...pendingFiles.value];
  pendingFiles.value = [];
  fileList.value = [];

  await uploadFileObjects(filesToUpload, {
    showLoading: false,
    showSuccess: true,
    onProgress: (progress: ParseProgress) => {
      console.log('上传进度:', progress);
    },
  });
};

const handleClear = () => {
  if (uploading.value) {
    message.warning('正在上传中，请稍候...');
    return;
  }

  fileList.value = [];
  pendingFiles.value = [];
  reset();
};
</script>

<style scoped>
.upload-container {
  height: 100%;
  width: 70%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 24px 0;
  border-bottom: 1px solid #e8e8e8;
}

.header-info {
  flex: 1;
}

.upload-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.upload-desc {
  margin: 8px 0 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.upload-body {
  flex: 1;
  padding: 24px 0 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: auto;
}

.upload-dragger {
  background: #fff;
}

.upload-hints li {
  line-height: 1.6;
}

.progress-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  border: 1px solid #f0f0f0;
}

.progress-item {
  margin-bottom: 10px;
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
  margin-left: 12px;
}

.progress-section :deep(.ant-divider) {
  margin: 0 0 8px;
}

.progress-section :deep(.ant-progress) {
  margin-bottom: 8px;
}
</style>
