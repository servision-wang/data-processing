# Windows PowerShell 一键重启脚本
# 用法：.\restart-remote.ps1

$ServerIP = "1.12.57.170"
$User = "ubuntu"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "正在重启远程服务器应用..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 执行重启命令
ssh ${User}@${ServerIP} "cd /opt/data-tool && pm2 restart data-tool && pm2 logs data-tool --lines 10 --nostream"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "✅ 应用重启成功！" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "现在可以访问：http://$ServerIP" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "❌ 重启失败，请检查错误信息" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
}
