import { ElectronAPI } from '@electron-toolkit/preload';

interface Settings {
  searchIndexPath: string;
}

interface API {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  settings: {
    get: (key: string) => Promise<any>;
    getAll: () => Promise<Settings>;
    set: (key: string, value: any) => Promise<boolean>;
  };
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };
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

