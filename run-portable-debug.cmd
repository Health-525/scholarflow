@echo off
chcp 65001 >nul
cd /d "%~dp0dist"
echo 正在启动 ScholarFlow 便携版调试模式，请稍候...
ScholarFlow-2.0.3-portable.exe --enable-logging --disable-gpu > "%~dp0portable-debug.log" 2>&1
echo.
echo 已退出，退出码：%ERRORLEVEL%
echo 日志保存在：%~dp0portable-debug.log
echo.
pause
