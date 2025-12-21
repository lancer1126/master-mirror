/**
 * 文件上传和索引模块
 * 负责文件解析和索引到 Meilisearch
 */

import { dbService } from '@main/modules/database/dbService';
import { deleteDocumentsByFileId, meilisearchService } from '@main/modules/search/meilisearch';
import type { ParsedChunk, ParseProgress } from '@main/parsers';
import { parserFactory } from '@main/parsers';
import { generateFileHash } from '@main/utils';
import { MEILISEARCH_CONFIG, PARSER_CONFIG } from '@shared/config';
import { BrowserWindow, ipcMain } from 'electron';
import { MeiliSearch } from 'meilisearch';
import { basename } from 'path';

/**
 * 解析并索引文件
 * @param filePaths 文件路径数组
 * @param mainWindow 主窗口实例（用于发送进度通知）
 */
async function parseAndIndexFiles(
  filePaths: string[],
  mainWindow: BrowserWindow | null,
): Promise<{
  success: string[];
  failed: Array<{ fileName: string; error: string }>;
}> {
  const success: string[] = [];
  const failed: Array<{ fileName: string; error: string }> = [];

  // 创建 Meilisearch 客户端
  const meilisearchClient = new MeiliSearch({
    host: meilisearchService.getUrl(),
    apiKey: meilisearchService.getMasterKey(),
  });

  const index = meilisearchClient.index(MEILISEARCH_CONFIG.DEFAULT_INDEX);

  // 逐个处理文件
  for (const filePath of filePaths) {
    const fileName = basename(filePath);

    try {
      // 1. 检查文件类型是否支持
      if (!parserFactory.isSupported(filePath)) {
        throw new Error(`不支持的文件类型`);
      }

      // 2. 获取解析器
      const parser = parserFactory.getParser(filePath);
      if (!parser) {
        throw new Error(`无法获取解析器`);
      }

      // 进度回调：发送进度到渲染进程
      const progressCallback = (progress: ParseProgress) => {
        mainWindow?.webContents.send('file:parse:progress', progress);
      };

      console.log(`[Upload] 开始解析文件: ${fileName}`);

      // 生成文件 ID（提前生成，用于 chunks 和数据库记录）
      const fileId = generateFileHash(filePath);

      const parseResult = await parser.parse(
        filePath,
        {
          chunkSize: PARSER_CONFIG.PDF_CHUNK_SIZE,
          maxChunks: PARSER_CONFIG.MAX_CHUNKS,
          extractMetadata: true,
        },
        progressCallback,
      );

      console.log(`[Upload] 解析结果:`, {
        success: parseResult.success,
        fileName: parseResult.fileName,
        chunksLength: parseResult.chunks.length,
        total: parseResult.total,
        error: parseResult.error,
      });

      if (!parseResult.success) {
        throw new Error(parseResult.error || '文件解析失败');
      }

      if (parseResult.chunks.length === 0) {
        throw new Error('解析结果为空，没有提取到任何内容');
      }

      console.log(`[Upload] 文件解析成功: ${fileName}, 分块数: ${parseResult.chunks.length}`);

      // 3. 给每个 chunk 添加 fileId（与数据库记录保持一致）
      parseResult.chunks.forEach((chunk) => {
        chunk.fileId = fileId;
      });

      // 4. 批量索引到 Meilisearch
      await indexChunks(index, parseResult.chunks, fileName, mainWindow, meilisearchClient);

      // 5. 保存上传记录到数据库
      try {
        const uploadTime = formatDateTime(new Date());
        dbService.addUploadRecord({
          fileId,
          fileName,
          filePath,
          uploadTime,
        });
        console.log(`[Upload] 上传记录已保存: ${fileName}`);
      } catch (dbError: any) {
        console.error(`[Upload] 保存上传记录失败: ${fileName}`, dbError);
        // 不影响主流程，继续执行
      }

      success.push(fileName);
      console.log(`[Upload] 文件处理完成: ${fileName}`);
    } catch (error: any) {
      console.error(`[Upload] 文件处理失败: ${fileName}`, error);
      failed.push({
        fileName,
        error: error.message || '处理失败',
      });

      // 发送失败通知
      mainWindow?.webContents.send('file:parse:progress', {
        fileName,
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: error.message || '处理失败',
      });
    }
  }

  return { success, failed };
}

/**
 * 批量索引文档分块到 Meilisearch
 */
