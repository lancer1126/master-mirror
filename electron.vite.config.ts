import vue from '@vitejs/plugin-vue';
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';

import pkg from './package.json';

/**
 * externalizeDepsPlugin作用：
 * 将主进程（main process）或预加载脚本（preload）中使用的 Node.js 原生模块和第三方依赖"外部化"（externalize），避免 Vite 尝试打包它们。
 */
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd());

  // 注入应用信息（从 package.json）
  const appInfo = {
    VITE_APP_NAME: pkg.build.productName,
    VITE_APP_VERSION: pkg.version,
    VITE_APP_ID: pkg.build.appId,
  };

  // 合并环境变量和应用信息
  const envInfo = { ...env, ...appInfo };
  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@main': resolve('src/main'),
          '@shared': resolve('src/shared'),
        },
      },
      build: {
        rollupOptions: {
          external: ['@/resources'],
        },
      },
      // 将环境变量注入到主进程
      define: {
        'process.env': JSON.stringify(envInfo),
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@shared': resolve('src/shared'),
        },
      },
    },
    renderer: {
      resolve: {
        alias: {
          '@': resolve('src/renderer'),
          '@renderer': resolve('src/renderer'),
          '@main': resolve('src/main'),
          '@shared': resolve('src/shared'),
        },
      },
      define: {
        // 将应用信息注入到渲染进程
        'import.meta.env.VITE_APP_NAME': JSON.stringify(appInfo.VITE_APP_NAME),
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(appInfo.VITE_APP_VERSION),
        'import.meta.env.VITE_APP_ID': JSON.stringify(appInfo.VITE_APP_ID),
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
  };
});
