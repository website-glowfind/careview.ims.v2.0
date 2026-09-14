@echo off
setlocal
cd /d "%~dp0"
title CAREVIEW IMS - Server

echo ============================================
echo    CAREVIEW IMS  -  Update ^& Run
echo ============================================
echo.

echo [1/4] Pulling latest changes from GitHub...
git pull origin master
if errorlevel 1 (
  echo.
  echo   WARNING: git pull failed ^(check internet / network^).
  echo   Continuing with the code already on this PC...
  echo.
)

echo.
echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo   ERROR: npm install failed. Stopping.
  pause
  exit /b 1
)

echo.
echo [3/4] Building the client...
call npm run build
if errorlevel 1 (
  echo.
  echo   ERROR: build failed. Stopping.
  pause
  exit /b 1
)

echo.
echo [4/4] Starting the server...
echo   The app URL ^(Network address^) will be shown below.
echo   Open it on other PCs in the same network.
echo   Press Ctrl+C to stop the server.
echo.
call npm run start

echo.
echo Server stopped.
pause
