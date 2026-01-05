#!/usr/bin/env pwsh
$ErrorActionPreference = "Continue"
Set-Location "c:\Necxu\projects\medicamenta.me\applications\medicamenta.me-front-app"
Write-Host "Running tests in: $(Get-Location)"
$process = Start-Process -NoNewWindow -Wait -PassThru -FilePath "cmd.exe" -ArgumentList "/c npx ng test --no-watch --browsers=ChromeHeadless > test-final.txt 2>&1"
Write-Host "Exit code: $($process.ExitCode)"
