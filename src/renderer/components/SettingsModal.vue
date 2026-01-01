<template>
  <a-modal v-model:open="visible" title="设置" :width="700" :footer="null" @cancel="handleCancel">
    <div class="settings-content">
      <!-- 文件保存位置设置项 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title-row">
            <div class="setting-name">数据保存位置</div>
            <div v-if="isDataPathChanged" class="setting-warning-inline">
              修改后旧数据将无法识别
            </div>
          </div>
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
          @blur="normalizeMeilisearchPort"
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
    <div v-if="hasPendingChanges" class="settings-restart-alert">
      <div class="settings-restart-text">需要重启软件来应用修改</div>
      <a-button type="primary" danger :loading="isRestarting" @click="applyChangesAndRestart">
        立即重启
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import type { SettingsModalEmits, SettingsModalProps } from '@shared/types';
import { message } from 'ant-design-vue';

const props = defineProps<SettingsModalProps>();
const emit = defineEmits<SettingsModalEmits>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

interface SettingsFormState {
  dataPath: string;
  meilisearchPath: string;
  meilisearchPort: number;
}

const formData = reactive<SettingsFormState>({
  dataPath: '',
  meilisearchPath: '',
  meilisearchPort: 7700,
});

const initialSettings = ref<SettingsFormState>({
  dataPath: '',
  meilisearchPath: '',
  meilisearchPort: 7700,
});

const isRestarting = ref(false);

const hasPendingChanges = computed(() => {
  return (
    formData.dataPath !== initialSettings.value.dataPath ||
    formData.meilisearchPath !== initialSettings.value.meilisearchPath ||
    formData.meilisearchPort !== initialSettings.value.meilisearchPort
  );
});

const isDataPathChanged = computed(() => formData.dataPath !== initialSettings.value.dataPath);

// 加载设置
const loadSettings = async () => {
  try {
    const settings = await window.api.settings.getAll();
    formData.dataPath = settings.dataPath || '';
    formData.meilisearchPath = settings.meilisearchPath || '';
    formData.meilisearchPort = settings.meilisearchPort || 7700;
    initialSettings.value = {
      dataPath: formData.dataPath,
      meilisearchPath: formData.meilisearchPath,
      meilisearchPort: formData.meilisearchPort,
    };
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

// 选择目录并保存
const selectDirectory = async () => {
  try {
    const path = await window.api.dialog.selectDirectory();
    if (path) {
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
      formData.meilisearchPath = path;
    }
  } catch (error) {
    console.error('选择文件失败:', error);
  }
};

// Meilisearch 端口合法性校验
const normalizeMeilisearchPort = () => {
  const port = Number(formData.meilisearchPort);
  if (!port || port < 1024 || port > 65535) {
    message.warning('端口号需在 1024-65535 之间');
    const clamped = Math.min(
      Math.max(port || initialSettings.value.meilisearchPort || 7700, 1024),
      65535,
    );
    formData.meilisearchPort = clamped;
  }
};

const validateSettings = () => {
  if (!formData.dataPath) {
    message.warning('请先设置数据保存位置');
    return false;
  }
  if (!formData.meilisearchPath) {
    message.warning('请先设置 Meilisearch 可执行文件路径');
    return false;
  }
  const port = Number(formData.meilisearchPort);
  if (!port || port < 1024 || port > 65535) {
    message.warning('Meilisearch 端口号需在 1024-65535 之间');
    return false;
  }
  return true;
};

const applyChangesAndRestart = async () => {
  if (!hasPendingChanges.value || isRestarting.value) {
    return;
  }
  if (!validateSettings()) {
    return;
  }
  try {
    isRestarting.value = true;
    await Promise.all([
      window.api.settings.set('dataPath', formData.dataPath),
      window.api.settings.set('meilisearchPath', formData.meilisearchPath),
      window.api.settings.set('meilisearchPort', formData.meilisearchPort),
    ]);
    await window.api.app.restart();
  } catch (error) {
    console.error('应用重启失败:', error);
    message.error('重启失败，请稍后重试');
    isRestarting.value = false;
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

.setting-title-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.setting-warning-inline {
  font-size: 13px;
  color: #f12809;
  white-space: nowrap;
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

.settings-restart-alert {
  padding: 12px 24px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.settings-restart-text {
  font-size: 14px;
  color: #ad6800;
  flex: 1;
}
</style>
