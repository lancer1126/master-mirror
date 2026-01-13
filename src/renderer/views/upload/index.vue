<template>
  <div class="upload-container">
    <section class="upload-header">
      <div class="header-info">
        <h2 class="upload-title">文件收录</h2>
        <p class="upload-desc">选择文件或目录进行收录，系统会自动解析并构建索引。</p>
      </div>
      <div class="header-actions" v-if="pendingFilesCount > 0">
        <a-button @click="handleClear" :disabled="!canClear">
          {{ uploading ? '上传中...' : '清空' }}
        </a-button>
        <a-button
          type="primary"
          :loading="uploading"
          :disabled="pendingFilesCount === 0 || uploading"
          @click="handleUpload"
        >
          {{ `确认上传 (${pendingFilesCount})` }}
        </a-button>
      </div>
    </section>

    <section class="upload-body">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="file" tab="文件">
          <a-upload-dragger
            v-model:file-list="fileList"
            class="upload-dragger"
            :before-upload="handleBeforeUpload"
            :custom-request="handleCustomRequest"
            :multiple="true"
            :show-upload-list="true"
            accept=".pdf"
            @drop="handleDrop"
            @remove="handleRemove"
          >
            <p class="ant-upload-drag-icon">
              <inbox-outlined />
            </p>
            <p class="ant-upload-text">点击或拖拽文件到此区域进行收录</p>
          </a-upload-dragger>
        </a-tab-pane>
        <a-tab-pane key="folder" tab="目录">
          <div class="folder-upload-area" @click="handleFolderSelect">
            <p class="ant-upload-drag-icon">
              <folder-open-outlined />
            </p>
            <p class="ant-upload-text">点击选择目录</p>
            <p class="ant-upload-hint">将自动扫描目录下的所有可支持文件</p>
          </div>
          <!-- 文件夹模式下也显示文件列表，与文件模式共享 fileList -->
          <div v-if="activeTab === 'folder' && folderFileList.length > 0" class="file-list-preview">
            <a-list size="small" bordered :data-source="folderFileList">
              <template #renderItem="{ item }">
                <a-list-item>
                  <template #actions>
                    <a @click="handleRemove(item)">删除</a>
                  </template>
                  <a-list-item-meta :description="item.name">
                    <template #avatar>
                      <file-pdf-outlined />
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </a-tab-pane>
      </a-tabs>

      <div v-if="progressEntries.length > 0" class="progress-section">
        <a-divider>上传进度</a-divider>
        <div v-for="[fileName, progress] in progressEntries" :key="fileName">
          <div class="progress-info">
            <span class="file-name">{{ fileName }}</span>
            <span class="progress-status">{{ getStatusText(progress.status) }}</span>
          </div>
          <a-progress
            size="small"
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
import { FilePdfOutlined, FolderOpenOutlined, InboxOutlined } from '@ant-design/icons-vue';
import type { ParseProgress } from '@shared/types';
import type { UploadFile, UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, ref } from 'vue';

import { useFileUpload } from '@/composables/useFileUpload';

const { uploading, progressMap, uploadFiles, reset } = useFileUpload();

const activeTab = ref<'file' | 'folder'>('file');
const fileList = ref<UploadFile[]>([]);
const folderFileList = ref<UploadFile[]>([]);
// Store objects with name and path
interface PendingFile {
  uid: string;
  name: string;
  path: string;
}
const pendingFiles = ref<PendingFile[]>([]);

const pendingFilesCount = computed(() => pendingFiles.value.length);
const progressEntries = computed(() => Array.from(progressMap.value.entries()));
const canClear = computed(
  () =>
    pendingFiles.value.length > 0 ||
    fileList.value.length > 0 ||
    folderFileList.value.length > 0 ||
    progressEntries.value.length > 0,
);

