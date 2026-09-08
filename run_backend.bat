@echo off
title Zero Trust AI - Backend (FastAPI)
echo ====================================================
echo  Starting Zero Trust AI Framework - Backend Service
echo ====================================================
cd /d "%~dp0backend"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" run.py
) else if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" run.py
) else (
    python run.py
)
pause
