<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    :width="560"
    :mask-closable="false"
    :closable="false"
    :keyboard="false"
    :footer="null"
    :mask-style="maskStyle"
    wrap-class-name="init-modal-wrap"
  >
    <!-- 加载中状态 (保存配置时) -->
    <div v-if="saving && !isDownloading" class="loading-container">
      <a-spin size="large" tip="正在保存配置，请稍候..." />
    </div>

    <!-- Step 1: 数据保存位置 -->
    <div v-else-if="step === 1">
      <div class="config-item">
        <div class="config-item-header">
          <div class="config-item-info">
            <div class="config-item-name">数据保存位置</div>
            <div class="config-item-desc">选择用于保存程序数据的目录</div>
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

      <div class="config-actions">
        <a-button type="primary" @click="nextStep" :disabled="!formData.dataPath">
          下一步
        </a-button>
      </div>
    </div>

    <!-- Step 2: Meilisearch 配置 -->
    <div v-else-if="step === 2">
      <!-- 下载进度展示 -->
      <div v-if="isDownloading" class="download-container">
        <a-progress type="circle" :percent="downloadPercent" />
        <p class="download-tip">正在下载并初始化搜索引擎组件 ({{ downloadPercent }}%)...</p>
        <p class="download-subtip">下载源: GitHub/Gitee Release</p>
        <div class="download-warning">请勿关闭程序</div>
      </div>

      <!-- 配置表单 -->
      <div v-else>
        <div class="config-item">
          <div class="config-item-header">
            <div class="config-item-info">
              <div class="config-item-name">搜索引擎初始化</div>
              <div class="config-item-desc">本软件依赖 Meilisearch 进行全文检索</div>
            </div>
          </div>

          <div class="mode-select">
            <a-radio-group v-model:value="initMode" button-style="solid" style="width: 100%">
              <a-radio-button value="auto" style="width: 50%; text-align: center"
                >自动初始化</a-radio-button
              >
              <a-radio-button value="manual" style="width: 50%; text-align: center"
                >手动选择文件</a-radio-button
              >
            </a-radio-group>
          </div>

          <div class="mode-desc">
            <p v-if="initMode === 'auto'">
              系统将自动从云端下载适配您系统的 Meilisearch 引擎，并配置到数据目录中。
            </p>
            <p v-else>如果您已经手动下载了 Meilisearch 可执行文件，请选择它。<br /></p>
          </div>
        </div>

        <!-- 手动选择文件输入框 -->
        <div v-if="initMode === 'manual'" class="config-item slide-in">
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

        <div class="config-actions">
          <a-button style="margin-right: 8px" @click="prevStep" :disabled="isDownloading">
            上一步
          </a-button>
          <a-button
            type="primary"
            @click="handleFinish"
            :loading="saving"
            :disabled="initMode === 'manual' && !formData.meilisearchPath"
          >
            {{ initMode === 'auto' ? '开始初始化' : '完成配置' }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { computed, onUnmounted, reactive, ref, watch } from 'vue';

interface InitModalProps {
  open: boolean;
}

interface InitModalEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'config-complete'): void;
}

const props = defineProps<InitModalProps>();
const emit = defineEmits<InitModalEmits>();

// 状态控制
const step = ref(1);
const initMode = ref<'auto' | 'manual'>('auto');
const isDownloading = ref(false);
const downloadPercent = ref(0);
const saving = ref(false);

// 监听下载进度的清理函数
let removeDownloadListener: (() => void) | null = null;

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const modalTitle = computed(() => {
  if (isDownloading.value) return '正在初始化...';
  return '初始化配置';
});

const formData = reactive({
  dataPath: '',
  meilisearchPath: '',
});

const errors = reactive({
  dataPath: '',
  meilisearchPath: '',
});

// 遮罩样式（磨砂效果）
const maskStyle = computed(() => ({
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}));

