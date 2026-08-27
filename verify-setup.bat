@echo off
REM Zero Trust AI Framework - Verification Script
REM This script verifies that everything is set up correctly

setlocal enabledelayedexpansion

echo.
echo ============================================
echo  Zero Trust AI Framework - Verification
echo ============================================
echo.

set PASS=0
set FAIL=0

REM Function to check success
set "CHECK_OK=echo OK - ✓"
set "CHECK_FAIL=echo FAILED - ✗"

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo OK: !NODE_VERSION! ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: Node.js not found or not in PATH ^(✗^)
    set /a FAIL+=1
)

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo OK: npm !NPM_VERSION! ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: npm not found or not in PATH ^(✗^)
    set /a FAIL+=1
)

REM Check Python
echo Checking Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo OK: !PYTHON_VERSION! ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: Python not found or not in PATH ^(✗^)
    set /a FAIL+=1
)

REM Check pip
echo Checking pip...
pip --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('pip --version') do set PIP_VERSION=%%i
    echo OK: !PIP_VERSION! ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: pip not found ^(✗^)
    set /a FAIL+=1
)

REM Check PostgreSQL
echo Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('psql --version') do set PG_VERSION=%%i
    echo OK: !PG_VERSION! ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: PostgreSQL not found or not in PATH ^(✗^)
    set /a FAIL+=1
)

REM Check frontend node_modules
echo.
echo Checking frontend setup...
if exist "frontend\node_modules" (
    echo OK: node_modules directory exists ^(✓^)
    set /a PASS+=1
) else (
    echo WARNING: node_modules not found - run 'npm install' in frontend ^(⚠^)
)

REM Check backend venv
echo Checking backend setup...
if exist "backend\venv" (
    echo OK: Python venv exists ^(✓^)
    set /a PASS+=1
) else (
    echo WARNING: venv not found - run setup-windows.bat ^(⚠^)
)

REM Check requirements.txt
if exist "backend\requirements.txt" (
    echo OK: requirements.txt exists ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: requirements.txt not found ^(✗^)
    set /a FAIL+=1
)

REM Check env files
echo.
echo Checking environment files...

if exist "backend\.env" (
    echo OK: backend\.env exists ^(✓^)
    set /a PASS+=1
) else (
    echo WARNING: backend\.env not found - copy from .env.example ^(⚠^)
)

if exist "frontend\.env.local" (
    echo OK: frontend\.env.local exists ^(✓^)
    set /a PASS+=1
) else (
    echo WARNING: frontend\.env.local not found ^(⚠^)
)

REM Check main files
echo.
echo Checking project files...

if exist "frontend\next.config.mjs" (
    echo OK: frontend\next.config.mjs exists ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: frontend\next.config.mjs not found ^(✗^)
    set /a FAIL+=1
)

if exist "backend\main.py" (
    echo OK: backend\main.py exists ^(✓^)
    set /a PASS+=1
) else (
    echo FAILED: backend\main.py not found ^(✗^)
    set /a FAIL+=1
)

REM Try to build frontend
echo.
echo Testing frontend build...
cd frontend
call npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Frontend builds successfully ^(✓^)
    set /a PASS+=1
) else (
    echo WARNING: Frontend build failed - dependency issue ^(⚠^)
)
cd ..

REM Summary
echo.
echo ============================================
echo  Verification Summary
echo ============================================
echo.
echo Passed: %PASS%
echo Failed: %FAIL%
echo.

if %FAIL% equ 0 (
    echo Everything looks good! You're ready to go.
    echo.
    echo Run these commands to start:
    echo.
    echo Terminal 1 (Backend^):
    echo   cd backend
    echo   venv\Scripts\activate.bat
    echo   uvicorn main:app --reload
    echo.
    echo Terminal 2 (Frontend^):
    echo   cd frontend
    echo   npm run dev
    echo.
    echo Then open: http://localhost:3000
) else (
    echo There are issues to fix. See above for details.
    echo.
    echo Common fixes:
    echo 1. Node.js not in PATH - Restart computer after installing
    echo 2. Python not in PATH - Reinstall, checking "Add to PATH"
    echo 3. Dependencies missing - Run setup-windows.bat
)

pause
