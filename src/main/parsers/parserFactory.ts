/**
 * 文件解析器工厂
 * 负责根据文件类型创建相应的解析器
 */

import type { IFileParser } from '@shared/types';
import { extname } from 'path';

import { PdfParser } from './pdfParser';

/**
 * 解析器工厂类
 */
class ParserFactory {
  /** 已注册的解析器映射 */
  private parsers: Map<string, IFileParser> = new Map();
  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化解析器工厂（手动调用）
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.registerDefaultParsers();
    this.initialized = true;
    console.log('[ParserFactory] 解析器初始化完成');
  }

  /**
   * 注册默认解析器
   */
  private registerDefaultParsers(): void {
    // 注册 PDF 解析器
    this.register(new PdfParser());

    // 后续可以在这里添加其他解析器
    // this.register(new ExcelParser());
    // this.register(new TextParser());
    // this.register(new WordParser());
  }

  /**
   * 注册解析器
   * @param parser 解析器实例
   */
  register(parser: IFileParser): void {
    for (const ext of parser.supportedExtensions) {
      this.parsers.set(ext.toLowerCase(), parser);
      console.log(`[ParserFactory] 注册解析器: ${ext} -> ${parser.constructor.name}`);
    }
  }

  /**
   * 根据文件路径获取解析器
   * @param filePath 文件路径
   * @returns 解析器实例，如果不支持则返回 null
   */
  getParser(filePath: string): IFileParser | null {
    const ext = extname(filePath).toLowerCase();
    const parser = this.parsers.get(ext);

    if (!parser) {
      console.warn(`[ParserFactory] 不支持的文件类型: ${ext}`);
      return null;
    }

    return parser;
  }

  /**
   * 检查文件是否支持
   * @param filePath 文件路径
   */
  isSupported(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return this.parsers.has(ext);
  }

  /**
   * 获取所有支持的文件扩展名
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * 取消注册解析器
   * @param extension 文件扩展名
   */
  unregister(extension: string): void {
    this.parsers.delete(extension.toLowerCase());
  }
}

// 导出单例
export const parserFactory = new ParserFactory();

