# 手动安装步骤（如果自动脚本失败）
# 请按照输出提示一步步执行

Write-Host "==== 手动安装 mitmproxy 系统证书 ====" -ForegroundColor Cyan
Write-Host ""

# 1. 检查环境
Write-Host "步骤 1: 检查环境" -ForegroundColor Yellow
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
$emulator = "$androidSdk\emulator\emulator.exe"
$adb = "$androidSdk\platform-tools\adb.exe"

Write-Host "Android SDK: $androidSdk"
Write-Host "Emulator: $emulator"
Write-Host "ADB: $adb"

# 2. 显示证书路径
Write-Host ""
Write-Host "步骤 2: 准备证书" -ForegroundColor Yellow
$cert = "$env:USERPROFILE\.mitmproxy\mitmproxy-ca-cert.pem"
Write-Host "证书路径: $cert"
Write-Host ""
Write-Host "请手动复制并命名为 c8750f0d.0（或计算正确哈希值）"
Write-Host "命令: Copy-Item '$cert' '$env:USERPROFILE\.mitmproxy\c8750f0d.0'"

# 3. 显示启动命令
Write-Host ""
Write-Host "步骤 3: 启动模拟器（在新窗口运行）" -ForegroundColor Yellow
Write-Host "$emulator -avd Pixel_7_API_34 -writable-system -no-snapshot-load" -ForegroundColor Green

# 4. 显示 ADB 命令
Write-Host ""
Write-Host "步骤 4: 等待模拟器启动后，依次执行:" -ForegroundColor Yellow
Write-Host "$adb root" -ForegroundColor Green
Write-Host "$adb disable-verity" -ForegroundColor Green
Write-Host "$adb reboot" -ForegroundColor Green
Write-Host "# 等待重启..." -ForegroundColor Gray
Write-Host "$adb root" -ForegroundColor Green
Write-Host "$adb remount" -ForegroundColor Green
Write-Host "$adb push '$env:USERPROFILE\.mitmproxy\c8750f0d.0' /system/etc/security/cacerts/" -ForegroundColor Green
Write-Host "$adb shell chmod 644 /system/etc/security/cacerts/c8750f0d.0" -ForegroundColor Green
Write-Host "$adb reboot" -ForegroundColor Green

Write-Host ""
Write-Host "步骤 5: 重启后设置代理" -ForegroundColor Yellow
Write-Host "$adb shell settings put global http_proxy 10.0.2.2:8080" -ForegroundColor Green

Write-Host ""
Write-Host "完成!" -ForegroundColor Green
