#!/usr/bin/env pwsh

# Zero Trust AI Framework - Windows Setup Script for PowerShell

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Zero Trust AI Framework - Windows Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "OK: Node.js $nodeVersion is installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please download Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
if (Test-Command npm) {
    $npmVersion = npm --version
    Write-Host "OK: npm $npmVersion is installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: npm is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
if (Test-Command python) {
    $pythonVersion = python --version
    Write-Host "OK: $pythonVersion is installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please download Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Setup Frontend
Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK: Frontend dependencies installed" -ForegroundColor Green
Pop-Location

# Setup Backend
Write-Host ""
Write-Host "Setting up Python virtual environment..." -ForegroundColor Yellow
Push-Location backend

if (-not (Test-Path "venv")) {
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "OK: Virtual environment created" -ForegroundColor Green

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Python dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK: Python dependencies installed" -ForegroundColor Green
Pop-Location

# Create environment files
Write-Host ""
Write-Host "Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path ".env.example")) {
    Write-Host "Creating .env.example..." -ForegroundColor Cyan
    @"
DATABASE_URL=postgresql://user:password@localhost:5432/zero_trust_ai
NEXT_PUBLIC_API_URL=http://localhost:8000
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
"@ | Out-File -FilePath ".env.example" -Encoding UTF8
}

if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating backend\.env..." -ForegroundColor Cyan
    @"
DATABASE_URL=postgresql://user:password@localhost:5432/zero_trust_ai
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
FASTAPI_ENV=development
"@ | Out-File -FilePath "backend\.env" -Encoding UTF8
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "Creating frontend\.env.local..." -ForegroundColor Cyan
    @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Zero Trust AI Framework
"@ | Out-File -FilePath "frontend\.env.local" -Encoding UTF8
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open PostgreSQL and create database:" -ForegroundColor Yellow
Write-Host "   psql -U postgres" -ForegroundColor White
Write-Host "   CREATE DATABASE zero_trust_ai;" -ForegroundColor White
Write-Host ""
Write-Host "2. Start backend in one terminal:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   uvicorn main:app --reload" -ForegroundColor White
Write-Host ""
Write-Host "3. Start frontend in another terminal:" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Open your browser:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
