import { app } from 'electron';

import { APP_INFO } from './constants';
import { initApp } from './modules/system/bootstrap';

// 设置应用名称
app.setName(APP_INFO.NAME);

// 检查应用实例锁，确保只有一个实例运行
const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  // 如果获取锁失败，说明已经有一个实例在运行，直接退出
  app.quit();
} else {
  // 获取锁成功，等待应用准备就绪后进行初始化
  app.whenReady().then(initApp);
}
