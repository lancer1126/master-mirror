<template>
  <div class="notification-list">
    <transition-group name="notification-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item"
        :class="[
          `notification-${notification.type}`,
          { 'notification-expanded': notification.expanded },
        ]"
      >
        <!-- 标题栏 -->
        <div class="notification-header">
          <div class="notification-icon">
            <InfoCircleOutlined v-if="notification.type === 'info'" />
            <CheckCircleOutlined v-if="notification.type === 'success'" />
            <ExclamationCircleOutlined v-if="notification.type === 'warning'" />
            <CloseCircleOutlined v-if="notification.type === 'error'" />
          </div>
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-actions">
            <!-- 展开/折叠按钮 -->
            <button
              v-if="notification.description"
              class="notification-action-btn"
              @click="toggleExpand(notification.id)"
            >
              <DownOutlined v-if="!notification.expanded" />
              <UpOutlined v-if="notification.expanded" />
            </button>
            <!-- 关闭按钮 -->
            <button
              v-if="notification.closable"
              class="notification-action-btn notification-close"
              @click="removeNotification(notification.id)"
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        <!-- 详情内容（可展开） -->
        <transition name="notification-expand">
          <div v-if="notification.expanded && notification.description" class="notification-body">
            <div class="notification-description">{{ notification.description }}</div>
          </div>
        </transition>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useNotifications } from '@/composables/useNotifications';

const { notifications, removeNotification, toggleExpand } = useNotifications();
</script>

<style scoped>
.notification-list {
  position: fixed;
  left: 24px;
  top: 60px;
  z-index: 1000;
  max-width: 420px;
  pointer-events: none;
}

.notification-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 12px;
  overflow: hidden;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.notification-item:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* 不同级别的颜色 */
.notification-info .notification-header {
  background: #e6f7ff;
  border-left: 4px solid #1890ff;
}

.notification-info .notification-icon {
  color: #1890ff;
}

.notification-success .notification-header {
  background: #f6ffed;
  border-left: 4px solid #52c41a;
}

.notification-success .notification-icon {
  color: #52c41a;
}

.notification-warning .notification-header {
  background: #fffbe6;
  border-left: 4px solid #faad14;
}

.notification-warning .notification-icon {
  color: #faad14;
}

.notification-error .notification-header {
  background: #fff2f0;
  border-left: 4px solid #ff4d4f;
}

.notification-error .notification-icon {
  color: #ff4d4f;
}

/* 标题栏 */
.notification-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.notification-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.notification-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.5;
  min-width: 0;
  word-break: break-word;
}

.notification-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.notification-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.45);
  transition: all 0.2s;
  font-size: 12px;
}

.notification-action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.88);
}

.notification-close:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* 详情内容 */
.notification-body {
  padding: 0 16px 12px 16px;
  background: white;
}

.notification-description {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

/* 展开动画 */
.notification-expand-enter-active,
.notification-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.notification-expand-enter-from,
.notification-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.notification-expand-enter-to,
.notification-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* 列表过渡动画 */
.notification-list-enter-active {
  transition: all 0.3s ease;
}

.notification-list-leave-active {
  transition: all 0.3s ease;
  position: absolute;
  width: 100%;
}

.notification-list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.notification-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-list-move {
  transition: transform 0.3s ease;
}
</style>
