const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// 确保脚本在项目根目录执行，读取 package.json 获取依赖信息
const root = process.cwd();
const pkgPath = join(root, 'package.json');

let pkg = {};
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
} catch (error) {
  console.error('[postinstall] 读取 package.json 失败:', error);
  process.exit(1);
}

// 优先读取 devDependencies 中配置的 electron 版本，便于兼容 Electron 主进程
const electronSpecifier =
  (pkg.devDependencies && pkg.devDependencies.electron) ||
  (pkg.dependencies && pkg.dependencies.electron) ||
  '';

// electron版本号
const cleanedVersion = electronSpecifier.replace(/^[^0-9]*/, '').trim();
if (!cleanedVersion) {
  console.log('[postinstall] 未检测到 electron 版本，跳过 native 模块重建。');
  process.exit(0);
}

// 需要重建的 native 模块
const nativeModules = ['better-sqlite3'];
// 使用 npm_execpath 保证沿用当前 pnpm 入口脚本，避免 PATH 差异
const pnpmExecPath = process.env.npm_execpath;

for (const moduleName of nativeModules) {
  console.log(`[postinstall] 使用 Electron ${cleanedVersion} 重建 ${moduleName} (x64)。`);

  const env = {
    ...process.env,
    npm_config_runtime: 'electron',
    npm_config_target: String(cleanedVersion),
    npm_config_arch: 'x64',
    // 把 node-gyp 的头文件下载地址指向 Electron 官方仓库，避免去 nodejs.org导致下载错了版本
    npm_config_disturl: 'https://artifacts.electronjs.org/headers/dist',
  };

  let result;

  if (pnpmExecPath) {
    result = spawnSync(process.execPath, [pnpmExecPath, 'rebuild', moduleName], {
      stdio: 'inherit',
      env,
    });
  } else {
    const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    result = spawnSync(pnpmCommand, ['rebuild', moduleName], {
      stdio: 'inherit',
      shell: true,
      env,
    });
  }

  if (result.status !== 0) {
    if (result.error) {
      console.error(`[postinstall] 执行命令失败: ${result.error.message}`);
    }
    console.error(`[postinstall] 重建 ${moduleName} 失败，退出码 ${result.status ?? 1}。`);
    process.exit(result.status ?? 1);
  }
}

console.log('[postinstall] native 模块重建完成。');
