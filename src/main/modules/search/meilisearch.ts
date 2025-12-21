import { MEILISEARCH_CONFIG, OPEN_API } from '@shared/config';
import axios from 'axios';
import { ChildProcess, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';

import { getStore } from '../system/appConfig';
import { fileDownloader } from '../system/downloader';

/**
 * Meilisearch 服务管理类
 */
class MeilisearchService {
  /** Meilisearch 进程实例 */
  private process: ChildProcess | null = null;

  /** 服务是否正在运行 */
  private isRunning: boolean = false;

  /** 状态缓存（用于窗口加载完成后发送） */
  private status: { status: 'success' | 'error'; message: string } | null = null;

  /**
   * 获取实际使用的可执行文件路径（使用配置中的路径）
   */
  private getExecutablePath(): string {
    const store = getStore();
    const meilisearchPath = store.get('meilisearchPath');

    // 如果配置了路径且文件存在，使用配置的路径
    if (meilisearchPath && meilisearchPath.trim() !== '' && existsSync(meilisearchPath)) {
      return meilisearchPath;
    } else {
      throw new Error('Meilisearch 可执行文件不存在');
    }
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
  async initialize(mainWindow: Electron.BrowserWindow | null): Promise<void> {
    try {
      await this.start();
      this.status = {
        status: 'success',
        message: 'Meilisearch 服务已启动',
      };

      // 发送状态通知
      if (mainWindow && !mainWindow.webContents.isLoading()) {
        mainWindow.webContents.send('meilisearch:status', this.status);
      }
    } catch (error: any) {
      console.error('[App] Meilisearch 服务启动失败:', error);

      this.status = {
        status: 'error',
        message: `Meilisearch 启动失败: ${error.message}`,
      };

      // 发送状态通知
      if (mainWindow && !mainWindow.webContents.isLoading()) {
        mainWindow.webContents.send('meilisearch:status', this.status);
      }
    }
  }

  /**
   * 内部启动逻辑
   */
  private async start(): Promise<void> {
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
      this.process.on('exit', () => {
        this.isRunning = false;
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
   * 获取服务状态对象
   */
  getStatusObject(): { isRunning: boolean; port: number; host: string } {
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
   * 获取缓存的状态消息
   */
  getCachedStatus(): { status: 'success' | 'error'; message: string } | null {
    return this.status;
  }
}

/**
 * Meilisearch 服务单例
 */
const meilisearchService = new MeilisearchService();

/**
 * 设置窗口的 Meilisearch 状态监听
 * 在窗口加载完成后自动发送缓存的状态
 * @param mainWindow 主窗口实例
 */
export function setupMeilisearchStatusListener(mainWindow: Electron.BrowserWindow): void {
  mainWindow.webContents.on('did-finish-load', () => {
    const status = meilisearchService.getCachedStatus();
    if (status && mainWindow) {
      mainWindow.webContents.send('meilisearch:status', status);
    }
  });
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
    return meilisearchService.getCachedStatus();
  });

  // 注册 Meilisearch 自动下载
  ipcMain.handle('meilisearch:download', async (_, dataPath: string) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const saveDir = join(dataPath, 'bin');

    try {
      // 1. 调用 API 获取最新发行版信息
      console.log('[Meilisearch] 正在获取最新版本信息...');
      const releaseApiUrl = OPEN_API.MEILISEARCH_RELEASE;
      const response = await axios.get(releaseApiUrl);
      if (!response.data) {
        throw new Error('无法获取 Meilisearch 发行版信息，API 返回为空');
      }

      const releaseData = response.data;
      const tagName = releaseData.tag_name;
      const assets = releaseData.assets;
      if (!assets || assets.length === 0) {
        throw new Error('发行版中没有可用的资源文件');
      }

      // 2. 从 assets 中筛选包含 windows-amd64 的文件
      const windowsAsset = assets.find((asset: any) =>
        asset.name && asset.name.includes('windows-amd64')
      );
      if (!windowsAsset) {
        throw new Error('未找到 Windows AMD64 版本的 Meilisearch');
      }

      const downloadUrl = windowsAsset.browser_download_url;
      console.log('[Meilisearch] 找到下载地址:', downloadUrl);
      console.log('[Meilisearch] 版本:', tagName);

      // 3. 下载并解压文件（临时使用原始文件名）
      const tempFileName = 'meilisearch-windows-amd64.exe';
      const execPath = await fileDownloader.downloadFile({
        url: downloadUrl,
        saveDir: saveDir,
        fileName: tempFileName,
        mainWindow: mainWindow,
        progressChannel: 'meilisearch:download-progress',
      });

      // 4. 重命名文件，加上版本号
      // meilisearch-windows-amd64.exe -> meilisearch-v1.30.0-windows-amd64.exe
      const versionedFileName = `meilisearch-${tagName}-windows-amd64.exe`;
      const versionedPath = join(saveDir, versionedFileName);

      if (existsSync(versionedPath)) {
        console.log('[Meilisearch] 删除旧版本文件:', versionedPath);
        try {
          unlinkSync(versionedPath);
        } catch (e) {
          console.warn('[Meilisearch] 删除旧文件失败:', e);
        }
      }

      renameSync(execPath, versionedPath);
      console.log('[Meilisearch] 文件已重命名为:', versionedFileName);

      return { success: true, path: versionedPath, version: tagName };
    } catch (error: any) {
      console.error('[Meilisearch] 下载失败:', error);
      return { success: false, message: error.message };
    }
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
