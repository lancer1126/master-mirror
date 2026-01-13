import { ElectronAPI } from '@electron-toolkit/preload';
import type {
  IndexStats,
  ParseProgress,
  SearchHit,
  SearchOptions,
  SearchResult,
  UploadRecord,
} from '@shared/types';

interface Settings {
  dataPath: string;
  meilisearchPath: string;
  meilisearchPort: number;
}

interface UploadResult {
  success: boolean;
  data?: {
    success: string[];
    failed: Array<{ fileName: string; error: string }>;
  };
  error?: string;
}

interface API {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  app: {
    getInfo: () => Promise<{ name: string; appId: string }>;
    restart: () => Promise<void>;
  };
  settings: {
    get: (key: string) => Promise<any>;
    getAll: () => Promise<Settings>;
    set: (key: string, value: any) => Promise<boolean>;
    checkComplete: () => Promise<boolean>;
    onConfigComplete: () => Promise<boolean>;
  };
  dialog: {
    selectDirectory: () => Promise<string | null>;
    selectExeFile: () => Promise<string | null>;
  };
  shell: {
    showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  };
  upload: {
    files: (filePaths: string[]) => Promise<UploadResult>;
    scanDir: (dirPath: string) => Promise<{ success: boolean; data?: string[]; error?: string }>;
    getSupportedTypes: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
    delete: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  };
  search: {
    init: () => Promise<{ success: boolean; error?: string }>;
    query: (
      query: string,
      options?: SearchOptions,
    ) => Promise<{ success: boolean; data?: SearchResult; error?: string }>;
    stats: () => Promise<{ success: boolean; data?: IndexStats; error?: string }>;
    clear: () => Promise<{ success: boolean; error?: string }>;
  };
  meilisearch: {
    getStatus: () => Promise<MeilisearchStatus | null>;
    download: (dataPath: string) => Promise<{ success: boolean; path?: string; message?: string }>;
  };
  database: {
    getUploadRecords: () => Promise<{ success: boolean; data?: UploadRecord[]; error?: string }>;
    getUploadRecordById: (
      fileId: string,
    ) => Promise<{ success: boolean; data?: UploadRecord; error?: string }>;
  };
}

interface MeilisearchStatus {
  status: 'success' | 'error';
  message: string;
}

interface ipcRenderer {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
  removeAllListeners: (channel: string) => void;
  onMeilisearchStatus: (callback: (status: MeilisearchStatus) => void) => () => void;
  onMeilisearchDownloadProgress: (callback: (progress: number) => void) => () => void;
  onFileParseProgress: (callback: (progress: ParseProgress) => void) => () => void;
  getPathForFile: (file: File) => string;
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

