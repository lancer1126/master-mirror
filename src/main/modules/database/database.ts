/**
 * 数据库相关的 IPC 处理程序
 */

import { ipcMain } from 'electron';

import { dbService } from './dbService';

/**
 * 注册数据库相关的 IPC 处理程序
 */
export function registerDatabaseHandlers(): void {
  // 获取所有上传记录
  ipcMain.handle('db:getUploadRecords', async () => {
    try {
      const records = dbService.getAllUploadRecords();
      return {
        success: true,
        data: records,
      };
    } catch (error: any) {
      console.error('[DB] 获取上传记录失败:', error);
      return {
        success: false,
        error: error.message || '获取上传记录失败',
      };
    }
  });

  // 根据 fileId 获取上传记录
  ipcMain.handle('db:getUploadRecordById', async (_, fileId: string) => {
    try {
      const record = dbService.getUploadRecordById(fileId);
      return {
        success: true,
        data: record,
      };
    } catch (error: any) {
      console.error('[DB] 获取上传记录失败:', error);
      return {
        success: false,
        error: error.message || '获取上传记录失败',
      };
    }
  });
}

