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
 * 开发服务器配置
 */
export const DEV_SERVER = {
  /** 开发服务器端口（与 electron.vite.config.ts 中的配置保持一致） */
  PORT: 5173,
  /** 开发服务器主机 */
  HOST: 'localhost',
  /** 获取完整 URL */
  get URL() {
    return `http://${this.HOST}:${this.PORT}`;
  },
} as const;