@echo off
chcp 65001 >nul
echo ═════════════════════════════════════════
echo   ScholarFlow 开发环境一键启动
echo ═════════════════════════════════════════
echo.

:: 关闭残留进程
echo [1/3] 清理残留进程...
taskkill /IM electron.exe /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul

:: 启动 vision-model
echo [2/3] 启动 Vision-Model (端口 8000)...
start "Vision-Model" cmd /c "cd /d D:\A\vision-model && python src/api/server.py"
timeout /t 3 /nobreak >nul

:: 启动 ScholarFlow
echo [3/3] 启动 ScholarFlow (Next.js + Electron)...
cd /d D:\A\scholarflow
set ELECTRON_DEV=1
npx concurrently "next dev" "electron ."