const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isPDF) {
    message.error(`${file.name} 不是 PDF 文件`);
    return false; // Prevent upload
  }

  // Get path immediately
  const filePath = window.ipcRenderer.getPathForFile(file as File);
  if (filePath) {
    pendingFiles.value.push({
      uid: (file as any).uid,
      name: file.name,
      path: filePath,
    });
  }

  return false; // Prevent automatic upload
};

const handleCustomRequest = () => {
  // Handled manually
};

const handleDrop = (e: DragEvent) => {
  console.log('收录页拖放文件:', e.dataTransfer?.files);
};

const handleFolderSelect = async () => {
  try {
    const dirPath = await window.api.dialog.selectDirectory();
    if (!dirPath) return;

    const loadingMsg = message.loading('正在扫描目录...', 0);
    const result = await window.api.upload.scanDir(dirPath);
    loadingMsg();

    if (result.success && result.data) {
      const files = result.data;
      if (files.length === 0) {
        message.warning('该目录下没有可支持格式的文件');
        return;
      }

      let newCount = 0;
      files.forEach((filePath: string) => {
        const name = filePath.split(/[\\/]/).pop() || 'unknown.pdf';
        // Avoid duplicates based on path
        if (!pendingFiles.value.some((f) => f.path === filePath)) {
          const uid = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          pendingFiles.value.push({
            uid,
            name,
            path: filePath,
          });

          // Add to fileList for UI display if we are in folder mode
          // Note: fileList is shared, but a-upload manages it in file mode.
          // In folder mode, we manually push.
          folderFileList.value.push({
            uid,
            name,
            status: 'done',
            url: filePath,
          });
          newCount++;
        }
      });

      message.success(`已添加 ${newCount} 个文件`);
    } else {
      message.error(result.error || '扫描目录失败');
    }
  } catch (error: any) {
    message.error('选择目录失败: ' + error.message);
  }
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

const handleRemove = (file: UploadFile) => {
  // Remove from pendingFiles
  pendingFiles.value = pendingFiles.value.filter((f) => f.uid !== file.uid);

  // Also remove from fileList if we manually added it (folder mode)
  // or let a-upload handle it (file mode) - but we sync fileList with pendingFiles effectively
  const index = fileList.value.findIndex((f) => f.uid === file.uid);
  if (index !== -1) {
    fileList.value.splice(index, 1);
  }

  const folderIndex = folderFileList.value.findIndex((f) => f.uid === file.uid);
  if (folderIndex !== -1) {
    folderFileList.value.splice(folderIndex, 1);
  }
};

const handleUpload = async () => {
  if (pendingFiles.value.length === 0) {
    message.warning('请先选择文件');
    return;
  }

  const pathsToUpload = pendingFiles.value.map((f) => f.path);

  // Clear lists
  pendingFiles.value = [];
  fileList.value = [];
  folderFileList.value = [];

  await uploadFiles(pathsToUpload, {
    showLoading: false,
    showSuccess: true,
    onProgress: (progress: ParseProgress) => {
      console.log('上传进度:', progress);
    },
  });
};

const handleClear = () => {
  if (uploading.value) {
    message.warning('正在构建索引，请稍候...');
    return;
  }

  fileList.value = [];
  folderFileList.value = [];
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
  padding: 16px 0;
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
  padding: 2px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: auto;
}

.upload-dragger :deep(.ant-upload-drag) {
  height: 220px;
}

.upload-dragger :deep(.ant-upload-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 !important;
}

.folder-upload-area {
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.3s;
  text-align: center;
  height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.folder-upload-area:hover {
  border-color: #1890ff;
}

.ant-upload-drag-icon {
  margin-bottom: 20px;
  font-size: 48px;
  color: #40a9ff;
}
.ant-upload-text {
  margin-bottom: 0;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.85);
}
.ant-upload-hint {
  margin-top: 4px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

.file-list-preview {
  margin-top: 16px;
  background: #fff;
}

.progress-section {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #f0f0f0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
