import { dbService } from '@main/modules/database/dbService';
import { meilisearchService, setupMeilisearchStatusListener } from '@main/modules/search/meilisearch';
import { parserFactory } from '@main/parsers';
import { BrowserWindow, ipcMain } from 'electron';

import { checkConfigComplete } from './appConfig';

let servicesInitialized = false;

/**
 * 启动服务
 */
export function startServices(mainWindow: BrowserWindow | null): void {
  if (servicesInitialized || !mainWindow) {
    return;
  }

  const isConfigComplete = checkConfigComplete();
  if (isConfigComplete) {
    // 初始化数据库服务
    dbService.initialize();
    // 启动 Meilisearch 服务
    meilisearchService.initialize(mainWindow);
    // 初始化解析器工厂
    parserFactory.initialize();
    
    servicesInitialized = true;
    // 初始化搜索索引（延迟执行，等待 Meilisearch 启动）
    setTimeout(async () => {
      try {
        await mainWindow?.webContents.executeJavaScript('window.api.search.init()');
        console.log('[App] 搜索索引初始化完成');
      } catch (error) {
        console.error('[App] 搜索索引初始化失败:', error);
      } finally {
        console.log('[App] 服务初始化完成');
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
  // 设置 Meilisearch 状态监听器（补发机制）
  setupMeilisearchStatusListener(mainWindow);

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
