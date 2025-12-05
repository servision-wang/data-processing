# 🚀 5 分钟快速部署到云服务器

## 前提条件

- 已购买云服务器（腾讯云/华为云/阿里云）
- 系统：Ubuntu 20.04
- 已获得服务器 IP 和 root 密码

---

## 步骤 1：连接服务器（本地电脑执行）

```powershell
# 在 Windows PowerShell 中执行
ssh root@你的服务器IP
# 输入密码
```

---

## 步骤 2：一键安装环境（服务器执行）

```bash
# 下载并执行安装脚本
curl -fsSL https://raw.githubusercontent.com/你的仓库/main/scripts/install.sh | sudo bash

# 或者手动执行：
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs mysql-server git nginx
sudo npm install -g pm2
```

---

## 步骤 3：配置 MySQL（服务器执行）

```bash
# 设置 MySQL（记住你的密码！）
sudo mysql_secure_installation

# 创建数据库
sudo mysql -u root -p
```

在 MySQL 中执行：

```sql
CREATE DATABASE data_tool_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'datatool'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON data_tool_db.* TO 'datatool'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 步骤 4：上传代码

**最简单方法：使用 WinSCP**

1. 下载 WinSCP: https://winscp.net/eng/download.php
2. 连接到服务器：
   - 文件协议：SFTP
   - 主机名：你的服务器 IP
   - 用户名：root
   - 密码：你的服务器密码
3. 拖拽 `demo` 文件夹到服务器的 `/opt/` 目录
4. 重命名为 `data-tool`

**或使用命令行：**

```powershell
# 在本地电脑 PowerShell 执行
cd d:\workspace\vue\project\demo
scp -r . root@你的服务器IP:/opt/data-tool/
```

---

## 步骤 5：配置项目（服务器执行）

```bash
cd /opt/data-tool

# 创建 .env 文件
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_USER=datatool
DB_PASSWORD=YourPassword123!
DB_NAME=data_tool_db
DB_PORT=3306
SESSION_SECRET=change_this_to_random_string_32_chars_min
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123
EOF

# 安装依赖
npm install --production

# 启动应用
pm2 start server.js --name data-tool
pm2 startup
pm2 save
```

---

## 步骤 6：配置 Nginx（服务器执行）

```bash
# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/data-tool << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/data-tool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 开放端口（重要！）
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

**在云控制台也要开放端口：**

- 登录腾讯云/华为云控制台
- 找到你的服务器 → 安全组
- 添加规则：开放 22, 80, 443 端口

---

## 步骤 7：测试访问

在浏览器打开：`http://你的服务器IP`

默认登录信息：

- 用户名：`admin`
- 密码：`Admin@123`

🎉 **部署完成！**

---

## 常用管理命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs data-tool

# 重启应用
pm2 restart data-tool

# 更新代码后重启
cd /opt/data-tool
git pull  # 如果使用 Git
pm2 restart data-tool
```

---

## 遇到问题？

1. **无法访问**

   - 检查云控台安全组是否开放端口
   - 执行：`pm2 logs data-tool` 查看错误

2. **数据库错误**

   - 检查 MySQL：`sudo systemctl status mysql`
   - 检查 .env 配置是否正确

3. **获取更多帮助**
   - 查看 DEPLOY.md 完整文档
   - 查看 CHECKLIST.md 检查清单

---

## 下一步

- [ ] 修改管理员密码
- [ ] 配置域名和 HTTPS
- [ ] 设置数据库定时备份
- [ ] 配置监控和告警

详细说明请查看 `DEPLOY.md`
