<template>
  <a-modal v-model:open="visible" title="设置" :width="700" :footer="null" @cancel="handleCancel">
    <div class="settings-content">
      <!-- 文件保存位置设置项 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">索引文件保存位置</div>
          <div class="setting-value">{{ formData.searchIndexPath || '未设置' }}</div>
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
          style="width: 120px"
          @blur="saveMeilisearchPort"
        />
      </div>

      <!-- 使用独立 Meilisearch -->
      <div class="setting-item-vertical">
        <div class="setting-item-header">
          <div class="setting-info">
            <div class="setting-name">使用独立 Meilisearch</div>
            <div class="setting-desc">勾选后可以使用系统中已安装的 Meilisearch 来替换内置版本</div>
          </div>
          <a-switch v-model:checked="formData.useCustomMeilisearch" @change="handleCustomToggle" />
        </div>
        <!-- 自定义路径选择（展开） -->
        <transition name="expand">
          <div v-show="formData.useCustomMeilisearch" class="setting-expand">
            <div class="setting-expand-item">
              <div class="setting-info">
                <div class="setting-name">可执行文件路径</div>
                <div class="setting-value">
                  {{ formData.customMeilisearchPath || '未选择' }}
                </div>
              </div>
              <a-button @click="selectMeilisearchFile">选择文件</a-button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
interface Props {
  open: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const formData = reactive({
  searchIndexPath: '',
  useCustomMeilisearch: false,
  customMeilisearchPath: '',
  meilisearchPort: 7700,
});

const defaultPath = ref('');

// 加载设置
const loadSettings = async () => {
  try {
    const settings = await window.api.settings.getAll();
    formData.searchIndexPath = settings.searchIndexPath || '';
    formData.useCustomMeilisearch = settings.useCustomMeilisearch || false;
    formData.customMeilisearchPath = settings.customMeilisearchPath || '';
    formData.meilisearchPort = settings.meilisearchPort || 7700;
    defaultPath.value = settings.searchIndexPath || '';
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
      await window.api.settings.set('searchIndexPath', path);
      formData.searchIndexPath = path;
    }
  } catch (error) {
    console.error('选择目录失败:', error);
  }
};

// 选择 Meilisearch 可执行文件
const selectMeilisearchFile = async () => {
  try {
    const path = await window.api.dialog.selectMeilisearchFile();
    if (path) {
      await window.api.settings.set('customMeilisearchPath', path);
      formData.customMeilisearchPath = path;
    }
  } catch (error) {
    console.error('选择文件失败:', error);
  }
};

// 处理自定义 Meilisearch 切换
const handleCustomToggle = async () => {
  try {
    await window.api.settings.set('useCustomMeilisearch', formData.useCustomMeilisearch);
  } catch (error) {
    console.error('保存设置失败:', error);
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
