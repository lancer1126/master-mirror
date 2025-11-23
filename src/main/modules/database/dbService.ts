/**
 * 数据库服务 - 使用 better-sqlite3 管理上传记录
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import type { UploadRecord } from '../../types/database';
import { getStore } from '../system/appConfig';

class DatabaseService {
  private db: Database.Database | null = null;

  /**
   * 初始化数据库
   */
  initialize(): void {
    try {
      // 从配置中获取数据保存路径
      const store = getStore();
      const dataPath = store.get('dataPath');
      const dbDir = join(dataPath, 'db');

      // 确保目录存在
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
        console.log('[DB] 创建数据目录:', dbDir);
      }

      // 数据库文件存储在配置的数据目录下
      const dbFile = join(dbDir, 'master-mirror.db');
      console.log('[DB] 数据库路径:', dbFile);

      this.db = new Database(dbFile);
      this.db.pragma('journal_mode = WAL'); // 启用 WAL 模式提升性能

      // 创建表
      this.createTables();

      console.log('[DB] 数据库初始化成功');
    } catch (error) {
      console.error('[DB] 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建表结构
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    // 创建上传记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS upload_records (
        fileId TEXT PRIMARY KEY,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        uploadTime TEXT NOT NULL
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_upload_time 
      ON upload_records(uploadTime DESC)
    `);
  }

  /**
   * 添加上传记录
   */
  addUploadRecord(record: UploadRecord): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO upload_records (fileId, fileName, filePath, uploadTime)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(record.fileId, record.fileName, record.filePath, record.uploadTime);
    console.log('[DB] 添加上传记录:', record.fileName);
  }

  /**
   * 获取所有上传记录（按上传时间倒序）
   */
  getAllUploadRecords(): UploadRecord[] {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const stmt = this.db.prepare(`
      SELECT fileId, fileName, filePath, uploadTime 
      FROM upload_records 
      ORDER BY uploadTime DESC
    `);

    return stmt.all() as UploadRecord[];
  }

  /**
   * 根据 fileId 获取上传记录
   */
  getUploadRecordById(fileId: string): UploadRecord | undefined {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const stmt = this.db.prepare(`
      SELECT fileId, fileName, filePath, uploadTime 
      FROM upload_records 
      WHERE fileId = ?
    `);

    return stmt.get(fileId) as UploadRecord | undefined;
  }

  /**
   * 删除上传记录
   */
  deleteUploadRecord(fileId: string): void {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const stmt = this.db.prepare(`
      DELETE FROM upload_records WHERE fileId = ?
    `);

    stmt.run(fileId);
    console.log('[DB] 删除上传记录:', fileId);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[DB] 数据库连接已关闭');
    }
  }
}

// 导出单例
export const dbService = new DatabaseService();
