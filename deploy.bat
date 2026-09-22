@echo off
cd /d "%~dp0"

echo ================================
echo DAILY MOTION DEPLOY
echo ================================
echo.

echo [1/3] Adding changes...
git add .
if errorlevel 1 goto error

echo.
echo [2/3] Creating commit...
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Deploy updates"
    if errorlevel 1 goto error
) else (
    echo No new changes to commit.
)

echo.
echo [3/3] Pushing to main...
git push origin main
if errorlevel 1 goto error

echo.
echo ================================
echo DEPLOY COMPLETE
echo ================================
pause
exit /b 0

:error
echo.
echo DEPLOY FAILED
pause
exit /b 1
