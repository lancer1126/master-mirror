import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer, webUtils } from 'electron';

/**
 * 自定义 API
 * 在这里定义暴露给渲染进程的方法
 */
const api = {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  // 应用信息 API
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    restart: () => ipcRenderer.invoke('app:restart'),
  },
  // 设置相关 API
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    checkComplete: () => ipcRenderer.invoke('settings:checkComplete'),
    getMissingKeys: () => ipcRenderer.invoke('settings:getMissingKeys'),
    onConfigComplete: () => {
      // 通知主进程配置已完成
      ipcRenderer.send('config:complete');
      return ipcRenderer.invoke('settings:onConfigComplete');
    },
  },
  // 对话框 API
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    selectExeFile: () => ipcRenderer.invoke('dialog:selectExeFile'),
  },
  // Shell API
  shell: {
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  },
  // 文件上传 API
  upload: {
    files: (filePaths: string[]) => ipcRenderer.invoke('file:upload', filePaths),
    scanDir: (dirPath: string) => ipcRenderer.invoke('file:scanDir', dirPath),
    getSupportedTypes: () => ipcRenderer.invoke('file:getSupportedTypes'),
    delete: (fileId: string) => ipcRenderer.invoke('file:delete', fileId),
  },
  // 搜索 API
  search: {
    init: () => ipcRenderer.invoke('search:init'),
    query: (query: string, options?: any) => ipcRenderer.invoke('search:query', query, options),
    stats: () => ipcRenderer.invoke('search:stats'),
    clear: () => ipcRenderer.invoke('search:clear'),
  },
  // Meilisearch 状态 API
  meilisearch: {
    getStatus: () => ipcRenderer.invoke('meilisearch:getStatus'),
    download: (dataPath: string) => ipcRenderer.invoke('meilisearch:download', dataPath),
  },
  // 数据库 API
  database: {
    getUploadRecords: () => ipcRenderer.invoke('db:getUploadRecords'),
    getUploadRecordById: (fileId: string) => ipcRenderer.invoke('db:getUploadRecordById', fileId),
  },
};

/**
 * 自定义通用的ipcRenderer，暴露给渲染进程
 */
const ipc = {
  // 发送消息到主进程（无返回值）
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  // 调用主进程方法（有返回值）
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  // 监听主进程消息
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => listener(...args));
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  // 监听 Meilisearch 状态
  onMeilisearchStatus: (callback: (status: any) => void) => {
    const listener = (_: any, status: any) => callback(status);
    ipcRenderer.on('meilisearch:status', listener);
    return () => {
      ipcRenderer.removeListener('meilisearch:status', listener);
    };
  },
  // 监听 Meilisearch 下载进度
  onMeilisearchDownloadProgress: (callback: (progress: number) => void) => {
    const listener = (_: any, progress: number) => callback(progress);
    ipcRenderer.on('meilisearch:download-progress', listener);
    return () => {
      ipcRenderer.removeListener('meilisearch:download-progress', listener);
    };
  },
  // 监听文件解析进度
  onFileParseProgress: (callback: (progress: any) => void) => {
    const listener = (_: any, progress: any) => callback(progress);
    ipcRenderer.on('file:parse:progress', listener);
    return () => {
      ipcRenderer.removeListener('file:parse:progress', listener);
    };
  },
  // 获取File对象的真实路径（Electron专用）
  getPathForFile: (file: File) => {
    return webUtils.getPathForFile(file);
  },
};

/**
 * 将 API 暴露到渲染进程
 * 渲染进程中可以通过 window.electron 和 window.api 访问
 */
if (process.contextIsolated) {
  try {
    // @electron-toolkit/utils 提供的标准 API
    contextBridge.exposeInMainWorld('electron', electronAPI);
    // 自定义 API
    contextBridge.exposeInMainWorld('api', api);
    // ipcRenderer
    contextBridge.exposeInMainWorld('ipcRenderer', ipc);
  } catch (error) {
    console.error('Failed to expose API to renderer:', error);
  }
} else {
  // 如果没有启用上下文隔离（不推荐）
  // @ts-ignore
  window.electron = electronAPI;
  // @ts-ignore
  window.api = api;
  // @ts-ignore
  window.ipcRenderer = ipc;
}
