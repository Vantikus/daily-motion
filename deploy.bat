@echo off
cd /d "%~dp0"

echo ================================
echo DAILY MOTION DEPLOY
echo ================================
echo.

echo [1/4] Updating production version...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$swPath = Join-Path (Get-Location) 'sw.js';" ^
  "$sw = [IO.File]::ReadAllText($swPath);" ^
  "$match = [regex]::Match($sw, 'daily-motion-v(\d+)');" ^
  "if (-not $match.Success) { throw 'Current version was not found in sw.js' };" ^
  "$version = [int]$match.Groups[1].Value + 1;" ^
  "$utf8 = New-Object System.Text.UTF8Encoding($false);" ^
  "$files = @((Get-ChildItem -LiteralPath . -Filter '*.html' -File).FullName) + $swPath;" ^
  "foreach ($file in $files) {" ^
  "  $content = [IO.File]::ReadAllText($file);" ^
  "  $content = [regex]::Replace($content, '\?v=\d+', '?v=' + $version);" ^
  "  if ($file -eq $swPath) { $content = [regex]::Replace($content, 'daily-motion-v\d+', 'daily-motion-v' + $version) };" ^
  "  [IO.File]::WriteAllText($file, $content, $utf8);" ^
  "};" ^
  "Write-Host ('Production assets version: v' + $version)"
if errorlevel 1 goto error

echo.
echo [2/4] Adding changes...
git add .
if errorlevel 1 goto error

echo.
echo [3/4] Creating commit...
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Deploy updates"
    if errorlevel 1 goto error
) else (
    echo No new changes to commit.
)

echo.
echo [4/4] Pushing to main...
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
