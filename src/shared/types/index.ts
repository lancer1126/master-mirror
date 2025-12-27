/**
 * 统一导出所有类型定义
 * 
 * 架构说明：
 * - common.ts  - 主进程和渲染进程共同使用的数据类型（跨进程传递）
 * - main.ts    - 主进程特有的类型（内部实现）
 * - renderer.ts - 渲染进程特有的类型（UI 层）
 */

// 导出通用类型
export type {
  IndexStats,
  ParsedChunk,
  ParseProgress,
  SearchHit,
  SearchOptions,
  SearchResult,
  UploadRecord,
} from './common';

// 导出主进程类型
export type { IFileParser, ParseOptions, ParseResult } from './main';

// 导出渲染进程类型
export type {
  GroupedFile,
  NotificationItem,
  NotificationType,
  SearchDetailModalEmits,
  SearchDetailModalProps,
  SearchResultItemEmits,
  SearchResultItemProps,
  SettingsModalEmits,
  SettingsModalProps,
  UploadModalEmits,
  UploadModalProps,
  UploadOptions,
  UploadOverlayProps,
} from './renderer';

