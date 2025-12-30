import { createRouter, createWebHashHistory } from 'vue-router';

import AppLayout from '@/layout/AppLayout.vue';

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '/',
        name: '主页',
        component: () => import('@/views/home/index.vue'),
        meta: {
          title: '主页',
        },
      },
      {
        path: '/archive',
        name: '归档',
        component: () => import('@/views/archive/index.vue'),
        meta: {
          title: '归档',
        },
      },
      {
        path: '/upload',
        name: '收录',
        component: () => import('@/views/upload/index.vue'),
        meta: {
          title: '收录',
        },
      }
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
});

export default router;
