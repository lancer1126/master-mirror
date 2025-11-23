import { ChildProcess, spawn } from 'child_process';
import { app, ipcMain } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { MEILISEARCH_CONFIG } from '../../constants';
import { getStore } from '../system/appConfig';

/**
 * Meilisearch 服务管理类
 */
class MeilisearchService {
  /** Meilisearch 进程实例 */
  private process: ChildProcess | null = null;

  /** 服务是否正在运行 */
  private isRunning: boolean = false;

  /** Meilisearch 可执行文件路径 */
  private readonly executablePath: string;

  constructor() {
    // 初始化时先使用默认路径，实际启动时会检查是否使用自定义路径
    const execName =
      process.platform === 'win32'
        ? MEILISEARCH_CONFIG.EXEC_WIN_NAME
        : MEILISEARCH_CONFIG.EXEC_DEFAULT_NAME;

    // 开发环境：使用项目根目录下的 bin 文件夹
    // 生产环境：使用打包后的 resources 目录
    if (app.isPackaged) {
      // 生产环境：resources/bin/meilisearch
      this.executablePath = join(process.resourcesPath, 'bin', execName);
    } else {
      // 开发环境：项目根目录/bin/meilisearch
      this.executablePath = join(app.getAppPath(), 'bin', execName);
    }
  }

  /**
   * 获取实际使用的可执行文件路径（使用配置中的路径）
   */
  private getExecutablePath(): string {
    const store = getStore();
    const meilisearchPath = store.get('meilisearchPath');

    // 如果配置了路径且文件存在，使用配置的路径
    if (meilisearchPath && meilisearchPath.trim() !== '' && existsSync(meilisearchPath)) {
      return meilisearchPath;
    }

    // 否则使用默认路径（兼容旧版本或未配置的情况）
    return this.executablePath;
  }

  /**
   * 获取端口号（考虑自定义配置）
   */
  private getPort(): number {
    const store = getStore();
    const port = store.get('meilisearchPort');
    return port || MEILISEARCH_CONFIG.DEFAULT_PORT;
  }

  /**
   * 获取数据目录路径
   */
  private getDataPath(): string {
    const store = getStore();
    const dataPath = store.get('dataPath');

    // 在 dataPath 下创建 meilisearch 子目录
    const meilisearchPath = join(dataPath, 'meilisearch');

    // 确保目录存在
    if (!existsSync(meilisearchPath)) {
      mkdirSync(meilisearchPath, { recursive: true });
      console.log('[Meilisearch] 创建数据目录:', meilisearchPath);
    }

    return meilisearchPath;
  }

  /**
   * 启动 Meilisearch 服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Meilisearch] 服务已在运行中');
      return;
    }

    // 获取实际使用的可执行文件路径和端口
    const execPath = this.getExecutablePath();
    const port = this.getPort();

    // 检查可执行文件是否存在
    if (!existsSync(execPath)) {
      throw new Error(`Meilisearch 可执行文件不存在: ${execPath}`);
    }

    const dataPath = this.getDataPath();

    console.log('[Meilisearch] 正在启动服务...');
    console.log('[Meilisearch] 可执行文件:', execPath);
    console.log('[Meilisearch] 数据目录:', dataPath);
    console.log('[Meilisearch] 端口:', port);

    return new Promise((resolve, reject) => {
      // 启动参数
      const args = [
        '--db-path',
        dataPath,
        '--http-addr',
        `${MEILISEARCH_CONFIG.HOST}:${port}`,
        '--master-key',
        MEILISEARCH_CONFIG.MASTER_KEY,
        '--dump-dir',
        join(dataPath, 'dumps'), // 指定 dumps 目录
        '--snapshot-dir',
        join(dataPath, 'snapshots'), // 指定 snapshots 目录
        '--no-analytics', // 禁用分析数据收集
      ];

      // 启动进程
      this.process = spawn(execPath, args, {
        stdio: 'pipe', // 使用管道捕获输出
        windowsHide: true, // Windows 下隐藏控制台窗口
        cwd: dataPath, // 设置工作目录为数据目录
      });

      // 超时处理
      const timeout = setTimeout(() => {
        reject(new Error('Meilisearch 启动超时'));
      }, MEILISEARCH_CONFIG.STARTUP_TIMEOUT);

      // 检测启动成功的函数
      const checkStartupSuccess = (output: string) => {
        if (
          output.includes('Server listening on') ||
          output.includes('listening on') ||
          output.includes('starting service')
        ) {
          if (!this.isRunning) {
            clearTimeout(timeout);
            this.isRunning = true;
            console.log('[Meilisearch] 服务启动成功!');
            console.log(`[Meilisearch] 访问地址: http://${MEILISEARCH_CONFIG.HOST}:${port}`);
            resolve();
          }
        }
      };

      // 监听标准输出
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        // console.log('[Meilisearch]', output.trim());
        checkStartupSuccess(output);
      });

      // 监听标准错误输出（Meilisearch 主要使用 stderr 输出日志）
      this.process.stderr?.on('data', (data) => {
        const output = data.toString();
        // console.log('[Meilisearch]', output.trim());
        checkStartupSuccess(output);
      });

      // 监听进程退出
      this.process.on('exit', (code, signal) => {
        this.isRunning = false;
        console.log(`[Meilisearch] 进程退出, 代码: ${code}, 信号: ${signal}`);
      });

      // 监听进程错误
      this.process.on('error', (error) => {
        clearTimeout(timeout);
        this.isRunning = false;
        console.error('[Meilisearch] 进程错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 停止 Meilisearch 服务
   */
  async stop(): Promise<void> {
    if (!this.process || !this.isRunning) {
      console.log('[Meilisearch] 服务未运行');
      return;
    }

    console.log('[Meilisearch] 正在停止服务...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      // 监听进程退出
      this.process.once('exit', () => {
        this.isRunning = false;
        this.process = null;
        resolve();
      });

      // 发送终止信号
      if (process.platform === 'win32') {
        // Windows 使用 taskkill
        spawn('taskkill', ['/pid', this.process.pid!.toString(), '/f', '/t']);
      } else {
        // Unix-like 系统使用 SIGTERM
        this.process.kill('SIGTERM');
      }

      // 如果 3 秒后还没退出，强制杀死
      setTimeout(() => {
        if (this.process && this.isRunning) {
          console.warn('[Meilisearch] 强制终止进程');
          this.process.kill('SIGKILL');
          this.isRunning = false;
          this.process = null;
          resolve();
        }
      }, 3000);
    });
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isRunning: boolean; port: number; host: string } {
    const port = this.getPort();
    return {
      isRunning: this.isRunning,
      port,
      host: MEILISEARCH_CONFIG.HOST,
    };
  }

  /**
   * 获取服务 URL
   */
  getUrl(): string {
    const port = this.getPort();
    return `http://${MEILISEARCH_CONFIG.HOST}:${port}`;
  }

  /**
   * 获取 Master Key
   */
  getMasterKey(): string {
    return MEILISEARCH_CONFIG.MASTER_KEY;
  }

  /**
   * 获取最后一次启动的错误信息
   */
  getLastError(): string | null {
    return null; // 暂时返回 null，可以在启动失败时缓存错误信息
  }
}

