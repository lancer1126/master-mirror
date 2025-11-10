<template>
  <div
    class="app-layout"
    @dragenter.prevent="handleGlobalDragEnter"
    @dragover.prevent="handleGlobalDragOver"
    @dragleave.prevent="handleGlobalDragLeave"
    @drop.prevent="handleGlobalDrop"
  >
    <header class="app-header">
      <div class="header-content">
        <div class="logo"></div>
        <div class="header-actions">
          <a-button class="action-btn" @click="showUpload">上传</a-button>
          <a-button class="action-btn" @click="goToArchive">归档</a-button>
          <a-button type="text" class="action-btn" @click="showSettings">
            <template #icon>
              <setting-outlined />
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

    <!-- 上传弹窗 -->
    <upload-modal v-model:open="uploadVisible" />

    <!-- 全局拖拽上传遮罩 -->
    <upload-overlay :visible="isGlobalDragging" />
  </div>
</template>

<script setup lang="ts">
import { SettingOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import NotificationList from '@/components/NotificationList.vue';
import SettingsModal from '@/components/SettingsModal.vue';
import UploadModal from '@/components/UploadModal.vue';
import UploadOverlay from '@/components/UploadOverlay.vue';
import { useFileUpload } from '@/composables/useFileUpload';
import { useNotifications } from '@/composables/useNotifications';

const router = useRouter();
const route = useRoute();

// 判断是否在归档页
const isArchivePage = computed(() => route.path === '/archive');
// 弹窗状态
const settingsVisible = ref(false);
const uploadVisible = ref(false);

// 全局拖拽状态
const isGlobalDragging = ref(false);
let dragCounter = 0; // 用于处理嵌套元素的拖拽事件

// 使用上传 Hook
const { uploadFileObjects } = useFileUpload();

const { error: showError } = useNotifications();
let meilisearchErrorId: string | null = null;

/**
 * 显示设置弹窗
 */
const showSettings = () => {
  settingsVisible.value = true;
};

/**
 * 显示上传弹窗
 */
const showUpload = () => {
  uploadVisible.value = true;
};

/**
 * 切换归档页面
 * 如果不在归档页则进入归档页，如果已在归档页则跳转至首页
 */
const goToArchive = () => {
  if (isArchivePage.value) {
    router.push('/');
  } else {
    router.push('/archive');
  }
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

/**
 * 全局拖拽事件处理（仅在非Modal区域）
 */

// 全局拖拽进入
const handleGlobalDragEnter = (e: DragEvent) => {
  // 如果上传弹窗已打开，不处理全局拖拽
  if (uploadVisible.value) {
    return;
  }

  dragCounter++;
  if (e.dataTransfer?.types.includes('Files')) {
    isGlobalDragging.value = true;
  }
};

// 全局拖拽经过
const handleGlobalDragOver = (e: DragEvent) => {
  // 如果上传弹窗已打开，不处理全局拖拽
  if (uploadVisible.value) {
    return;
  }

  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

// 全局拖拽离开
const handleGlobalDragLeave = () => {
  // 如果上传弹窗已打开，不处理全局拖拽
  if (uploadVisible.value) {
    return;
  }

  dragCounter--;
  if (dragCounter === 0) {
    isGlobalDragging.value = false;
  }
};

// 全局文件放置
const handleGlobalDrop = async (e: DragEvent) => {
  dragCounter = 0;
  isGlobalDragging.value = false;

  // 如果上传弹窗已打开，不处理全局拖拽
  if (uploadVisible.value) {
    return;
  }

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  // 转换为数组
  const fileArray = Array.from(files) as File[];

  // 使用 composable 处理上传
  await uploadFileObjects(fileArray, {
    showLoading: true,
    showSuccess: true,
  });
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
