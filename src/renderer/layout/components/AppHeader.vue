<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo"></div>
      <div class="header-actions">
        <a-button class="action-btn" @click="handleUpload">上传</a-button>
        <a-button class="action-btn" @click="handleArchive">归档</a-button>
        <a-button type="text" class="action-btn" @click="handleSettings">
          <template #icon>
            <setting-outlined />
          </template>
        </a-button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { SettingOutlined } from '@ant-design/icons-vue';

interface AppHeaderEmits {
  (e: 'upload'): void;
  (e: 'archive'): void;
  (e: 'settings'): void;
}

const emit = defineEmits<AppHeaderEmits>();

const handleUpload = () => {
  emit('upload');
};

const handleArchive = () => {
  emit('archive');
};

const handleSettings = () => {
  emit('settings');
};
</script>

<style scoped>
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
</style>
