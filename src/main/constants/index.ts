/**
 * 应用常量配置
 * 统一管理应用中使用的各类常量
 */

/**
 * 配置相关常量
 */
export const APP_CONFIG = {
  /** 搜索索引目录名称 */
  DEFAULT_DIR: 'UserData',
  /** D 盘根目录（Windows） */
  D_DRIVE: 'D:\\',
  /** Home 目录名称 */
  HOME_DIR: 'Home',
  DATA_PATH: 'dataPath', // 数据保存路径
  MEILISEARCH_PATH: 'meilisearchPath', // Meilisearch 可执行文件路径
  MEILISEARCH_PORT: 'meilisearchPort', // Meilisearch 端口号
} as const;

/**
 * 窗口相关常量
 */
export const WINDOW = {
  /** 窗口默认宽度 */
  DEFAULT_WIDTH: 950,
  /** 窗口默认高度 */
  DEFAULT_HEIGHT: 650,
} as const;

/**
 * 应用信息
 */
export const APP_INFO = {
  /** 应用名称 */
  NAME: 'MasterMirror',
  /** 应用 ID */
  APP_ID: 'fun.lance.mastermirror',
} as const;

/**
 * Meilisearch 配置
 */
export const MEILISEARCH_CONFIG = {
  /** 默认端口，可在程序设置中修改 */
  DEFAULT_PORT: 7700,
  /** 默认主机 */
  HOST: '127.0.0.1',
  /** 进程启动超时时间（毫秒） */
  STARTUP_TIMEOUT: 5000,
  /** 默认可执行文件名称 */
  EXEC_DEFAULT_NAME: 'meilisearch',
  /** Windows 可执行文件名称 */
  EXEC_WIN_NAME: 'meilisearch-windows-amd64.exe',
  /** Master Key（用于保护本地 Meilisearch 实例） */
  MASTER_KEY: 'MasterMirror_Local_Key_2024_Secure_16Bytes_Min',
  /** 默认索引名称 */
  DEFAULT_INDEX: 'documents',
} as const;

/**
 * 文件解析器配置
 */
export const PARSER_CONFIG = {
  /** PDF 每个分块的页数 */
  PDF_CHUNK_SIZE: 50,
  /** 最大分块数（防止超大文件） */
  MAX_CHUNKS: 1000,
  /** 批量索引的批次大小 */
  BATCH_SIZE: 100,
} as const;

