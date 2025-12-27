/**
 * PDF 文件解析器
 * 使用 pdfjs-dist 进行分页解析
 */

import type {
  IFileParser,
  ParsedChunk,
  ParseOptions,
  ParseProgress,
  ParseResult,
} from '@shared/types';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { generateChunkId } from '../utils';

// 默认配置
const DEFAULT_CHUNK_SIZE = 50; // 每个分块50页
const MAX_CHUNKS = 1000; // 最多1000个分块（避免超大文件）
const EXTENSIONS = ['.pdf']; // 支持pdf格式

/**
 * PDF 解析器
 */
export class PdfParser implements IFileParser {
  readonly supportedExtensions = EXTENSIONS;

  /**
   * 解析 PDF 文件
   */
  async parse(
    filePath: string,
    options?: ParseOptions,
    progressCallback?: (progress: ParseProgress) => void,
  ): Promise<ParseResult> {
    const fileName = basename(filePath);
    const chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE;
    const maxChunks = options?.maxChunks || MAX_CHUNKS;

    try {
      // 通知开始解析
      progressCallback?.({
        fileName,
        current: 0,
        total: 100,
        percentage: 0,
        status: 'parsing',
        message: '正在加载PDF文件...',
      });

      // 读取文件
      const dataBuffer = await readFile(filePath);
      const data = new Uint8Array(dataBuffer);

      // 加载 PDF 文档
      const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        standardFontDataUrl: undefined, // 不加载标准字体以提高性能
      });

      const pdfDocument = await loadingTask.promise;
      const totalPages = pdfDocument.numPages;

      // 计算分块信息
      const totalChunks = Math.min(Math.ceil(totalPages / chunkSize), maxChunks);
      const chunks: ParsedChunk[] = [];

      console.log(
        `[PdfParser] 开始解析: ${fileName}, 总页数: ${totalPages}, 分块数: ${totalChunks}`,
      );

      // 按分块处理
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startPage = chunkIndex * chunkSize + 1;
        const endPage = Math.min(startPage + chunkSize - 1, totalPages);

        // 通知解析进度
        progressCallback?.({
          fileName,
          current: endPage,
          total: totalPages,
          percentage: Math.floor((endPage / totalPages) * 100),
          status: 'parsing',
          message: `正在解析第 ${startPage}-${endPage} 页...`,
        });

        // 提取文本
        const chunkText = await this.extractPageRange(pdfDocument, startPage, endPage);

        // 创建文档分块（使用哈希值作为ID，避免中文字符）
        const chunk: ParsedChunk = {
          id: generateChunkId(filePath, chunkIndex),
          fileName,
          fileType: 'pdf',
          content: chunkText,
          pageRange: `${startPage}-${endPage}`,
          totalPages,
          chunkIndex,
          totalChunks,
          filePath,
          createdAt: Date.now(),
          metadata: options?.extractMetadata
            ? {
                pagesInChunk: endPage - startPage + 1,
              }
            : undefined,
        };

        chunks.push(chunk);

        console.log(
          `[PdfParser] 分块 ${chunkIndex + 1}/${totalChunks} 完成，页码: ${startPage}-${endPage}, 字符数: ${chunkText.length}`,
        );
      }

      // 通知解析完成
      progressCallback?.({
        fileName,
        current: totalPages,
        total: totalPages,
        percentage: 100,
        status: 'completed',
        message: '解析完成',
      });

      return {
        success: true,
        fileName,
        chunks,
        total: totalPages,
      };
    } catch (error: any) {
      console.error(`[PdfParser] 解析失败: ${fileName}`, error);

      // 通知解析失败
      progressCallback?.({
        fileName,
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: `解析失败: ${error.message}`,
      });

      return {
        success: false,
        fileName,
        chunks: [],
        total: 0,
        error: error.message || '解析PDF文件失败',
      };
    }
  }

  /**
   * 提取指定页码范围的文本
   */
  private async extractPageRange(
    pdfDocument: pdfjsLib.PDFDocumentProxy,
    startPage: number,
    endPage: number,
  ): Promise<string> {
    const textParts: string[] = [];

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();

        // 提取文本项
        const pageText = textContent.items
          .map((item: any) => {
            // 处理文本项
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ');

        // 添加页码标记（便于调试和搜索定位）
        textParts.push(`\n--- 第 ${pageNum} 页 ---\n${pageText}`);
      } catch (error) {
        console.error(`[PdfParser] 提取第 ${pageNum} 页失败:`, error);
        textParts.push(`\n--- 第 ${pageNum} 页（提取失败）---\n`);
      }
    }

    return textParts.join('\n').trim();
  }
}
