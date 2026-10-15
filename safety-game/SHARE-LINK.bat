@echo off
REM Site Life - one click: run the games + results server on this PC and get a public Cloudflare link
REM (https://<random>.trycloudflare.com) to send to anyone. No account needed. Keep both windows open while people play.
cd /d "%~dp0"
where cloudflared >nul 2>nul || (
  echo  cloudflared is not installed. Installing it with winget...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  echo  If the next step says cloudflared is not found, close this window and run SHARE-LINK.bat again.
)
start "Site Life server" cmd /k "%~dp0START-SERVER.bat"
timeout /t 4 /nobreak >nul
echo.
echo  ===========================================================
echo   Look below for a line like  https://something.trycloudflare.com
echo   Send that link to the players (it works until you close this window).
echo   Kids games: add  kids.html  to the end of the link. Warehouse: warehouse.html
echo  ===========================================================
echo.
cloudflared tunnel --url http://localhost:8080
pause
