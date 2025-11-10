/**
 * 文件上传 Composable
 * 统一处理文件上传逻辑和进度管理
 */

import { message } from 'ant-design-vue';
import { ref } from 'vue';

import type { FileProgress, UploadOptions } from '@/types';

/**
 * 文件上传 Hook
 */
export function useFileUpload() {
  const uploading = ref(false);
  const progressMap = ref<Map<string, FileProgress>>(new Map());

  /**
   * 从 File 对象数组获取文件路径
   */
  const getFilePathsFromFiles = (files: File[]): string[] => {
    const filePaths: string[] = [];

    try {
      for (const file of files) {
        // 使用 Electron webUtils API 获取真实文件路径
        const filePath = window.ipcRenderer.getPathForFile(file);

        if (filePath) {
          filePaths.push(filePath);
        } else {
          console.warn(`⚠️ 无法获取文件路径: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('获取文件路径失败:', error);
      throw new Error('获取文件路径失败');
    }

    return filePaths;
  };

  /**
   * 上传文件（核心逻辑）
   */
  const uploadFiles = async (filePaths: string[], options: UploadOptions = {}) => {
    const {
      showLoading = true,
      showSuccess = true,
      onBefore,
      onComplete,
      onProgress,
    } = options;

    if (filePaths.length === 0) {
      message.warning('未选择任何文件');
      return {
        success: [],
        failed: [],
      };
    }

    uploading.value = true;
    progressMap.value.clear();

    // 调用前置钩子
    onBefore?.();

    // 监听解析进度
    const unsubscribe = window.ipcRenderer.onFileParseProgress((progress) => {
      progressMap.value.set(progress.fileName, progress);

      // 调用进度回调
      onProgress?.(progress);

      if (progress.status === 'completed') {
        console.log(`${progress.fileName} 处理完成`);
      } else if (progress.status === 'failed') {
        console.error(`${progress.fileName} 处理失败: ${progress.message}`);
      }
    });

    try {
      if (showLoading) {
        message.loading({ content: '正在上传文件...', key: 'upload', duration: 0 });
      }

      const result = await window.api.upload.files(filePaths);

      if (showLoading) {
        message.destroy('upload');
      }

      if (result.success && result.data) {
        const { success, failed } = result.data;

        // 调用完成回调
        onComplete?.(success, failed);

        if (showSuccess) {
          if (failed.length === 0) {
            message.success(`成功上传 ${success.length} 个文件`);
          } else {
            message.warning(`上传完成：成功 ${success.length} 个，失败 ${failed.length} 个`);
            // 显示失败详情
            failed.forEach((f) => {
              message.error(`${f.fileName}: ${f.error}`, 3);
            });
          }
        }

        return { success, failed };
      } else {
        if (showLoading) {
          message.error(result.error || '文件上传失败');
        }
        return {
          success: [],
          failed: filePaths.map((path) => ({
            fileName: path.split(/[\\/]/).pop() || path,
            error: result.error || '上传失败',
          })),
        };
      }
    } catch (error: any) {
      console.error('上传错误:', error);
      if (showLoading) {
        message.error('文件上传失败');
      }
      return {
        success: [],
        failed: filePaths.map((path) => ({
          fileName: path.split(/[\\/]/).pop() || path,
          error: error.message || '上传失败',
        })),
      };
    } finally {
      uploading.value = false;
      unsubscribe();
    }
  };

  /**
   * 上传 File 对象数组
   */
  const uploadFileObjects = async (files: File[], options: UploadOptions = {}) => {
    try {
      const filePaths = getFilePathsFromFiles(files);
      
      if (filePaths.length === 0) {
        message.warning('未检测到有效文件路径');
        return {
          success: [],
          failed: [],
        };
      }

      console.log('准备上传文件:', filePaths);
      return await uploadFiles(filePaths, options);
    } catch (error: any) {
      message.error(error.message || '获取文件路径失败');
      return {
        success: [],
        failed: [],
      };
    }
  };

  /**
   * 重置状态
   */
  const reset = () => {
    uploading.value = false;
    progressMap.value.clear();
  };

  return {
    uploading,
    progressMap,
    uploadFiles,
    uploadFileObjects,
    getFilePathsFromFiles,
    reset,
  };
}

