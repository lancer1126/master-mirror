import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';

import { APP_INFO, WINDOW } from './constants';
import { configRelateWindow, registerConfigHandlers } from './modules/appConfig';
import { registerDatabaseHandlers } from './modules/database';
import { dbService } from './modules/dbService';
import {
  initializeMeilisearch,
  registerMeilisearchHandlers,
  setupMeilisearchCleanup,
  setupMeilisearchStatusListener,
} from './modules/meilisearch';
import { registerSearchHandlers } from './modules/search';
import { registerUploadHandlers } from './modules/upload';

let mainWindow: BrowserWindow | null = null;

/**
 * 设置应用名称
 */
app.setName(APP_INFO.NAME);

/**
 * 创建主窗口
 */
function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: WINDOW.DEFAULT_WIDTH,
    height: WINDOW.DEFAULT_HEIGHT,
    show: false,
    autoHideMenuBar: true, // 隐藏菜单栏
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false, // 禁用 Node 集成（安全）
    },
  });

  // 设置主窗口引用到配置模块
  configRelateWindow(mainWindow);

  // 窗口准备好后显示
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // 设置 Meilisearch 状态监听器
  setupMeilisearchStatusListener(mainWindow);

  // 拦截新窗口打开，使用默认浏览器
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    // 自动打开开发者工具
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载构建后的 HTML
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// 是否是第一个实例
const isSingleInstance = app.requestSingleInstanceLock();
if (isSingleInstance) {
  // 应用准备就绪
  app.whenReady().then(async () => {
    // 设置应用 ID（Windows）
    electronApp.setAppUserModelId(APP_INFO.APP_ID);

    // 初始化数据库
    dbService.initialize();

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

    // 开发环境下，F12 打开开发者工具
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // 创建主窗口
    createWindow();

    // 后台启动 Meilisearch 服务
    if (mainWindow) {
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
    }

    // macOS 特性：点击 Dock 图标重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
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
} else {
  app.quit();
}
