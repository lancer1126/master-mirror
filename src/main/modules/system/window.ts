import { is } from '@electron-toolkit/utils';
import { DEV_SERVER, WINDOW } from '@shared/config';
import { BrowserWindow, shell } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: WINDOW.DEFAULT_WIDTH,
    height: WINDOW.DEFAULT_HEIGHT,
    show: false,
    autoHideMenuBar: true, // 隐藏菜单栏
    icon: join(__dirname, '../../resources/youxian.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false, // 禁用 Node 集成（安全）
    },
  });

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
  if (is.dev) {
    // 开发环境：优先使用环境变量，否则使用配置的默认值
    const devServerUrl = process.env['ELECTRON_RENDERER_URL'] || DEV_SERVER.URL;
    mainWindow.loadURL(devServerUrl);
  } else {
    // 生产环境：加载构建后的 HTML
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}
