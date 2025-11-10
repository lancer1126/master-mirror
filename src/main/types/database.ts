/**
 * 数据库类型定义
 */

/**
 * 上传记录
 */
export interface UploadRecord {
  fileId: string; // 文件哈希ID
  fileName: string; // 文件名
  filePath: string; // 文件原始路径
  uploadTime: string; // 上传时间 (yyyy-MM-dd HH:mm:ss)
}

