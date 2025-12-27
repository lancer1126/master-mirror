/**
 * 渲染进程类型定义
 * 主要在渲染进程中使用的类型（UI 展示相关）
 */

import type { ParseProgress, SearchHit } from './common';

/**
 * 详情页展开后的单次匹配信息
 */
export interface DetailMatch extends SearchHit {
  /** 当前匹配在所在 chunk 中的序号（从 1 开始） */
  matchOccurrenceIndex: number;
  /** 当前 chunk 中的匹配总数 */
  occurrencesInChunk: number;
  /** 预处理后的上下文片段（包含高亮） */
  snippet: string;
}

/**
 * 按文件分组的搜索结果（用于前端展示）
 */
export interface GroupedFile {
  /** 文件ID（唯一标识） */
  fileId: string;
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  filePath: string;
  /** 文件类型 */
  fileType: string;
  /** 总页数 */
  totalPages?: number;
  /** 匹配总次数（从 facets 获取的精确统计） */
  matchCount: number;
  /** 预览用的第一个匹配 chunk */
  previewChunk: SearchHit;
  /** 展开后的匹配项列表（详情加载后才有） */
  matches?: DetailMatch[];
  /** 是否已加载详情 */
  detailsLoaded?: boolean;
}

/**
 * Vue 组件 Props - SettingsModal
 */
export interface SettingsModalProps {
  open: boolean;
}

export interface SettingsModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * Vue 组件 Props - SearchDetailModal
 */
export interface SearchDetailModalProps {
  open: boolean;
  file: GroupedFile | null;
  /** 搜索关键词（用于加载文件详情） */
  searchQuery: string;
}

export interface SearchDetailModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * Vue 组件 Props - SearchResultItem
 */
export interface SearchResultItemProps {
  file: GroupedFile;
  /** 搜索关键词（用于详情加载） */
  searchQuery: string;
}

export interface SearchResultItemEmits {
  (e: 'showInFolder', filePath: string): void;
}

/**
 * Vue 组件 Props - UploadModal
 */
export interface UploadModalProps {
  open: boolean;
}

export interface UploadModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * Vue 组件 Props - UploadOverlay
 */
export interface UploadOverlayProps {
  visible: boolean;
}

/**
 * 文件上传选项
 */
export interface UploadOptions {
  /** 是否显示loading提示 */
  showLoading?: boolean;
  /** 是否显示成功消息 */
  showSuccess?: boolean;
  /** 上传前的钩子 */
  onBefore?: () => void;
  /** 上传完成的钩子 */
  onComplete?: (success: string[], failed: Array<{ fileName: string; error: string }>) => void;
  /** 进度更新的钩子 */
  onProgress?: (progress: ParseProgress) => void;
}

/**
 * 消息类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * 消息项接口
 */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  closable?: boolean;
  autoClose?: boolean;
  duration?: number;
  expanded?: boolean;
}

