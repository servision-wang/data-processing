# 检查并配置 Nginx 传递真实 IP
param(
    [string]$ServerIP = "1.12.57.170",
    [string]$User = "ubuntu"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "检查 Nginx 配置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$commands = @'
echo "当前 Nginx 配置:"
echo "=========================================="
sudo cat /etc/nginx/sites-available/default | grep -A 20 "location /"
echo ""
echo "=========================================="
echo "建议的 Nginx 配置（需要包含以下代码）:"
echo "=========================================="
cat << 'EOF'

location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

EOF
echo ""
echo "=========================================="
echo "如果需要修改，执行以下命令:"
echo "sudo nano /etc/nginx/sites-available/default"
echo "修改后重启 Nginx: sudo systemctl restart nginx"
echo "=========================================="
'@

ssh ${User}@${ServerIP} $commands

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ 检查完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
