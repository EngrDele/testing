@echo off
REM Site Life - runs the games + results server on this PC (port 8080).
REM Keep this window open while people are playing. Then share port 8080 with VS Code (see TUNNEL-GUIDE.md).
cd /d "%~dp0"
if not exist hse-key.txt (echo %RANDOM%%RANDOM%%RANDOM%> hse-key.txt)
set /p HSE_KEY=<hse-key.txt
set HSE_KEY=%HSE_KEY: =%
set PORT=8080
echo.
echo  ===========================================================
echo   Site Life is running on this PC:  http://localhost:8080
echo   HSE dashboard (only for you):     http://localhost:8080/hse?key=%HSE_KEY%
echo   Next: in VS Code, PORTS tab ^> Forward a Port ^> 8080 ^> set Public
echo   Close this window to stop.
echo  ===========================================================
echo.
start "" "http://localhost:8080/hse?key=%HSE_KEY%"
where python >nul 2>nul && (python server\sitelife_server.py & goto :eof)
where py >nul 2>nul && (py server\sitelife_server.py & goto :eof)
echo  Python was not found.
echo  Install it from https://www.python.org/downloads/ and tick "Add python.exe to PATH", then run this again.
pause
