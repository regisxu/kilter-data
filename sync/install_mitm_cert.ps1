#!/usr/bin/env powershell
# Install mitmproxy system certificate on Android Studio Pixel 7 emulator
# Run as Administrator

param(
    [string]$AvdName = "",
    [int]$MitmPort = 8080
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "mitmproxy System Certificate Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check admin permission
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Please run PowerShell as Administrator!" -ForegroundColor Red
    exit 1
}

# Find Android SDK
$androidSdk = $env:ANDROID_SDK_ROOT
if (-not $androidSdk) {
    $androidSdk = $env:ANDROID_HOME
}
if (-not $androidSdk) {
    $defaultPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "C:\Android\Sdk"
    )
    foreach ($path in $defaultPaths) {
        if (Test-Path $path) {
            $androidSdk = $path
            break
        }
    }
}

if (-not $androidSdk -or -not (Test-Path $androidSdk)) {
    Write-Host "ERROR: Android SDK not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Android SDK found: $androidSdk" -ForegroundColor Green

$emulatorPath = "$androidSdk\emulator\emulator.exe"
$adbPath = "$androidSdk\platform-tools\adb.exe"

if (-not (Test-Path $emulatorPath)) {
    Write-Host "ERROR: emulator.exe not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $adbPath)) {
    Write-Host "ERROR: adb.exe not found!" -ForegroundColor Red
    exit 1
}

# Find mitmproxy certificate
$mitmDir = "$env:USERPROFILE\.mitmproxy"
$certFile = "$mitmDir\mitmproxy-ca-cert.pem"

if (-not (Test-Path $certFile)) {
    Write-Host "ERROR: mitmproxy certificate not found: $certFile" -ForegroundColor Red
    Write-Host "Please run 'mitmweb --listen-port 8080' first to generate certificates" -ForegroundColor Yellow
    exit 1
}

Write-Host "Certificate found: $certFile" -ForegroundColor Green

# Calculate certificate hash
Write-Host "Calculating certificate hash..." -ForegroundColor Cyan

$certHash = "c8750f0d"  # Default mitmproxy hash
Write-Host "Using certificate hash: $certHash" -ForegroundColor Green

$certDestName = "$certHash.0"
$certDestPath = "$mitmDir\$certDestName"

# Copy certificate
Copy-Item $certFile $certDestPath -Force
Write-Host "Certificate prepared: $certDestPath" -ForegroundColor Green

# Find AVD
if (-not $AvdName) {
    Write-Host "Finding available AVDs..." -ForegroundColor Cyan
    $avds = & $emulatorPath -list-avds 2>$null
    
    if (-not $avds) {
        Write-Host "ERROR: No AVD found! Please create one in Android Studio" -ForegroundColor Red
        exit 1
    }
    
    $pixel7Avd = $avds | Where-Object { $_ -like "*Pixel*7*" } | Select-Object -First 1
    if ($pixel7Avd) {
        $AvdName = $pixel7Avd
    } else {
        $AvdName = $avds | Select-Object -First 1
    }
}

Write-Host "Using AVD: $AvdName" -ForegroundColor Green

# Stop running emulators
Write-Host "Checking running emulators..." -ForegroundColor Cyan
$runningDevices = & $adbPath devices | Select-String "emulator-"
if ($runningDevices) {
    Write-Host "Stopping running emulators..." -ForegroundColor Yellow
    foreach ($line in $runningDevices) {
        $device = ($line -split "\s+")[0]
        & $adbPath -s $device emu kill 2>$null
        Start-Sleep -Seconds 2
    }
}

# Start emulator with writable system
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting emulator (writable-system mode)..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DO NOT CLOSE the emulator window!" -ForegroundColor Yellow

$emulatorArgs = @(
    "-avd", $AvdName,
    "-writable-system",
    "-no-snapshot-load",
    "-netdelay", "none",
    "-netspeed", "full"
)

Start-Process -FilePath $emulatorPath -ArgumentList $emulatorArgs

Write-Host "Waiting for emulator to boot..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

# Wait for device online
$maxWait = 120
$waited = 0
$deviceOnline = $false

while ($waited -lt $maxWait) {
    $devices = & $adbPath devices
    if ($devices -match "emulator-5554\s+device") {
        $deviceOnline = $true
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "." -NoNewline
}

if (-not $deviceOnline) {
    Write-Host "ERROR: Emulator boot timeout!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Emulator is online!" -ForegroundColor Green

# Install certificate
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing certificate to system..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    Write-Host "1. Getting root access..." -ForegroundColor Gray
    & $adbPath root | Out-Null
    Start-Sleep -Seconds 3
    
    Write-Host "2. Disabling verity..." -ForegroundColor Gray
    $verityOutput = & $adbPath disable-verity 2>&1
    Write-Host "   $verityOutput" -ForegroundColor Gray
    
    if ($verityOutput -match "reboot") {
        Write-Host "Rebooting..." -ForegroundColor Yellow
        & $adbPath reboot 2>&1 | Out-Null
        Start-Sleep -Seconds 20
        
        while ($true) {
            $devices = & $adbPath devices
            if ($devices -match "emulator-5554\s+device") {
                break
            }
            Start-Sleep -Seconds 2
            Write-Host "." -NoNewline
        }
        Write-Host ""
        
        & $adbPath root 2>&1 | Out-Null
        Start-Sleep -Seconds 3
    }
    
    Write-Host "3. Remounting system partition..." -ForegroundColor Gray
    $remountOutput = & $adbPath remount 2>&1
    Write-Host "   $remountOutput" -ForegroundColor Gray
    
    if ($LASTEXITCODE -ne 0 -and $remountOutput -match "reboot") {
        Write-Host "Rebooting..." -ForegroundColor Yellow
        & $adbPath reboot 2>&1 | Out-Null
        Start-Sleep -Seconds 20
        
        while ($true) {
            $devices = & $adbPath devices
            if ($devices -match "emulator-5554\s+device") {
                break
            }
            Start-Sleep -Seconds 2
        }
        
        & $adbPath root 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        $remountOutput = & $adbPath remount 2>&1
        Write-Host "   $remountOutput" -ForegroundColor Gray
    }
    
    Write-Host "4. Pushing certificate..." -ForegroundColor Gray
    $pushOutput = & $adbPath push $certDestPath /system/etc/security/cacerts/ 2>&1
    Write-Host "   $pushOutput" -ForegroundColor Gray
    
    # Check if push actually succeeded (adb outputs file info even on success)
    if ($LASTEXITCODE -ne 0 -and $pushOutput -notmatch "file pushed") {
        throw "Failed to push certificate: $pushOutput"
    }
    
    Write-Host "5. Setting certificate permissions..." -ForegroundColor Gray
    & $adbPath shell chmod 644 /system/etc/security/cacerts/$certDestName 2>&1 | Out-Null
    
    Write-Host "6. Verifying installation..." -ForegroundColor Gray
    $verifyOutput = & $adbPath shell "ls -la /system/etc/security/cacerts/ | grep $certHash" 2>&1
    if ($verifyOutput -and $verifyOutput -notmatch "No such file") {
        Write-Host "   Certificate installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "   Warning: Certificate verification failed" -ForegroundColor Yellow
    }
    
    Write-Host "7. Configuring proxy..." -ForegroundColor Gray
    & $adbPath shell settings put global http_proxy 10.0.2.2:$MitmPort 2>&1 | Out-Null
    $proxy = & $adbPath shell settings get global http_proxy 2>&1
    Write-Host "   Proxy: $proxy" -ForegroundColor Gray
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Rebooting to apply changes..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    & $adbPath reboot 2>&1 | Out-Null
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Wait for emulator to fully reboot" -ForegroundColor White
    Write-Host "2. Run: mitmweb --listen-port $MitmPort" -ForegroundColor White
    Write-Host "3. Open http://127.0.0.1:8081" -ForegroundColor White
    Write-Host "4. Test with Kilterboard App" -ForegroundColor White
    Write-Host ""
    Write-Host "Verify certificate:" -ForegroundColor Cyan
    Write-Host "Settings > Security > Trusted credentials > System" -ForegroundColor White
    Write-Host "Look for 'mitmproxy' certificate" -ForegroundColor White
    
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
