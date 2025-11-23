import { app, BrowserWindow } from 'electron';

import { dbService } from '../database/dbService';
import { setupMeilisearchCleanup } from '../search/meilisearch';
import { createMainWindow } from './window';

/**
 * 设置应用生命周期事件
 */
export function setupAppLifecycle(): void {
  // macOS 特性：点击 Dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // 所有窗口关闭时退出应用
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 设置应用退出时的清理逻辑
  setupMeilisearchCleanup();

  // 应用退出时关闭数据库
  app.on('before-quit', () => {
    dbService.close();
  });
}

