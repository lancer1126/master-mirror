<template>
  <div class="home-container">
    <div class="search-wrapper">
      <div class="search-box" :class="{ 'search-box-hover': isHovered }">
        <a-input
          v-model:value="searchQuery"
          placeholder="搜索"
          class="search-input"
          size="large"
          @mouseenter="isHovered = true"
          @mouseleave="isHovered = false"
          @pressEnter="handleSearch"
        >
          <template #suffix>
            <div class="search-icon" @click="handleSearch">
              <SearchOutlined />
            </div>
          </template>
        </a-input>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const searchQuery = ref('');
const isHovered = ref(false);

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    console.log('搜索:', searchQuery.value);
    // 这里添加搜索逻辑
  }
};
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 20vh;
}

.search-wrapper {
  width: 100%;
  max-width: 600px;
  padding: 0 24px;
}

.search-box {
  transition: all 0.3s ease;
}

.search-box-hover {
  transform: translateY(-2px);
}

.search-input {
  border-radius: 24px;
  padding: 12px 24px;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.search-box-hover .search-input {
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(24, 144, 255, 0.3);
}

.search-input:deep(.ant-input) {
  background: #fff;
  border: none;
  font-size: 16px;
}

.search-input:deep(.ant-input-affix-wrapper) {
  background: #fff;
  border: none;
  padding: 12px 24px;
}

.search-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #1890ff;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  margin-right: -12px;
}

.search-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.search-icon:active {
  transform: scale(0.95);
}
</style>
