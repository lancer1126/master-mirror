/**
 * 组件相关的类型定义
 */

import type { GroupedFile } from './search';

/**
 * SettingsModal 组件
 */
export interface SettingsModalProps {
  open: boolean;
}

export interface SettingsModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * SearchDetailModal 组件
 */
export interface SearchDetailModalProps {
  open: boolean;
  file: GroupedFile | null;
}

export interface SearchDetailModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * SearchResultItem 组件
 */
export interface SearchResultItemProps {
  file: GroupedFile;
}

export interface SearchResultItemEmits {
  (e: 'showInFolder', filePath: string): void;
}

/**
 * UploadModal 组件
 */
export interface UploadModalProps {
  open: boolean;
}

export interface UploadModalEmits {
  (e: 'update:open', value: boolean): void;
}

/**
 * UploadOverlay 组件
 */
export interface UploadOverlayProps {
  visible: boolean;
}

