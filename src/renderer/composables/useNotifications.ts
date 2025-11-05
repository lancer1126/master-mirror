import { computed, reactive } from 'vue';

/**
 * 消息类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * 消息项接口
 */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  closable?: boolean;
  autoClose?: boolean;
  duration?: number;
  expanded?: boolean;
}

/**
 * 消息状态
 */
const state = reactive<{
  notifications: NotificationItem[];
}>({
  notifications: [],
});

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 消息通知 Composable
 */
export function useNotifications() {
  /**
   * 添加消息
   */
  const addNotification = (notification: Omit<NotificationItem, 'id' | 'expanded'>) => {
    const item: NotificationItem = {
      id: generateId(),
      expanded: false,
      closable: notification.closable ?? true,
      autoClose: notification.autoClose ?? false,
      duration: notification.duration ?? 5000,
      ...notification,
    };

    state.notifications.push(item);

    // 自动关闭
    if (item.autoClose && item.duration) {
      setTimeout(() => {
        removeNotification(item.id);
      }, item.duration);
    }

    return item.id;
  };

  /**
   * 移除消息
   */
  const removeNotification = (id: string) => {
    const index = state.notifications.findIndex((n) => n.id === id);
    if (index > -1) {
      state.notifications.splice(index, 1);
    }
  };

  /**
   * 清空所有消息
   */
  const clearAll = () => {
    state.notifications = [];
  };

  /**
   * 切换消息展开状态
   */
  const toggleExpand = (id: string) => {
    const notification = state.notifications.find((n) => n.id === id);
    if (notification) {
      notification.expanded = !notification.expanded;
    }
  };

  /**
   * 快捷方法：显示信息消息
   */
  const info = (title: string, description?: string, options?: Partial<NotificationItem>) => {
    return addNotification({
      type: 'info',
      title,
      description,
      ...options,
    });
  };

  /**
   * 快捷方法：显示成功消息
   */
  const success = (title: string, description?: string, options?: Partial<NotificationItem>) => {
    return addNotification({
      type: 'success',
      title,
      description,
      autoClose: true,
      ...options,
    });
  };

  /**
   * 快捷方法：显示警告消息
   */
  const warning = (title: string, description?: string, options?: Partial<NotificationItem>) => {
    return addNotification({
      type: 'warning',
      title,
      description,
      ...options,
    });
  };

  /**
   * 快捷方法：显示错误消息
   */
  const error = (title: string, description?: string, options?: Partial<NotificationItem>) => {
    return addNotification({
      type: 'error',
      title,
      description,
      closable: true,
      autoClose: false,
      ...options,
    });
  };

  return {
    notifications: computed(() => state.notifications),
    addNotification,
    removeNotification,
    clearAll,
    toggleExpand,
    info,
    success,
    warning,
    error,
  };
}

