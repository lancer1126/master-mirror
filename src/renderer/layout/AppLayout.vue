<template>
  <div
    class="app-layout"
    @dragenter.prevent="handleGlobalDragEnter"
    @dragover.prevent="handleGlobalDragOver"
    @dragleave.prevent="handleGlobalDragLeave"
    @drop.prevent="handleGlobalDrop"
  >
    <!-- 顶部导航栏 -->
    <app-header @action-change="handleHeaderAction" />

    <!-- 通知列表 -->
    <notification-list />

    <!-- 主要内容区域 -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 配置初始化弹窗 -->
    <init-modal v-model:open="configInitVisible" @config-complete="handleConfigComplete" />

    <!-- 设置弹窗 -->
    <settings-modal v-model:open="settingsVisible" />

    <!-- 上传弹窗 -->
    <upload-modal v-model:open="uploadVisible" />

    <!-- 全局拖拽上传遮罩 -->
    <upload-overlay :visible="isGlobalDragging" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import InitModal from '@/components/InitModal.vue';
import NotificationList from '@/components/NotificationList.vue';
import SettingsModal from '@/components/SettingsModal.vue';
import UploadModal from '@/components/UploadModal.vue';
import UploadOverlay from '@/components/UploadOverlay.vue';
import { useFileUpload } from '@/composables/useFileUpload';
import { useNotifications } from '@/composables/useNotifications';
import AppHeader from '@/layout/components/AppHeader.vue';

const router = useRouter();
const route = useRoute();
const { uploadFileObjects } = useFileUpload(); // 使用上传 Hook
const { error: showError } = useNotifications();
const settingsVisible = ref(false); // 弹窗状态
const uploadVisible = ref(false);
const configInitVisible = ref(false); // 配置初始化弹窗状态
const isGlobalDragging = ref(false); // 全局拖拽状态

let dragCounter = 0; // 用于处理嵌套元素的拖拽事件
let meilisearchErrorId: string | null = null;
let unsubscribeMeilisearch: (() => void) | null = null;

// 判断是否在归档页
const isArchivePage = computed(() => route.path === '/archive');

// 路由跳转
const handleHeaderAction = (action: any) => {
  switch (action) {
    case 'home':
      router.push('/');
      break;
    case 'upload':
      uploadVisible.value = true;
      break;
    case 'archive':
      if (isArchivePage.value) {
        router.push('/');
      } else {
        router.push('/archive');
      }
      break;
    case 'settings':
      settingsVisible.value = true;
      break;
    default:
      break;
  }
};

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

// 检查配置是否完整
const checkConfig = async () => {
  try {
    const isComplete = await window.api.settings.checkComplete();
    if (!isComplete) {
      configInitVisible.value = true;
    }
  } catch (error) {
    console.error('检查配置失败:', error);
    // 如果检查失败，也显示配置对话框
    configInitVisible.value = true;
  }
};

// 配置完成后的处理
const handleConfigComplete = async () => {
  // 通知主进程配置已完成，尝试启动服务
  await window.api.settings.onConfigComplete();
};

// 监听 Meilisearch 状态
onMounted(async () => {
  // 首先检查配置
  await checkConfig();

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
  unsubscribeMeilisearch = window.ipcRenderer.onMeilisearchStatus((status) => {
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
});

// 组件卸载时取消监听
onUnmounted(() => {
  if (unsubscribeMeilisearch) {
    unsubscribeMeilisearch();
  }
});
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
}
</style>
