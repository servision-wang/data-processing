# 检查数据库表结构脚本
param(
    [string]$ServerIP = "1.12.57.170",
    [string]$User = "ubuntu"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "正在检查数据库表..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 读取 .env 文件获取数据库信息
$commands = @"
cd /opt/data-tool

# 读取数据库配置
DB_NAME=\$(grep DB_NAME .env | cut -d '=' -f2)
DB_USER=\$(grep DB_USER .env | cut -d '=' -f2)
DB_PASSWORD=\$(grep DB_PASSWORD .env | cut -d '=' -f2)

echo "数据库名称: \$DB_NAME"
echo "数据库用户: \$DB_USER"
echo ""
echo "=========================================="
echo "查看所有表:"
echo "=========================================="
mysql -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME -e "SHOW TABLES;"
echo ""
echo "=========================================="
echo "users 表结构:"
echo "=========================================="
mysql -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME -e "DESCRIBE users;"
echo ""
echo "=========================================="
echo "login_sessions 表结构 (如果存在):"
echo "=========================================="
mysql -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME -e "DESCRIBE login_sessions;" 2>&1
echo ""
echo "=========================================="
echo "login_sessions 表数据:"
echo "=========================================="
mysql -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME -e "SELECT * FROM login_sessions;" 2>&1
"@

ssh ${User}@${ServerIP} $commands

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ 检查完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
