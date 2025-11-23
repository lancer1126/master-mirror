import { BrowserWindow,ipcMain } from 'electron';

import { initializeMeilisearch } from '../search/meilisearch';
import { checkConfigComplete } from './appConfig';

let meilisearchInitialized = false;

/**
 * 启动服务
 */
export function startServices(mainWindow: BrowserWindow | null): void {
  if (meilisearchInitialized || !mainWindow) {
    return;
  }

  const isConfigComplete = checkConfigComplete();
  if (isConfigComplete) {
    meilisearchInitialized = true;
    // 配置完整，启动 Meilisearch 服务
    initializeMeilisearch(mainWindow);

    // 初始化搜索索引（延迟执行，等待 Meilisearch 启动）
    setTimeout(async () => {
      try {
        await mainWindow?.webContents.executeJavaScript('window.api.search.init()');
        console.log('[App] 搜索索引初始化完成');
      } catch (error) {
        console.error('[App] 搜索索引初始化失败:', error);
      }
    }, 3000);
  } else {
    console.log('[App] 配置未完成，等待用户配置...');
  }
}

/**
 * 设置服务监听器
 */
export function setupServiceListeners(mainWindow: BrowserWindow): void {
  // 等待窗口加载完成后检查配置
  mainWindow.webContents.once('did-finish-load', () => {
    // 延迟检查，确保渲染进程已准备好
    setTimeout(() => {
      startServices(mainWindow);
    }, 500);
  });

  // 监听配置完成事件（从渲染进程触发）
  ipcMain.on('config:complete', () => {
    console.log('[App] 收到配置完成通知，尝试启动服务...');
    startServices(mainWindow);
  });
}

