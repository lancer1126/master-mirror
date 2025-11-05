import { ipcMain } from 'electron';
import { copyFile, mkdir } from 'fs/promises';
import { basename, join } from 'path';

import { getStore } from './appConfig';

/**
 * 上传文件到索引目录
 * @param filePaths 文件路径数组
 * @returns 成功上传的文件列表
 */
async function uploadFiles(filePaths: string[]): Promise<{ success: string[]; failed: string[] }> {
  const store = getStore();
  const searchIndexPath = store.get('searchIndexPath');

  if (!searchIndexPath) {
    throw new Error('未设置索引文件保存位置');
  }

  // 确保目标目录存在
  await mkdir(searchIndexPath, { recursive: true });

  const success: string[] = [];
  const failed: string[] = [];

  for (const filePath of filePaths) {
    try {
      const fileName = basename(filePath);
      const destPath = join(searchIndexPath, fileName);

      // 复制文件到目标目录
      await copyFile(filePath, destPath);
      success.push(fileName);

      console.log(`文件上传成功: ${fileName} -> ${destPath}`);
    } catch (error) {
      console.error(`文件上传失败: ${filePath}`, error);
      failed.push(basename(filePath));
    }
  }

  return { success, failed };
}

/**
 * 注册文件上传相关的 IPC 处理程序
 */
export function registerUploadHandlers(): void {
  // 上传文件
  ipcMain.handle('file:upload', async (_event, filePaths: string[]) => {
    try {
      const result = await uploadFiles(filePaths);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        error: error.message || '文件上传失败',
      };
    }
  });
}

