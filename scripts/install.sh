#!/bin/bash

# 一键部署脚本 - 适用于 Ubuntu 20.04

echo "======================================"
echo "  数据处理工具 - 自动部署脚本"
echo "======================================"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 用户运行此脚本"
    echo "使用命令: sudo bash install.sh"
    exit 1
fi

# 更新系统
echo "[1/8] 更新系统包..."
apt update && apt upgrade -y

# 安装 Node.js
echo "[2/8] 安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证 Node.js 安装
node_version=$(node --version)
echo "Node.js 版本: $node_version"

# 安装 MySQL
echo "[3/8] 安装 MySQL..."
apt install -y mysql-server

# 启动 MySQL
systemctl start mysql
systemctl enable mysql

# 安装 Git
echo "[4/8] 安装 Git..."
apt install -y git

# 安装 PM2
echo "[5/8] 安装 PM2..."
npm install -g pm2

# 安装 Nginx
echo "[6/8] 安装 Nginx..."
apt install -y nginx

# 创建项目目录
echo "[7/8] 创建项目目录..."
mkdir -p /opt/data-tool

# 配置防火墙
echo "[8/8] 配置防火墙..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

echo ""
echo "======================================"
echo "  基础环境安装完成！"
echo "======================================"
echo ""
echo "接下来请执行以下步骤："
echo ""
echo "1. 配置 MySQL："
echo "   sudo mysql_secure_installation"
echo ""
echo "2. 创建数据库："
echo "   sudo mysql -u root -p"
echo "   CREATE DATABASE data_tool_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'datatool'@'localhost' IDENTIFIED BY '你的密码';"
echo "   GRANT ALL PRIVILEGES ON data_tool_db.* TO 'datatool'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "3. 上传项目代码到 /opt/data-tool/"
echo ""
echo "4. 配置 .env 文件"
echo ""
echo "5. 运行 setup.sh 完成项目配置"
echo ""
