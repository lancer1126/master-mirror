import { ElectronAPI } from '@electron-toolkit/preload';

interface API {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
}

interface ipcRenderer {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
  removeAllListeners: (channel: string) => void;
}

/**
 * 扩展 Window 接口，提供类型支持
 */
declare global {
  interface Window {
    electron: ElectronAPI; //Electron 标准 API
    api: API;
    ipcRenderer: ipcRenderer;
    $message: any;
  }
}

export {};

