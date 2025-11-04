import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  base: './',
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@renderer': resolve('src/renderer'),
      '@main': resolve('src/main'),
    },
  },
  plugins: [
    vue(),
    viteCompression(),
    VueDevTools(),
    AutoImport({
      imports: ['vue', 'vue-router'],
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // 不自动导入样式，使用全局导入
          resolveIcons: true, // 自动导入图标
        }),
      ],
    }),
  ],
  server: {
    host: '0.0.0.0',
    proxy: {},
  },
});
