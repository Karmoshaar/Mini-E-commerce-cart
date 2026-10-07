@echo off
chcp 65001 >nul
title Karmo
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is not installed. Download the LTS version from https://nodejs.org then run this again.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages, first time only...
  call npm install --omit=dev
  if errorlevel 1 ( pause & exit /b 1 )
)

if not exist .env (
  copy .env.example .env >nul
  echo [!] Paste your bot token after DISCORD_TOKEN= in the file that just opened, save it, then run start.bat again.
  notepad .env
  pause
  exit /b 1
)

:run
node src\index.js
if %errorlevel%==78 ( pause & exit /b 1 )
echo Bot stopped. Restarting in 5 seconds... (close this window to quit)
timeout /t 5 /nobreak >nul
goto run
