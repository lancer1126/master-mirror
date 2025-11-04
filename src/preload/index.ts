import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';

/**
 * 自定义 API
 * 在这里定义暴露给渲染进程的方法
 */
const api = {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
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
