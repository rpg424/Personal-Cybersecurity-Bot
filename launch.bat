@echo off
setlocal enabledelayedexpansion
title Shield Labs Bot - Unified Web Platform

echo ====================================================================
echo   Shield Labs Bot - Unified Web Security & Fleet Platform
echo   Defensive, Privacy-First Endpoint & Fleet Management Console
echo ====================================================================
echo.
echo   1. Launch Web Security & Fleet Platform (:3000) [Recommended]
echo   2. Run All Verification & Security Self-Tests
echo   3. Exit
echo.
set /p choice="Select an option [1-3, default 1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="3" exit /b 0

if "%choice%"=="2" (
    echo.
    echo Running All Verification Test Suites...
    call npm.cmd run test:all
    echo.
    pause
    exit /b 0
)

:: Default: Choice 1 - Launch Unified Web Platform
echo.
echo Starting Unified Web Security & Fleet Platform on http://127.0.0.1:3000...
start "Shield Labs Bot" cmd /k "npm.cmd run start"

echo Opening browser dashboard...
timeout /t 3 >nul
start http://127.0.0.1:3000

echo.
echo Web Security Platform running at http://127.0.0.1:3000
echo.
pause
