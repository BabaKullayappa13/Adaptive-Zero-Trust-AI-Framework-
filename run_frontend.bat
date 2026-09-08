@echo off
title Zero Trust AI - Frontend (Next.js)
echo ====================================================
echo  Starting Zero Trust AI Framework - Frontend Service
echo ====================================================
cd /d "%~dp0frontend"
call npm run dev
pause
