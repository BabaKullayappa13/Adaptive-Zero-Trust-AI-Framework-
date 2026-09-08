@echo off
title Zero Trust AI Framework Launcher
echo ====================================================
echo  Starting Adaptive Zero Trust AI Framework Stack
echo ====================================================
echo [1/2] Launching Backend Server on http://localhost:8000 ...
start "Zero Trust AI - Backend" "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
echo [2/2] Launching Frontend Server on http://localhost:3000 ...
start "Zero Trust AI - Frontend" "%~dp0run_frontend.bat"
echo.
echo Both services have been launched in separate terminal windows!
echo - Web Dashboard:     http://localhost:3000
echo - Swagger API Docs:  http://localhost:8000/docs
echo - Database Health:   http://localhost:8000/health/db
echo.
pause
