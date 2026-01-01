<template>
  <div class="archive-container">
    <!-- 页面标题 -->
    <div class="archive-header">
      <div class="header-left">
        <h2 class="archive-title">文件归档</h2>
        <a-button type="text" :loading="loading" @click="refreshRecords">
          <template #icon>
            <reload-outlined />
          </template>
          刷新
        </a-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="archive-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-wrapper">
        <a-spin size="large" tip="加载中..." />
      </div>

      <!-- 记录列表 -->
      <template v-else-if="records.length > 0">
        <a-table
          :columns="columns"
          :data-source="records"
          :pagination="pagination"
          :row-key="(record) => record.fileId"
          :loading="loading"
        >
          <!-- 文件名列 -->
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'fileName'">
              <div class="file-name-cell">
                <file-text-outlined class="file-icon" />
                <span class="file-name">{{ record.fileName }}</span>
              </div>
            </template>

            <!-- 文件路径列 -->
            <template v-else-if="column.key === 'filePath'">
              <a-tooltip :title="record.filePath">
                <span class="file-path">{{ record.filePath }}</span>
              </a-tooltip>
            </template>

            <!-- 上传时间列 -->
            <template v-else-if="column.key === 'uploadTime'">
              <span class="upload-time">{{ record.uploadTime }}</span>
            </template>

            <!-- 操作列 -->
            <template v-else-if="column.key === 'action'">
              <a-space :size="2">
                <a-button type="link" size="small" @click="handleShowInFolder(record.filePath)">
                  <template #icon>
                    <folder-open-outlined />
                  </template>
                  定位
                </a-button>
                <a-popconfirm
                  title="确定要移除这条记录吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  @confirm="handleDelete(record.fileId)"
                >
                  <a-button type="link" danger size="small">
                    <template #icon>
                      <delete-outlined />
                    </template>
                    移除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 空状态 -->
      <a-empty v-else description="暂无上传记录" class="empty-state" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DeleteOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import type { UploadRecord } from '@shared/types';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';

// 表格列定义
const columns: TableColumnsType = [
  {
    title: '文件名',
    dataIndex: 'fileName',
    key: 'fileName',
    width: 250,
  },
  {
    title: '文件路径',
    dataIndex: 'filePath',
    key: 'filePath',
    ellipsis: true,
  },
  {
    title: '上传时间',
    dataIndex: 'uploadTime',
    key: 'uploadTime',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right',
  },
];

// 数据
const records = ref<UploadRecord[]>([]);
const loading = ref(false);

// 分页配置
const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条记录`,
});

// 加载上传记录
const loadRecords = async () => {
  loading.value = true;
  try {
    const result = await window.api.database.getUploadRecords();
    if (result.success && result.data) {
      records.value = result.data;
      pagination.value.total = result.data.length;
    } else {
      message.error(result.error || '加载记录失败');
    }
  } catch (error: any) {
    console.error('加载记录失败:', error);
    message.error('加载记录失败');
  } finally {
    loading.value = false;
  }
};

// 刷新记录
const refreshRecords = () => {
  loadRecords();
};

// 打开文件夹
const handleShowInFolder = async (filePath: string) => {
  try {
    const result = await window.api.shell.showItemInFolder(filePath);
    if (!result.success) {
      message.error(result.error || '打开文件夹失败');
    }
  } catch (error: any) {
    console.error('打开文件夹失败:', error);
    message.error('打开文件夹失败');
  }
};

// 删除记录
const handleDelete = async (fileId: string) => {
  try {
    const result = await window.api.upload.delete(fileId);
    if (result.success) {
      message.success('删除成功');
      // 重新加载记录
      await loadRecords();
    } else {
      message.error(result.error || '删除失败');
    }
  } catch (error: any) {
    console.error('删除记录失败:', error);
    message.error('删除失败');
  }
};

// 页面加载时获取记录
onMounted(() => {
  loadRecords();
});
</script>

<style scoped>
.archive-container {
  height: 100%;
  width: 75%;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}

.archive-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.archive-header .header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.archive-header .archive-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #262626;
}

.archive-content {
  flex: 1;
  padding: 0;
  overflow: auto;
}

.archive-content .loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.archive-content .empty-state {
  margin-top: 100px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name-cell .file-icon {
  color: #1890ff;
  font-size: 16px;
}

.file-name-cell .file-name {
  font-weight: 400;
  color: #262626;
}

.file-path {
  color: #8c8c8c;
  font-size: 13px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-time {
  color: #8c8c8c;
  font-size: 13px;
}

/* 表格扁平化样式 */
:deep(.ant-table-wrapper) {
  padding: 0;
}

:deep(.ant-table) {
  background: transparent;
}

:deep(.ant-table-thead > tr > th) {
  background: transparent !important;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 500;
  padding: 12px 16px;
  color: #8c8c8c;
  font-size: 13px;
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid #f0f0f0;
  padding: 14px 16px;
  background: transparent !important;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #fafafa !important;
}

/* 固定列样式 */
:deep(.ant-table-cell-fix-right) {
  background: transparent !important;
}

:deep(.ant-table-tbody > tr:hover .ant-table-cell-fix-right) {
  background: #fafafa !important;
}

:deep(.ant-pagination) {
  padding: 16px 24px;
  margin: 0;
}
</style>
