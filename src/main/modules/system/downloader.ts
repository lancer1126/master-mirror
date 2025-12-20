import axios from 'axios';
import { BrowserWindow } from 'electron';
import { chmodSync,createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';

export interface DownloadOptions {
  url: string;           // 下载地址
  saveDir: string;       // 保存目录
  fileName: string;      // 保存文件名
  mainWindow?: BrowserWindow; // 用于发送进度的窗口
  progressChannel?: string;   // 进度 IPC 频道名
  headers?: Record<string, string>; // 自定义请求头
}

/**
 * 通用文件下载器
 * 支持流式下载、Gzip解压、断点清理
 */
export class FileDownloader {
  /**
   * 下载并（可选）解压文件
   * @param options 下载配置
   * @returns 最终文件的完整路径
   */
  async downloadFile(options: DownloadOptions): Promise<string> {
    const { url, saveDir, fileName, mainWindow, progressChannel, headers } = options;
    
    const tempDir = join(saveDir, 'temp');
    const tempFilePath = join(tempDir, fileName);
    const finalFilePath = join(saveDir, fileName);

    console.log('[Downloader] 开始下载:', url);
    console.log('[Downloader] 目标路径:', finalFilePath);

    try {
      // 1. 准备目录
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      if (!existsSync(saveDir)) {
        mkdirSync(saveDir, { recursive: true });
      }

      // 清理旧的临时文件
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
        } catch (e) {
          console.warn('[Downloader] 清理旧临时文件失败:', e);
        }
      }
      
      // 清理可能存在的旧版本目标文件
      if (existsSync(finalFilePath)) {
        try { unlinkSync(finalFilePath); } catch (e) {
            console.warn('[Downloader] 无法删除旧文件，可能是正在运行:', e);
        }
      }

      // 2. 发起请求
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'MasterMirror/1.0.0',
          ...headers
        },
      });

      const totalLength = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedLength = 0;

      // 3. 监听下载进度
      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        if (totalLength > 0 && mainWindow && progressChannel) {
          const percent = Math.round((downloadedLength / totalLength) * 100);
          // 限制发送频率 (每5%发送一次，或最后一次)
          if (percent % 5 === 0 || percent === 100) {
             mainWindow.webContents.send(progressChannel, percent);
          }
        }
      });

      // 4. 管道流处理
      // 自动检测是否需要解压：如果响应头是 gzip，或者 URL 看起来像 gzip 但我们要存的文件名不是 .gz
      const isGzip = 
        response.headers['content-type'] === 'application/gzip' || 
        response.headers['content-type'] === 'application/x-gzip';

      const writer = createWriteStream(tempFilePath);

      if (isGzip) {
        // 如果服务器返回的是 gzip 流，自动解压
        console.log('[Downloader] 检测到 Gzip 流，启用自动解压...');
        const gunzip = createGunzip();
        await pipeline(response.data, gunzip, writer);
      } else {
        // 普通下载
        await pipeline(response.data, writer);
      }

      console.log('[Downloader] 下载完成');

      // 5. 移动文件到最终位置
      renameSync(tempFilePath, finalFilePath);
      
      // 6. 赋予执行权限 (Linux/macOS)
      if (process.platform !== 'win32') {
        chmodSync(finalFilePath, 0o755);
      }

      // 7. 清理临时目录
      try {
         if (existsSync(tempDir)) {
             // 简单的删除空目录
             const fs = require('fs');
             fs.rmSync(tempDir, { recursive: true, force: true });
         }
      } catch (e) {
        console.warn('[Downloader] 清理临时目录失败:', e);
      }

      return finalFilePath;

    } catch (error: any) {
      console.error('[Downloader] 下载失败:', error);
      
      // 清理残留
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
        } catch (e) {
          console.warn('[Downloader] 清理残留文件失败:', e);
        }
      }
      
      throw new Error(`下载失败: ${error.message}`);
    }
  }
}

export const fileDownloader = new FileDownloader();
