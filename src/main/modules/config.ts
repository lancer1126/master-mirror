import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import Store from 'electron-store';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * 设置存储接口
 */
export interface StoreSchema {
  searchIndexPath: string;
}

/**
 * 获取默认的搜索索引路径
 * 优先使用 D:\Home\MasterMirror\data（如果 D 盘存在）
 * 否则使用用户数据目录下的 search-index
 */
function getDefaultSearchIndexPath(): string {
  // 检查 D 盘是否存在（Windows）
  const dDrive = 'D:\\';
  if (process.platform === 'win32' && existsSync(dDrive)) {
    return join(dDrive, 'Home', 'MasterMirror', 'data');
  }

  // 其他平台或 D 盘不存在时，使用用户数据目录
  return join(app.getPath('userData'), 'search-index');
}

/**
 * 设置存储实例（延迟初始化）
 * 注意：不能在模块顶层直接创建 Store 实例，
 * 因为此时 app.setName() 可能还未执行，会导致使用错误的用户数据目录
 */
let store: Store<StoreSchema> | null = null;

/**
 * 获取或创建 Store 实例（懒加载）
 * 在第一次调用时才创建，确保 app.setName() 已经执行
 */
function getOrCreateStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({
      defaults: {
        searchIndexPath: getDefaultSearchIndexPath(),
      },
    });
  }
  return store;
}

/**
 * 获取主窗口实例
 */
let mainWindow: BrowserWindow | null = null;

/**
 * 设置主窗口引用
 */
export function configRelateWindow(window: BrowserWindow): void {
  mainWindow = window;
}

/**
 * 获取配置存储实例
 */
export function getStore(): Store<StoreSchema> {
  return getOrCreateStore();
}

/**
 * 注册设置相关的 IPC 处理程序
 */
export function registerConfigHandlers(): void {
  // 获取单个设置
  ipcMain.handle('settings:get', (_event, key: keyof StoreSchema) => {
    return getOrCreateStore().get(key);
  });

  // 获取所有设置
  ipcMain.handle('settings:getAll', () => {
    return getOrCreateStore().store;
  });

  // 设置配置
  ipcMain.handle('settings:set', (_event, key: keyof StoreSchema, value: any) => {
    getOrCreateStore().set(key, value);
    return true;
  });

  // 选择目录对话框
  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) {
      console.error('Main window not available');
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择文件保存位置',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
}

