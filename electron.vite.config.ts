import vue from '@vitejs/plugin-vue';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

/**
 * externalizeDepsPlugin作用：
 * 将主进程（main process）或预加载脚本（preload）中使用的 Node.js 原生模块和第三方依赖“外部化”（externalize），避免 Vite 尝试打包它们。
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['@/resources'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
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
  },
});
