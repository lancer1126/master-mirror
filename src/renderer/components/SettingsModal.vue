<template>
  <a-modal v-model:open="visible" title="设置" :width="700" :footer="null" @cancel="handleCancel">
    <div class="settings-content">
      <!-- 文件保存位置设置项 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">数据保存位置</div>
          <div class="setting-value">{{ formData.dataPath || '未设置' }}</div>
        </div>
        <a-button type="primary" @click="selectDirectory"> 修改 </a-button>
      </div>

      <!-- Meilisearch 端口设置 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">Meilisearch 端口号</div>
          <div class="setting-desc">修改后需要重启应用生效</div>
        </div>
        <a-input-number
          v-model:value="formData.meilisearchPort"
          :min="1024"
          :max="65535"
          :step="1"
          style="width: 100px"
          @blur="saveMeilisearchPort"
        />
      </div>

      <!-- Meilisearch 可执行文件路径 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">Meilisearch 可执行文件路径</div>
          <div class="setting-value">{{ formData.meilisearchPath || '未设置' }}</div>
        </div>
        <a-button type="primary" @click="selectMeilisearchFile"> 修改 </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import type { SettingsModalEmits, SettingsModalProps } from '@shared/types';

const props = defineProps<SettingsModalProps>();
const emit = defineEmits<SettingsModalEmits>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const formData = reactive({
  dataPath: '',
  meilisearchPath: '',
  meilisearchPort: 7700,
});

const defaultPath = ref('');

// 加载设置
const loadSettings = async () => {
  try {
    const settings = await window.api.settings.getAll();
    formData.dataPath = settings.dataPath || '';
    formData.meilisearchPath = settings.meilisearchPath || '';
    formData.meilisearchPort = settings.meilisearchPort || 7700;
    defaultPath.value = settings.dataPath || '';
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

// 选择目录并保存
const selectDirectory = async () => {
  try {
    const path = await window.api.dialog.selectDirectory();
    if (path) {
      // 立即保存设置
      await window.api.settings.set('dataPath', path);
      formData.dataPath = path;
    }
  } catch (error) {
    console.error('选择目录失败:', error);
  }
};

// 选择 Meilisearch 可执行文件
const selectMeilisearchFile = async () => {
  try {
    const path = await window.api.dialog.selectExeFile();
    if (path) {
      await window.api.settings.set('meilisearchPath', path);
      formData.meilisearchPath = path;
    }
  } catch (error) {
    console.error('选择文件失败:', error);
  }
};

// 保存 Meilisearch 端口
const saveMeilisearchPort = async () => {
  const port = formData.meilisearchPort;
  if (port && port >= 1024 && port <= 65535) {
    try {
      await window.api.settings.set('meilisearchPort', port);
    } catch (error) {
      console.error('保存端口失败:', error);
    }
  }
};

// 取消
const handleCancel = () => {
  visible.value = false;
};

// 监听弹窗打开，加载设置
watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      loadSettings();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.settings-content {
  padding: 8px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
  margin-bottom: 12px;
}

.setting-item:hover {
  background: #f0f0f0;
}

.setting-item-vertical {
  padding: 16px 24px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
  margin-bottom: 12px;
}

.setting-item-vertical:hover {
  background: #f0f0f0;
}

.setting-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0;
}

.setting-info {
  flex: 1;
  margin-right: 16px;
  min-width: 0;
}

.setting-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
}

.setting-value {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  word-break: break-all;
  line-height: 1.5;
}

.setting-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
  line-height: 1.5;
}

.setting-expand {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

.setting-expand-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
