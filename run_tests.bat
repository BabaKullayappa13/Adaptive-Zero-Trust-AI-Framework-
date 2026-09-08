@echo off
title Zero Trust AI - Automated Tests
echo ====================================================
echo  Running Automated Pytest Verification Suite
echo ====================================================
cd /d "%~dp0"
if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" -m pytest tests/ -v
) else (
    pytest tests/ -v
)
pause
