@echo off
echo ===================================
echo   数据处理工具 - 自动部署脚本
echo ===================================
echo.

echo [1/5] 构建压缩文件...
call npm run build:advanced
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
echo.

echo [2/5] 上传 JS 文件到服务器...
scp "public\js\tool.min.js" "public\js\admin.min.js" ubuntu@1.12.57.170:/opt/data-tool/public/js/
if %errorlevel% neq 0 (
    echo ❌ 上传 JS 文件失败！
    pause
    exit /b 1
)
echo.

echo [3/5] 上传 EJS 模板到服务器...
scp "views\tool.ejs" "views\admin.ejs" ubuntu@1.12.57.170:/opt/data-tool/views/
if %errorlevel% neq 0 (
    echo ❌ 上传模板文件失败！
    pause
    exit /b 1
)
echo.

echo [4/5] 上传并更新 Nginx 配置...
scp "nginx.conf" ubuntu@1.12.57.170:/tmp/nginx.conf
if %errorlevel% neq 0 (
    echo ❌ 上传 Nginx 配置失败！
    pause
    exit /b 1
)
ssh ubuntu@1.12.57.170 "sudo mv /tmp/nginx.conf /etc/nginx/sites-available/data-tool && sudo systemctl reload nginx"
if %errorlevel% neq 0 (
    echo ❌ 更新 Nginx 配置失败！
    pause
    exit /b 1
)
echo.

echo [5/5] 重启应用...
ssh ubuntu@1.12.57.170 "pm2 restart data-tool"
if %errorlevel% neq 0 (
    echo ❌ 重启应用失败！
    pause
    exit /b 1
)
echo.

echo ===================================
echo   部署完成！已启用高级混淆和 Gzip 压缩
echo   访问: http://1.12.57.170
echo ===================================
pause