/**
 * Meilisearch 服务单例
 */
const meilisearchService = new MeilisearchService();

/**
 * Meilisearch 状态缓存（用于窗口加载完成后发送）
 */
let meilisearchStatus: { status: 'success' | 'error'; message: string } | null = null;

/**
 * 初始化 Meilisearch 服务（后台启动）
 * @param mainWindow 主窗口实例
 */
export function initializeMeilisearch(mainWindow: Electron.BrowserWindow): void {
  // 后台启动 Meilisearch 服务
  meilisearchService
    .start()
    .then(() => {
      console.log('[App] Meilisearch 服务启动成功');
      // 缓存状态
      meilisearchStatus = {
        status: 'success',
        message: 'Meilisearch 服务已启动',
      };
      // 如果窗口已经加载完成，立即发送
      if (mainWindow && mainWindow.webContents.isLoading() === false) {
        mainWindow.webContents.send('meilisearch:status', meilisearchStatus);
      }
    })
    .catch((error) => {
      console.error('[App] Meilisearch 服务启动失败:', error);
      // 缓存状态
      meilisearchStatus = {
        status: 'error',
        message: `Meilisearch 启动失败: ${error.message}`,
      };
      // 如果窗口已经加载完成，立即发送
      if (mainWindow && mainWindow.webContents.isLoading() === false) {
        mainWindow.webContents.send('meilisearch:status', meilisearchStatus);
      }
    });
}

/**
 * 设置窗口的 Meilisearch 状态监听
 * 在窗口加载完成后自动发送缓存的状态
 * @param mainWindow 主窗口实例
 */
export function setupMeilisearchStatusListener(mainWindow: Electron.BrowserWindow): void {
  mainWindow.webContents.on('did-finish-load', () => {
    if (meilisearchStatus && mainWindow) {
      mainWindow.webContents.send('meilisearch:status', meilisearchStatus);
    }
  });
}

/**
 * 获取当前 Meilisearch 状态
 */
export function getMeilisearchStatus(): { status: 'success' | 'error'; message: string } | null {
  return meilisearchStatus;
}

/**
 * 停止 Meilisearch 服务
 */
export async function stopMeilisearch(): Promise<void> {
  await meilisearchService.stop();
}

/**
 * 注册 Meilisearch 相关的 IPC 处理程序
 */
export function registerMeilisearchHandlers(): void {
  // 注册 Meilisearch 状态查询
  ipcMain.handle('meilisearch:getStatus', () => {
    return getMeilisearchStatus();
  });
}

/**
 * 设置应用退出时的 Meilisearch 清理逻辑
 */
export function setupMeilisearchCleanup(): void {
  let isQuitting = false;

  app.on('before-quit', async (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault(); // 阻止立即退出，等待清理完成
    isQuitting = true;

    // 停止 Meilisearch 服务
    try {
      await meilisearchService.stop();
      console.log('[Meilisearch] 服务已停止');
    } catch (error) {
      console.error('[Meilisearch] 停止服务失败:', error);
    } finally {
      // 清理完成，退出应用
      app.quit();
    }
  });
}

/**
 * 导出服务实例和配置
 */
export { MEILISEARCH_CONFIG, meilisearchService };
