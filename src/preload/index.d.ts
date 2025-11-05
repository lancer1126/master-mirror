import { ElectronAPI } from '@electron-toolkit/preload';

interface Settings {
  searchIndexPath: string;
  useCustomMeilisearch: boolean;
  customMeilisearchPath: string;
  meilisearchPort: number;
}

interface UploadResult {
  success: boolean;
  data?: {
    success: string[];
    failed: string[];
  };
  error?: string;
}

interface FileDocument {
  id: string;
  fileName: string;
  filePath: string;
  content?: string;
  fileSize: number;
  fileType: string;
  uploadTime: number;
  modifiedTime: number;
}

interface SearchResult {
  hits: FileDocument[];
  processingTimeMs: number;
  query: string;
  estimatedTotalHits: number;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}

interface IndexStats {
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
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
    selectMeilisearchFile: () => Promise<string | null>;
  };
  upload: {
    files: (filePaths: string[]) => Promise<UploadResult>;
  };
  search: {
    init: () => Promise<{ success: boolean; error?: string }>;
    addDocuments: (
      documents: FileDocument[],
    ) => Promise<{ success: boolean; error?: string }>;
    updateDocuments: (
      documents: FileDocument[],
    ) => Promise<{ success: boolean; error?: string }>;
    deleteDocuments: (
      documentIds: string[],
    ) => Promise<{ success: boolean; error?: string }>;
    query: (
      query: string,
      options?: SearchOptions,
    ) => Promise<{ success: boolean; data?: SearchResult; error?: string }>;
    stats: () => Promise<{ success: boolean; data?: IndexStats; error?: string }>;
    clear: () => Promise<{ success: boolean; error?: string }>;
  };
  meilisearch: {
    getStatus: () => Promise<MeilisearchStatus | null>;
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

