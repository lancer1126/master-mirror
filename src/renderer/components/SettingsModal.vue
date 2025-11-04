<template>
  <a-modal v-model:open="visible" title="设置" :width="600" :footer="null" @cancel="handleCancel">
    <div class="settings-content">
      <!-- 文件保存位置设置项 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">索引文件保存位置</div>
          <div class="setting-value">{{ formData.searchIndexPath || '未设置' }}</div>
        </div>
        <a-button type="primary" @click="selectDirectory"> 修改 </a-button>
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
});

const defaultPath = ref('');

// 加载设置
const loadSettings = async () => {
  try {
    const settings = await window.api.settings.getAll();
    formData.searchIndexPath = settings.searchIndexPath || '';
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
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.3s;
}

.setting-item:hover {
  background: #f0f0f0;
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
</style>
