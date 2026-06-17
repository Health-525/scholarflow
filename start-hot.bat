@echo off
chcp 65001 >nul
title ScholarFlow 热更新
cd /d "%~dp0"

echo ============================================
echo   ScholarFlow 热更新开发环境
echo ============================================
echo.

echo [1/3] 清理残留进程 electron 与端口 3000 ...
taskkill /IM electron.exe /F >nul 2>&1
taskkill /IM ScholarFlow.exe /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] 对齐 better-sqlite3 到系统 Node ABI ...
call node scripts\switch-abi.js node

echo [3/3] 启动 Next.js 开发服务器 + Electron 窗口 ...
echo.
echo   - 改前端代码或 API 路由, 保存即自动刷新, 无需打包
echo   - 改 electron 主进程或配置文件, 需重新运行本脚本
echo.

set ELECTRON_DEV=1
call npx concurrently "next dev" "electron ."

echo.
echo 热更新已停止。按任意键关闭窗口...
pause >nul
