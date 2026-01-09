# 简单的数据库检查命令
# 请按照以下步骤手动执行

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "请按照以下步骤检查数据库表" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "步骤 1: 连接到服务器" -ForegroundColor Green
Write-Host "ssh ubuntu@1.12.57.170" -ForegroundColor White
Write-Host ""

Write-Host "步骤 2: 进入项目目录" -ForegroundColor Green
Write-Host "cd /opt/data-tool" -ForegroundColor White
Write-Host ""

Write-Host "步骤 3: 查看 .env 配置（记下数据库密码）" -ForegroundColor Green
Write-Host "cat .env | grep DB_" -ForegroundColor White
Write-Host ""

Write-Host "步骤 4: 连接 MySQL" -ForegroundColor Green
Write-Host "mysql -u datatool -p data_tool_db" -ForegroundColor White
Write-Host "(输入密码，从 .env 中看到的 DB_PASSWORD)" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤 5: 在 MySQL 中执行以下命令" -ForegroundColor Green
Write-Host "SHOW TABLES;" -ForegroundColor White
Write-Host "(查看所有表，应该能看到 users 和 login_sessions)" -ForegroundColor Gray
Write-Host ""
Write-Host "DESCRIBE login_sessions;" -ForegroundColor White
Write-Host "(查看 login_sessions 表结构)" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT * FROM login_sessions;" -ForegroundColor White
Write-Host "(查看 login_sessions 表数据)" -ForegroundColor Gray
Write-Host ""
Write-Host "EXIT;" -ForegroundColor White
Write-Host "(退出 MySQL)" -ForegroundColor Gray
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "或者执行一行命令快速查看:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ssh ubuntu@1.12.57.170 'cd /opt/data-tool && source .env && mysql -u`$DB_USER -p`$DB_PASSWORD `$DB_NAME -e \"SHOW TABLES; DESCRIBE login_sessions;\"'" -ForegroundColor White
Write-Host ""
