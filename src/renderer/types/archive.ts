/**
 * 归档相关的类型定义
 */

/**
 * 上传记录
 */
export interface UploadRecord {
  /** 文件ID */
  fileId: string;
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  filePath: string;
  /** 上传时间 */
  uploadTime: string;
}

