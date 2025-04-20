:: filepath: /home/liamforsky/Bureau/apm/install.bat
@echo off

:: APM Installation Script
:: This script installs APM (Aether Packet Manager) system-wide

:: Ensure script is run as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Please run this script as administrator.
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo npm is not installed. Please install Node.js and npm first.
    exit /b 1
)

:: Get the real user (not administrator)
for /f "tokens=*" %%u in ('whoami') do set "REAL_USER=%%u"

:: Confirm the user was detected
if "%REAL_USER%"=="" (
    echo Could not determine the real user. Please run this script as administrator.
    exit /b 1
)

echo Installing APM (Aether Packet Manager)...

:: Install APM globally using npm
npm install -g .
if %errorLevel% neq 0 (
    echo Error: Failed to install APM. Please check the npm logs for more details.
    exit /b 1
)

:: Create and set permissions on the registry directory
set "REGISTRY_DIR=C:\Users\%REAL_USER%\.aether\registry"
if not exist "%REGISTRY_DIR%" (
    mkdir "%REGISTRY_DIR%"
)
icacls "%REGISTRY_DIR%" /grant "%REAL_USER%:F" /t /q

echo APM installed successfully!
echo You can now use the 'apm' command from anywhere.
echo Registry directory: %REGISTRY_DIR%