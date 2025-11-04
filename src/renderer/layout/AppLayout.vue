<template>
  <div class="app-layout">
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

    <main class="app-main">
      <router-view />
    </main>

    <!-- 设置弹窗 -->
    <settings-modal v-model:open="settingsVisible" />
  </div>
</template>

<script setup lang="ts">
import SettingsModal from '@/components/SettingsModal.vue';

const settingsVisible = ref(false);

const showSettings = () => {
  settingsVisible.value = true;
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
