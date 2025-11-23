<template>
  <a-modal
    v-model:open="visible"
    title="初始化配置"
    :width="560"
    :mask-closable="false"
    :closable="false"
    :keyboard="false"
    :footer="null"
    :mask-style="maskStyle"
    wrap-class-name="init-modal-wrap"
  >
    <!-- 加载中状态 -->
    <div v-if="saving" class="loading-container">
      <a-spin size="large" tip="正在初始化服务，请稍候..." />
    </div>

    <!-- 配置表单 -->
    <div v-else class="config-init-content">
      <!-- 数据保存位置 -->
      <div class="config-item">
        <div class="config-item-header">
          <div class="config-item-info">
            <div class="config-item-name">数据保存位置</div>
            <div class="config-item-desc">保存数据索引和数据库等文件</div>
          </div>
        </div>
        <div class="config-item-content">
          <a-input
            v-model:value="formData.dataPath"
            placeholder="请选择数据保存目录"
            readonly
            style="flex: 1; margin-right: 8px"
          />
          <a-button type="primary" @click="selectDirectory"> 选择 </a-button>
        </div>
        <div v-if="errors.dataPath" class="config-item-error">{{ errors.dataPath }}</div>
      </div>

      <!-- Meilisearch 可执行文件路径 -->
      <div class="config-item">
        <div class="config-item-header">
          <div class="config-item-info">
            <div class="config-item-name">Meilisearch 可执行文件</div>
            <div class="config-item-desc">程序搜索依赖Meilisearch构建</div>
          </div>
        </div>
        <div class="config-item-content">
          <a-input
            v-model:value="formData.meilisearchPath"
            placeholder="请选择 Meilisearch 可执行文件"
            readonly
            style="flex: 1; margin-right: 8px"
          />
          <a-button type="primary" @click="selectMeilisearchFile"> 选择 </a-button>
        </div>
        <div v-if="errors.meilisearchPath" class="config-item-error">
          {{ errors.meilisearchPath }}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="config-actions">
        <a-button type="primary" @click="handleSave" :disabled="!canSave"> 保存 </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';

interface InitModalProps {
  open: boolean;
}

interface InitModalEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'config-complete'): void;
}

const props = defineProps<InitModalProps>();
const emit = defineEmits<InitModalEmits>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const formData = reactive({
  dataPath: '',
  meilisearchPath: '',
});

const errors = reactive({
  dataPath: '',
  meilisearchPath: '',
});

const saving = ref(false);

// 遮罩样式（磨砂效果）
const maskStyle = computed(() => ({
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}));

// 检查是否可以保存
const canSave = computed(() => {
  return formData.dataPath.trim() !== '' && formData.meilisearchPath.trim() !== '';
});

// 验证表单
const validateForm = (): boolean => {
  let isValid = true;

  // 重置错误
  errors.dataPath = '';
  errors.meilisearchPath = '';

  // 验证数据保存位置
  if (!formData.dataPath || formData.dataPath.trim() === '') {
    errors.dataPath = '请选择数据保存位置';
    isValid = false;
  }

  // 验证 Meilisearch 路径
  if (!formData.meilisearchPath || formData.meilisearchPath.trim() === '') {
    errors.meilisearchPath = '请选择 Meilisearch 可执行文件';
    isValid = false;
  }

  return isValid;
};

// 选择目录
const selectDirectory = async () => {
  try {
    const path = await window.api.dialog.selectDirectory();
    if (path) {
      formData.dataPath = path;
      errors.dataPath = '';
    }
  } catch (error) {
    console.error('选择目录失败:', error);
    message.error('选择目录失败');
  }
};

// 选择 Meilisearch 可执行文件
const selectMeilisearchFile = async () => {
  try {
    const path = await window.api.dialog.selectExeFile();
    if (path) {
      formData.meilisearchPath = path;
      errors.meilisearchPath = '';
    }
  } catch (error) {
    console.error('选择文件失败:', error);
    message.error('选择文件失败');
  }
};

// 保存配置
const handleSave = async () => {
  if (!validateForm()) {
    return;
  }

  saving.value = true;
  try {
    // 保存配置
    await window.api.settings.set('dataPath', formData.dataPath.trim());
    await window.api.settings.set('meilisearchPath', formData.meilisearchPath.trim());

    // 延迟 2 秒，显示加载状态
    await new Promise((resolve) => setTimeout(resolve, 1000));

    message.success('配置保存成功');
    emit('config-complete');
    visible.value = false;
  } catch (error) {
    console.error('保存配置失败:', error);
    message.error('保存配置失败');
  } finally {
    saving.value = false;
  }
};

// 加载现有配置（如果有）
const loadExistingConfig = async () => {
  try {
    const settings = await window.api.settings.getAll();
    if (settings.dataPath) {
      formData.dataPath = settings.dataPath;
    }
    if (settings.meilisearchPath) {
      formData.meilisearchPath = settings.meilisearchPath;
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
};

// 监听弹窗打开
watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      loadExistingConfig();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.config-init-content {
  padding: 8px 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px; /* 保持与内容区大致相同的高度 */
}

.config-item {
  margin-bottom: 16px;
}

.config-item-header {
  margin-bottom: 12px;
}

.config-item-info {
  flex: 1;
}

.config-item-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 2px;
}

.config-item-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.config-item-content {
  display: flex;
  align-items: center;
}

.config-item-error {
  margin-top: 8px;
  font-size: 12px;
  color: #ff4d4f;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
}

/* 使用深度选择器覆盖 Ant Design Modal 的遮罩样式，实现磨砂效果 */
:deep(.init-modal-wrap .ant-modal-mask) {
  background-color: rgba(0, 0, 0, 0.65) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 确保遮罩层级正确 */
:deep(.init-modal-wrap) {
  z-index: 1000;
}
</style>
