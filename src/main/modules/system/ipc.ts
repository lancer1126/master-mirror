import { registerDatabaseHandlers } from '../database/database';
import { registerMeilisearchHandlers } from '../search/meilisearch';
import { registerSearchHandlers } from '../search/search';
import { registerUploadHandlers } from '../upload/upload';
import { registerConfigHandlers } from './appConfig';

/**
 * 注册所有 IPC 处理程序
 */
export function registerIPC(): void {
  // 注册配置相关的 IPC 处理程序
  registerConfigHandlers();
  // 注册文件上传相关的 IPC 处理程序
  registerUploadHandlers();
  // 注册搜索相关的 IPC 处理程序
  registerSearchHandlers();
  // 注册 Meilisearch 相关的 IPC 处理程序
  registerMeilisearchHandlers();
  // 注册数据库相关的 IPC 处理程序
  registerDatabaseHandlers();
}

