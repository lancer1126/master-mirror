/**
 * 渲染进程类型定义
 * 主要在渲染进程中使用的类型（UI 展示相关）
 */

import type { ParseProgress, SearchHit } from './common';

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
  /** 匹配总次数 */
  matchCount: number;
  /** 匹配的分块列表 */
  matches: SearchHit[];
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
}

export interface SearchDetailModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * Vue 组件 Props - SearchResultItem
 */
export interface SearchResultItemProps {
  file: GroupedFile;
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