// 选择目录
const selectDirectory = async () => {
  try {
    const selectedPath = await window.api.dialog.selectDirectory();
    if (selectedPath) {
      // 获取应用信息
      const appInfo = await window.api.app.getInfo();
      const productName = appInfo.name;

      // 获取选择目录的名称（最后一部分），兼容 Windows 和 Unix 路径
      const pathSeparator = selectedPath.includes('\\') ? '\\' : '/';
      const pathParts = selectedPath.split(pathSeparator).filter((p) => p);
      const selectedDirName = pathParts[pathParts.length - 1] || '';

      // 检查目录名是否为 productName（不区分大小写）
      if (selectedDirName.toLowerCase() === productName.toLowerCase()) {
        // 如果已经是 productName 目录，直接使用
        formData.dataPath = selectedPath;
      } else {
        // 否则在选择的目录下创建 productName 子目录
        formData.dataPath = `${selectedPath}${pathSeparator}${productName}`;
      }

      errors.dataPath = '';

      console.log('[InitModal] 数据目录:', formData.dataPath);
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

// 步骤控制
const nextStep = () => {
  if (!formData.dataPath) {
    errors.dataPath = '请选择数据保存位置';
    return;
  }
  // 先保存第一步的配置（可选，或者最后一起保存。这里为了安全起见，最后一起保存，或者暂存内存）
  step.value = 2;
};

const prevStep = () => {
  step.value = 1;
};

// 完成配置（核心逻辑）
const handleFinish = async () => {
  // 手动模式验证
  if (initMode.value === 'manual' && !formData.meilisearchPath) {
    errors.meilisearchPath = '请选择 Meilisearch 可执行文件';
    return;
  }

  // 1. 如果是自动模式，先执行下载
  if (initMode.value === 'auto') {
    isDownloading.value = true;
    downloadPercent.value = 0;

    // 设置进度监听
    if (removeDownloadListener) removeDownloadListener();
    removeDownloadListener = window.ipcRenderer.onMeilisearchDownloadProgress((percent) => {
      downloadPercent.value = percent;
    });

    try {
      const result = await window.api.meilisearch.download(formData.dataPath);
      if (result.success && result.path) {
        formData.meilisearchPath = result.path;
        message.success('搜索引擎初始化成功！');
      } else {
        throw new Error(result.message || '下载失败');
      }
    } catch (error: any) {
      console.error('自动初始化失败:', error);
      message.error(`初始化失败: ${error.message}，请尝试手动选择模式`);
      isDownloading.value = false;
      return; // 终止后续保存
    } finally {
      // 移除监听
      if (removeDownloadListener) {
        removeDownloadListener();
        removeDownloadListener = null;
      }
      isDownloading.value = false;
    }
  }

  // 2. 保存所有配置
  saveAllConfig();
};

const saveAllConfig = async () => {
  saving.value = true;
  try {
    await window.api.settings.set('dataPath', formData.dataPath.trim());
    await window.api.settings.set('meilisearchPath', formData.meilisearchPath.trim());

    // 延迟一秒提升体验
    await new Promise((resolve) => setTimeout(resolve, 1000));
    emit('config-complete');
    visible.value = false;
  } catch (error) {
    console.error('保存配置失败:', error);
    message.error('保存配置失败');
  } finally {
    saving.value = false;
  }
};

// 加载现有配置
const loadExistingConfig = async () => {
  try {
    const settings = await window.api.settings.getAll();
    if (settings.dataPath) formData.dataPath = settings.dataPath;
    if (settings.meilisearchPath) formData.meilisearchPath = settings.meilisearchPath;
  } catch (error) {
    console.error('加载配置失败:', error);
  }
};

watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      step.value = 1; // 重置步骤
      initMode.value = 'auto'; // 重置模式
      loadExistingConfig();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (removeDownloadListener) removeDownloadListener();
});
</script>

<style scoped>
.loading-container,
.download-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  text-align: center;
}

.download-tip {
  margin-top: 24px;
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.download-subtip {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.download-warning {
  margin-top: 12px;
  font-size: 12px;
  color: #faad14;
  background: #fffbe6;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ffe58f;
}

.config-item {
  margin-bottom: 24px;
}

.config-item-header {
  margin-bottom: 12px;
}

.config-item-info {
  flex: 1;
}

.config-item-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
}

.config-item-desc {
  font-size: 13px;
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
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: 16px;
}

.mode-select {
  margin-bottom: 16px;
}

.mode-desc {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
}

.mode-desc p {
  margin: 0;
}

.highlight {
  color: #1677ff;
  font-weight: 500;
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.init-modal-wrap .ant-modal-mask) {
  background-color: rgba(0, 0, 0, 0.65) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

:deep(.init-modal-wrap) {
  z-index: 1000;
}
</style>
