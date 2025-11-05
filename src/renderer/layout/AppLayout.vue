<template>
  <div
    class="app-layout"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <header class="app-header">
      <div class="header-content">
        <div class="logo"></div>
        <div class="header-actions">
          <a-button class="action-btn">上传</a-button>
          <a-button class="action-btn">历史</a-button>
          <a-button type="text" class="action-btn" @click="showSettings">
            <template #icon>
              <SettingOutlined />
            </template>
          </a-button>
        </div>
      </div>
    </header>

    <!-- 通知列表 -->
    <notification-list />

    <main class="app-main">
      <router-view />
    </main>

    <!-- 设置弹窗 -->
    <settings-modal v-model:open="settingsVisible" />

    <!-- 拖拽上传遮罩 -->
    <upload-overlay :visible="isDragging" />
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';

import NotificationList from '@/components/NotificationList.vue';
import SettingsModal from '@/components/SettingsModal.vue';
import UploadOverlay from '@/components/UploadOverlay.vue';
import { useNotifications } from '@/composables/useNotifications';

const settingsVisible = ref(false);
const isDragging = ref(false);
let dragCounter = 0; // 用于处理嵌套元素的拖拽事件

const { error: showError } = useNotifications();
let meilisearchErrorId: string | null = null;

const showSettings = () => {
  settingsVisible.value = true;
};

// 监听 Meilisearch 状态
onMounted(async () => {
  // 1. 先主动查询一次状态（处理组件挂载前已发送的消息）
  try {
    const status = await window.api.meilisearch.getStatus();
    if (status && status.status === 'error') {
      meilisearchErrorId = showError('搜索服务启动失败', status.message);
    }
  } catch (error) {
    console.error('获取 Meilisearch 状态失败:', error);
  }

  // 2. 然后监听后续的状态变化
  const unsubscribe = window.ipcRenderer.onMeilisearchStatus((status) => {
    if (status.status === 'error') {
      // 如果已有错误通知，先移除
      if (meilisearchErrorId) {
        const { removeNotification } = useNotifications();
        removeNotification(meilisearchErrorId);
      }
      // 显示新的错误通知
      meilisearchErrorId = showError('搜索服务启动失败', status.message);
    } else if (status.status === 'success' && meilisearchErrorId) {
      // 成功时移除错误通知
      const { removeNotification } = useNotifications();
      removeNotification(meilisearchErrorId);
      meilisearchErrorId = null;
    }
  });

  // 组件卸载时取消监听
  onUnmounted(() => {
    unsubscribe();
  });
});

// 拖拽进入
const handleDragEnter = (e: DragEvent) => {
  dragCounter++;
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true;
  }
};

// 拖拽经过
const handleDragOver = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

// 拖拽离开
const handleDragLeave = () => {
  dragCounter--;
  if (dragCounter === 0) {
    isDragging.value = false;
  }
};

// 文件放置
const handleDrop = async (e: DragEvent) => {
  dragCounter = 0;
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  // 获取文件路径
  const filePaths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // @ts-ignore - Electron 环境下 File 对象有 path 属性
    if (file.path) {
      // @ts-ignore
      filePaths.push(file.path);
    }
  }

  if (filePaths.length === 0) {
    message.warning('未检测到有效文件');
    return;
  }

  // 上传文件
  try {
    message.loading({ content: '正在上传文件...', key: 'upload', duration: 0 });
    const result = await window.api.upload.files(filePaths);

    if (result.success && result.data) {
      const { success, failed } = result.data;
      message.destroy('upload');

      if (failed.length === 0) {
        message.success(`成功上传 ${success.length} 个文件`);
      } else {
        message.warning(`上传完成：成功 ${success.length} 个，失败 ${failed.length} 个`);
      }
    } else {
      message.destroy('upload');
      message.error(result.error || '文件上传失败');
    }
  } catch (error) {
    message.destroy('upload');
    message.error('文件上传失败');
    console.error('上传错误:', error);
  }
};
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #f5f5f5;
  padding: 0 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  transition: all 0.3s;
}

.action-btn:hover {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.06);
}

.app-main {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
}
</style>
