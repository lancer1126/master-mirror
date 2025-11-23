import { electronApp, optimizer } from '@electron-toolkit/utils';
import { app } from 'electron';

import { APP_INFO } from '../../constants';
import { registerIPC } from './ipc';
import { setupAppLifecycle } from './lifecycle';
import { setupServiceListeners } from './serviceManager';
import { createMainWindow } from './window';

/**
 * 初始化应用程序
 * 包含数据库初始化、IPC 注册、窗口创建等核心逻辑
 */
export async function initApp(): Promise<void> {
  // 设置应用 ID（Windows）以确保正确的任务栏图标和通知
  electronApp.setAppUserModelId(APP_INFO.APP_ID);

  // 注册所有 IPC 通信处理程序
  registerIPC();

  // 监听窗口创建事件，在开发环境下启用 F12 调试工具
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // 创建主应用程序窗口
  const mainWindow = createMainWindow();

  // 设置服务状态监听器（如数据库状态）
  setupServiceListeners(mainWindow);

  // 设置应用程序的生命周期事件处理（如激活、退出等）
  setupAppLifecycle();
}
