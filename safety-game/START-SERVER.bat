@echo off
REM Site Life - starts a local web server for the games on port 8080.
REM Keep this window open while people are playing.
cd /d "%~dp0"
echo.
echo  Site Life games are running at:  http://localhost:8080
echo  Now open a tunnel to port 8080 (see TUNNEL-GUIDE.md).
echo  Close this window to stop.
echo.
where python >nul 2>nul && (python -m http.server 8080 & goto :eof)
where py >nul 2>nul && (py -m http.server 8080 & goto :eof)
where npx >nul 2>nul && (npx --yes http-server -p 8080 -c-1 & goto :eof)
echo  Could not find Python or Node.js.
echo  Install Python from https://www.python.org/downloads/ (tick "Add to PATH"), then run this again.
pause