async function indexChunks(
  index: any,
  chunks: ParsedChunk[],
  fileName: string,
  mainWindow: BrowserWindow | null,
  client: MeiliSearch,
): Promise<void> {
  const totalChunks = chunks.length;
  const batchSize = PARSER_CONFIG.BATCH_SIZE;

  console.log(`[Upload] 开始索引: ${fileName}, 总分块数: ${totalChunks}`);
  console.log(`[Upload] 目标索引: ${MEILISEARCH_CONFIG.DEFAULT_INDEX}`);

  // 分批索引
  for (let i = 0; i < totalChunks; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, totalChunks));

    console.log(`[Upload] 准备索引批次 ${Math.floor(i / batchSize) + 1}:`, {
      batchSize: batch.length,
      firstId: batch[0]?.id,
    });

    // 发送索引进度
    mainWindow?.webContents.send('file:parse:progress', {
      fileName,
      current: Math.min(i + batchSize, totalChunks),
      total: totalChunks,
      percentage: Math.floor((Math.min(i + batchSize, totalChunks) / totalChunks) * 100),
      status: 'indexing',
      message: `正在索引 ${Math.min(i + batchSize, totalChunks)}/${totalChunks} 个分块...`,
    });

    try {
      // 批量添加文档
      const response = await index.addDocuments(batch, { primaryKey: 'id' });
      console.log(`[Upload] 批次索引提交: taskUid=${response.taskUid}, status=${response.status}`);

      // 等待任务完成（使用 client.tasks.waitForTask）
      const task = await client.tasks.waitForTask(response.taskUid, {
        timeout: 30000, // 30秒超时
        interval: 100, // 每100ms检查一次
      });

      console.log(
        `[Upload] 批次索引完成: ${i + 1}-${Math.min(i + batchSize, totalChunks)}/${totalChunks}, 任务状态: ${task.status}`,
      );

      if (task.status === 'failed') {
        console.error(`[Upload] 索引任务失败:`, task.error);
        throw new Error(`索引失败: ${task.error?.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error(`[Upload] 批次索引失败:`, error);
      throw error;
    }
  }

  // 发送索引完成通知
  mainWindow?.webContents.send('file:parse:progress', {
    fileName,
    current: totalChunks,
    total: totalChunks,
    percentage: 100,
    status: 'completed',
    message: '索引完成',
  });

  console.log(`[Upload] 索引完成: ${fileName}`);

  // 验证索引结果
  try {
    const stats = await index.getStats();
    console.log(`[Upload] 索引统计信息:`, {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
    });
  } catch (error) {
    console.error(`[Upload] 获取索引统计失败:`, error);
  }
}

/**
 * 删除文件（同时删除数据库记录和 Meilisearch 索引）
 */
async function deleteFile(fileId: string): Promise<void> {
  console.log(`[Upload] 开始删除文件: ${fileId}`);

  // 1. 检查记录是否存在
  const record = dbService.getUploadRecordById(fileId);
  if (!record) {
    throw new Error('文件记录不存在');
  }

  // 2. 删除 Meilisearch 索引（直接使用 fileId，更快更准确）
  try {
    const deletedCount = await deleteDocumentsByFileId(fileId);
    console.log(`[Upload] 索引删除完成，删除了 ${deletedCount} 个分块`);
  } catch (error: any) {
    console.error('[Upload] 删除索引失败:', error);
    throw new Error(`删除索引失败: ${error.message}`);
  }

  // 3. 删除数据库记录
  dbService.deleteUploadRecord(fileId);
  console.log(`[Upload] 数据库记录删除完成`);
}

/**
 * 获取支持的文件类型
 */
function getSupportedFileTypes(): string[] {
  return parserFactory.getSupportedExtensions();
}

/**
 * 格式化日期时间为 yyyy-MM-dd HH:mm:ss
 */
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 注册文件上传相关的 IPC 处理程序
 */
export function registerUploadHandlers(): void {
  // 解析并索引文件
  ipcMain.handle('file:upload', async (event, filePaths: string[]) => {
    try {
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      const result = await parseAndIndexFiles(filePaths, mainWindow);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('[Upload] 文件处理失败:', error);
      return {
        success: false,
        error: error.message || '文件处理失败',
      };
    }
  });

  // 删除文件（包括数据库记录和索引）
  ipcMain.handle('file:delete', async (_, fileId: string) => {
    try {
      await deleteFile(fileId);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[Upload] 删除文件失败:', error);
      return {
        success: false,
        error: error.message || '删除文件失败',
      };
    }
  });

  // 获取支持的文件类型
  ipcMain.handle('file:getSupportedTypes', async () => {
    try {
      return {
        success: true,
        data: getSupportedFileTypes(),
      };
    } catch (error: any) {
      console.error('[Upload] 获取支持的文件类型失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });
}
