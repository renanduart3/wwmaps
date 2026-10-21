@echo off
setlocal
if /I "%~1"=="stop" (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" -Stop
) else (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" %*
)
set "WWMAPS_EXIT=%ERRORLEVEL%"
if not "%WWMAPS_EXIT%"=="0" (
  echo.
  echo O inicializador encerrou com erro. Veja a mensagem acima.
)
exit /b %WWMAPS_EXIT%
