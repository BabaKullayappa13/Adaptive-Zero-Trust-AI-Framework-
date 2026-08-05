@echo off
REM Zero Trust AI Framework - Windows Setup Script
REM Run this script to automatically set up the project

echo.
echo ============================================
echo  Zero Trust AI Framework - Windows Setup
echo ============================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please download Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js is installed

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)
echo OK: npm is installed

REM Check Python
echo Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please download Python from https://www.python.org/downloads/
    pause
    exit /b 1
)
echo OK: Python is installed

REM Setup Frontend
echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo OK: Frontend dependencies installed
cd ..

REM Setup Backend
echo.
echo Setting up Python virtual environment...
cd backend
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    cd ..
    pause
    exit /b 1
)
echo OK: Virtual environment created

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    cd ..
    pause
    exit /b 1
)
echo OK: Python dependencies installed
cd ..

REM Create .env files if they don't exist
echo.
echo Setting up environment files...

if not exist ".env.example" (
    echo Creating .env.example...
    (
        echo DATABASE_URL=postgresql://user:password@localhost:5432/zero_trust_ai
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
        echo JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
    ) > .env.example
)

if not exist "backend\.env" (
    echo Creating backend/.env...
    (
        echo DATABASE_URL=postgresql://user:password@localhost:5432/zero_trust_ai
        echo JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
        echo FASTAPI_ENV=development
    ) > backend\.env
)

if not exist "frontend\.env.local" (
    echo Creating frontend/.env.local...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
        echo NEXT_PUBLIC_APP_NAME=Zero Trust AI Framework
    ) > frontend\.env.local
)

echo.
echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Open PostgreSQL and create database:
echo    psql -U postgres
echo    CREATE DATABASE zero_trust_ai;
echo.
echo 2. Start backend in one terminal:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    uvicorn main:app --reload
echo.
echo 3. Start frontend in another terminal:
echo    cd frontend
echo    npm run dev
echo.
echo 4. Open your browser:
echo    http://localhost:3000
echo.
pause
