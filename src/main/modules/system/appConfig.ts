import { APP_INFO, MEILISEARCH_CONFIG } from '@shared/config';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import Store from 'electron-store';

/**
 * 设置存储接口
 */
export interface StoreSchema {
  dataPath: string; // 数据保存路径（包含数据库和搜索索引）
  meilisearchPath: string; // Meilisearch 可执行文件路径
  meilisearchPort: number; // Meilisearch 端口号
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
        dataPath: '',
        meilisearchPath: '',
        meilisearchPort: MEILISEARCH_CONFIG.DEFAULT_PORT,
      },
    });
  }
  return store;
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

  // 检查配置是否完整
  ipcMain.handle('settings:checkComplete', () => {
    return checkConfigComplete();
  });

  // 获取缺失的配置项
  ipcMain.handle('settings:getMissingKeys', () => {
    return getMissingConfigKeys();
  });

  // 配置完成后通知主进程（用于启动服务）
  ipcMain.handle('settings:onConfigComplete', () => {
    // 触发配置完成事件，主进程可以监听并启动服务
    return checkConfigComplete();
  });

  // 设置配置
  ipcMain.handle('settings:set', (_event, key: keyof StoreSchema, value: any) => {
    getOrCreateStore().set(key, value);
    return true;
  });

  // 获取应用信息
  ipcMain.handle('app:getInfo', () => {
    return {
      name: APP_INFO.NAME,
      appId: APP_INFO.APP_ID,
    };
  });

  // 选择目录对话框
  ipcMain.handle('dialog:selectDirectory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      console.error('Main window not available');
      return null;
    }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择文件保存位置',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // 选择 exe 可执行文件对话框
  ipcMain.handle('dialog:selectExeFile', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      console.error('Main window not available');
      return null;
    }

    const filters =
      process.platform === 'win32'
        ? [
            { name: '可执行文件', extensions: ['exe'] },
            { name: '所有文件', extensions: ['*'] },
          ]
        : [{ name: '所有文件', extensions: ['*'] }];

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      title: '选择 exe 可执行文件',
      filters,
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // 在文件管理器中显示文件
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error: any) {
      console.error('打开文件夹失败:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * 检查配置是否完整
 * @returns 如果配置完整返回 true，否则返回 false
 */
export function checkConfigComplete(): boolean {
  const store = getOrCreateStore();
  const dataPath = store.get('dataPath');
  const meilisearchPath = store.get('meilisearchPath');

  // 检查两个必填项是否都存在且不为空
  if (!dataPath || dataPath.trim() === '') {
    return false;
  }
  if (!meilisearchPath || meilisearchPath.trim() === '') {
    return false;
  }
  return true;
}

/**
 * 获取缺失的配置项
 * @returns 缺失的配置项数组
 */
export function getMissingConfigKeys(): Array<'dataPath' | 'meilisearchPath'> {
  const store = getOrCreateStore();
  const missing: Array<'dataPath' | 'meilisearchPath'> = [];

  const dataPath = store.get('dataPath');
  const meilisearchPath = store.get('meilisearchPath');

  if (!dataPath || dataPath.trim() === '') {
    missing.push('dataPath');
  }

  if (!meilisearchPath || meilisearchPath.trim() === '') {
    missing.push('meilisearchPath');
  }

  return missing;
}
