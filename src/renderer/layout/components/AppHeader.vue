<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo"></div>
      <div class="header-actions">
        <a-button type="text" :class="['action-btn']" @click="() => handleAction('home')">
          首页
        </a-button>
        <a-button type="text" :class="['action-btn']" @click="() => handleAction('upload')">
          收录
        </a-button>
        <a-button type="text" :class="['action-btn']" @click="() => handleAction('archive')">
          归档
        </a-button>
        <a-button
          type="text"
          :class="['action-btn', 'icon-btn']"
          @click="() => handleAction('settings')"
        >
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
import { ref } from 'vue';

interface AppHeaderEmits {
  (e: 'action-change', action: HeaderAction): void;
}

type HeaderAction = 'home' | 'upload' | 'archive' | 'settings';

const emit = defineEmits<AppHeaderEmits>();
const activeAction = ref<HeaderAction>('home');

const handleAction = (action: HeaderAction) => {
  activeAction.value = action;
  emit('action-change', action);
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
  gap: 10px;
}

:deep(.ant-btn.action-btn) {
  border: none;
  background: transparent;
  color: #111;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 20px;
  height: auto;
  line-height: 1.2;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

:deep(.ant-btn.action-btn:hover) {
  background: rgba(0, 0, 0, 0.04);
}

:deep(.ant-btn.action-btn.active) {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  backdrop-filter: blur(12px);
}

:deep(.ant-btn.action-btn:focus-visible) {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
}

:deep(.ant-btn.action-btn.icon-btn) {
  padding: 10px;
  min-width: 44px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
