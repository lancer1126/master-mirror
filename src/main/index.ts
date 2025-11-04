import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';

import { configRelateWindow,registerConfigHandlers } from './modules/config';

let mainWindow: BrowserWindow | null = null;

/**
 * 设置应用名称
 */
app.setName('MasterMirror');

/**
 * 创建主窗口
 */
function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载构建后的 HTML
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// 是否是第一个实例
const isSingleInstance = app.requestSingleInstanceLock();
if (isSingleInstance) {
  // 应用准备就绪
  app.whenReady().then(() => {
    // 设置应用 ID（Windows）
    electronApp.setAppUserModelId('fun.lance.mastermirror');

    // 注册配置相关的 IPC 处理程序
    registerConfigHandlers();

    // 开发环境下，F12 打开开发者工具
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // 创建主窗口
    createWindow();

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

  // 应用即将退出前的清理工作
  app.on('before-quit', () => {
    // 在这里可以添加清理逻辑
    console.log('Application is quitting...');
  });
} else {
  app.quit();
}
