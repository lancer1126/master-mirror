/**
 * 全局配置类
 * 支持主进程和渲染进程统一访问环境变量
 */

class Config {
  /**
   * 获取环境变量
   * 自动判断当前环境（主进程/渲染进程）
   */
  private getEnv(key: string): string {
    let value: string | undefined;

    // 判断是否在渲染进程（浏览器环境）
    if (typeof window !== 'undefined' && typeof import.meta !== 'undefined') {
      // 渲染进程使用 import.meta.env
      value = (import.meta.env as Record<string, string>)[key];
    } else {
      // 主进程使用 process.env
      value = process.env[key];
    }

    if (!value) {
      throw new Error(`环境变量 ${key} 未配置，请检查 .env 文件`);
    }

    return value;
  }

  /**
   * 获取数字类型环境变量
   */
  private getEnvNumber(key: string): number {
    const value = this.getEnv(key);
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`环境变量 ${key} 必须是数字，当前值: ${value}`);
    }
    return num;
  }

  // ============ 应用信息 ============
  get APP_NAME(): string {
    return this.getEnv('VITE_APP_NAME');
  }

  get APP_ID(): string {
    return this.getEnv('VITE_APP_ID');
  }

  get APP_VERSION(): string {
    return this.getEnv('VITE_APP_VERSION');
  }

  // ============ 窗口配置 ============
  get WINDOW_WIDTH(): number {
    return this.getEnvNumber('VITE_WINDOW_WIDTH');
  }

  get WINDOW_HEIGHT(): number {
    return this.getEnvNumber('VITE_WINDOW_HEIGHT');
  }

  // ============ Meilisearch 配置 ============
  get MEILISEARCH_HOST(): string {
    return this.getEnv('VITE_MEILISEARCH_HOST');
  }

  get MEILISEARCH_PORT(): number {
    return this.getEnvNumber('VITE_MEILISEARCH_PORT');
  }

  get MEILISEARCH_STARTUP_TIMEOUT(): number {
    return this.getEnvNumber('VITE_MEILISEARCH_STARTUP_TIMEOUT');
  }

  get MEILISEARCH_MASTER_KEY(): string {
    return this.getEnv('VITE_MEILISEARCH_MASTER_KEY');
  }

  get MEILISEARCH_INDEX(): string {
    return this.getEnv('VITE_MEILISEARCH_INDEX');
  }

  // ============ meilisearch发行版的api(GitHub或者Gitee) ============
  get MEILISEARCH_RELEASE_API(): string {
    return this.getEnv('VITE_MEILISEARCH_RELEASE_API');
  }

  // ============ 文件解析器配置 ============
  get PDF_CHUNK_SIZE(): number {
    return this.getEnvNumber('VITE_PDF_CHUNK_SIZE');
  }

  get MAX_CHUNKS(): number {
    return this.getEnvNumber('VITE_MAX_CHUNKS');
  }

  get BATCH_SIZE(): number {
    return this.getEnvNumber('VITE_BATCH_SIZE');
  }
}

/**
 * 导出配置实例（单例）
 */
export const config = new Config();

/**
 * 导出便捷的常量对象（向后兼容）
 */
export const APP_INFO = {
  get NAME() {
    return config.APP_NAME;
  },
  get APP_ID() {
    return config.APP_ID;
  },
  get VERSION() {
    return config.APP_VERSION;
  },
} as const;

export const WINDOW = {
  get DEFAULT_WIDTH() {
    return config.WINDOW_WIDTH;
  },
  get DEFAULT_HEIGHT() {
    return config.WINDOW_HEIGHT;
  },
} as const;

export const MEILISEARCH_CONFIG = {
  get HOST() {
    return config.MEILISEARCH_HOST;
  },
  get DEFAULT_PORT() {
    return config.MEILISEARCH_PORT;
  },
  get STARTUP_TIMEOUT() {
    return config.MEILISEARCH_STARTUP_TIMEOUT;
  },
  get MASTER_KEY() {
    return config.MEILISEARCH_MASTER_KEY;
  },
  get DEFAULT_INDEX() {
    return config.MEILISEARCH_INDEX;
  },
} as const;

export const OPEN_API = {
  get MEILISEARCH_RELEASE() {
    return config.MEILISEARCH_RELEASE_API;
  },
} as const;

export const PARSER_CONFIG = {
  get PDF_CHUNK_SIZE() {
    return config.PDF_CHUNK_SIZE;
  },
  get MAX_CHUNKS() {
    return config.MAX_CHUNKS;
  },
  get BATCH_SIZE() {
    return config.BATCH_SIZE;
  },
} as const;

/**
 * 其他不从环境变量读取的常量
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
