#!/bin/bash

# 项目配置脚本

echo "======================================"
echo "  配置数据处理工具项目"
echo "======================================"
echo ""

cd /opt/data-tool

# 检查项目目录
if [ ! -f "package.json" ]; then
    echo "错误：找不到 package.json 文件"
    echo "请确保已将项目代码上传到 /opt/data-tool/"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "错误：找不到 .env 文件"
    echo "请先创建并配置 .env 文件"
    exit 1
fi

# 安装依赖
echo "[1/4] 安装项目依赖..."
npm install --production

# 测试启动
echo "[2/4] 测试启动应用..."
timeout 5s node server.js &
sleep 3

# 使用 PM2 启动
echo "[3/4] 使用 PM2 启动应用..."
pm2 delete data-tool 2>/dev/null
pm2 start server.js --name data-tool

# 设置开机自启
echo "[4/4] 配置开机自启..."
pm2 startup
pm2 save

echo ""
echo "======================================"
echo "  项目配置完成！"
echo "======================================"
echo ""
pm2 status
echo ""
echo "应用已启动，可以通过以下方式访问："
echo "http://$(curl -s ifconfig.me):3000"
echo ""
echo "常用命令："
echo "  pm2 logs data-tool  - 查看日志"
echo "  pm2 restart data-tool - 重启应用"
echo "  pm2 stop data-tool - 停止应用"
echo ""
