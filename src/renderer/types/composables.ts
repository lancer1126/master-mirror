/**
 * Composables 相关的类型定义
 */

/**
 * 文件上传进度
 */
export interface FileProgress {
  fileName: string;
  current: number;
  total: number;
  percentage: number;
  status: 'parsing' | 'indexing' | 'completed' | 'failed';
  message?: string;
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
  onProgress?: (progress: FileProgress) => void;
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

