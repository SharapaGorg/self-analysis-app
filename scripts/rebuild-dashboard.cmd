@echo off
REM Rebuilds the production bundle and restarts the dashboard server on port 3010.
REM Run this after you change the code so the live site at localhost:3010 picks up your edits.
cd /d "C:\Dev\Dev_2026\self-analysis-dashboard"

echo [1/3] Building production bundle...
call npm run build
if errorlevel 1 (
  echo Build FAILED. Server was not restarted.
  pause
  exit /b 1
)

echo [2/3] Stopping running server on port 3010...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3010" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo [3/3] Starting fresh server...
wscript.exe "C:\Dev\Dev_2026\self-analysis-dashboard\scripts\start-dashboard.vbs"

echo Done. Dashboard is rebuilding/serving at http://localhost:3010
timeout /t 3 >nul
