<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="upload-overlay">
        <div class="upload-content">
          <div class="upload-icon">
            <CloudUploadOutlined />
          </div>
          <div class="upload-text">
            <div class="upload-title">拖拽文件到此处上传</div>
            <div class="upload-subtitle">释放鼠标即可开始上传</div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
}

defineProps<Props>();
</script>

<style scoped>
.upload-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(170, 181, 225, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  pointer-events: none; /* 让遮罩不阻挡拖拽事件 */
}

.upload-content {
  text-align: center;
  color: white;
}

.upload-icon {
  font-size: 120px;
  margin-bottom: 24px;
  animation: bounce 2s infinite;
}

.upload-text {
  user-select: none;
}

.upload-title {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 12px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.upload-subtitle {
  font-size: 18px;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
