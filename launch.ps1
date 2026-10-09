<#
.SYNOPSIS
    Shield Labs Bot - Unified Web Security & Fleet Platform Launcher
.DESCRIPTION
    Launches the Unified Web Security & Fleet Platform on http://127.0.0.1:3000.
.PARAMETER Component
    "platform" (default) or "test"
#>

param (
    [ValidateSet("platform", "test")]
    [string]$Component = "platform"
)

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Shield Labs Bot - Unified Web Security & Fleet Platform" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

switch ($Component) {
    "test" {
        Write-Host "Running All Verification Test Suites..." -ForegroundColor Yellow
        npm.cmd run test:all
        break
    }
    "platform" {
        Write-Host "Starting Unified Web Platform on http://127.0.0.1:3000..." -ForegroundColor Green
        Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm.cmd run start"
        Start-Sleep -Seconds 3
        Start-Process "http://127.0.0.1:3000"
        Write-Host "Unified Platform running on http://127.0.0.1:3000" -ForegroundColor Cyan
        break
    }
}
