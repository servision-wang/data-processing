# 云服务器部署指南

## 📦 部署前准备

### 1. 购买云服务器

**推荐配置**：

- **CPU**: 2 核
- **内存**: 2GB 或 4GB
- **系统**: Ubuntu 20.04 LTS 或 CentOS 7/8
- **带宽**: 1-5Mbps
- **云服务商**: 腾讯云 / 华为云 / 阿里云

**费用参考**：约 ¥100-300/年（学生优惠更便宜）

📖 **详细购买教程**：

- [腾讯云购买详细教程](docs/buy-tencent-cloud.md) - 图文并茂，手把手教学
- [云服务器选购对比](CLOUD.md) - 各大云服务商对比

### 2. 购买域名（可选）

- 在腾讯云/华为云/阿里云购买域名
- 进行域名备案（国内服务器必须）
- 将域名解析到服务器 IP

---

## 🚀 部署步骤（适用于 Ubuntu）

### 第一步：连接到服务器

使用 SSH 连接（Windows 使用 PowerShell 或 PuTTY）：

```bash
# 在你的本地电脑 PowerShell 中执行
ssh root@你的服务器IP
# 首次连接输入 yes，然后输入密码
```

### 第二步：安装必要软件

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version

# 安装 MySQL
sudo apt install -y mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置 MySQL
sudo mysql_secure_installation
# 按提示设置：
# - 设置 root 密码（记住这个密码！）
# - 删除匿名用户: Y
# - 禁止 root 远程登录: Y
# - 删除测试数据库: Y
# - 重新加载权限表: Y

# 安装 Git
sudo apt install -y git

# 安装 PM2（进程管理器）
sudo npm install -g pm2
```

### 第三步：上传代码到服务器

**方法 1：使用 Git（推荐）**

```bash
# 在服务器上执行
cd /opt
sudo git clone https://github.com/你的用户名/你的仓库.git data-tool
cd data-tool

# 如果没有 Git 仓库，先在本地创建：
# 1. 在 GitHub 创建新仓库
# 2. 在本地项目目录执行：
#    git init
#    git add .
#    git commit -m "Initial commit"
#    git remote add origin https://github.com/你的用户名/你的仓库.git
#    git push -u origin main
```

**方法 2：使用 SCP 直接上传**

```powershell
# 在你的本地电脑 PowerShell 中执行
# 先打包项目（排除 node_modules）
cd d:\workspace\vue\project\demo
tar --exclude='node_modules' --exclude='.git' -czf demo.tar.gz .

# 上传到服务器
scp demo.tar.gz root@你的服务器IP:/opt/

# 然后在服务器上解压
ssh root@你的服务器IP
cd /opt
mkdir data-tool
tar -xzf demo.tar.gz -C data-tool
cd data-tool
```

**方法 3：使用 WinSCP（图形界面，最简单）**

1. 下载 WinSCP: https://winscp.net/
2. 连接到服务器（输入 IP、用户名 root、密码）
3. 直接拖拽 demo 文件夹到服务器的 /opt/ 目录

### 第四步：配置数据库

```bash
# 登录 MySQL
sudo mysql -u root -p
# 输入你设置的 MySQL root 密码

# 在 MySQL 中执行以下命令：
CREATE DATABASE data_tool_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'datatool'@'localhost' IDENTIFIED BY '你的数据库密码';
GRANT ALL PRIVILEGES ON data_tool_db.* TO 'datatool'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 第五步：配置项目环境变量

```bash
cd /opt/data-tool

# 创建 .env 文件
nano .env
```

粘贴以下内容（按 Ctrl+O 保存，Ctrl+X 退出）：

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_USER=datatool
DB_PASSWORD=你刚才设置的数据库密码
DB_NAME=data_tool_db
DB_PORT=3306

# Session 密钥（改成随机字符串）
SESSION_SECRET=your_random_secret_key_here_change_this

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123456
```

### 第六步：安装依赖并启动

```bash
# 安装项目依赖
npm install --production

# 测试启动（确保没有错误）
node server.js
# 看到 "服务器运行在 http://localhost:3000" 和 "数据库初始化成功" 就成功了
# 按 Ctrl+C 停止

# 使用 PM2 启动（后台运行）
pm2 start server.js --name data-tool

# 设置开机自启
pm2 startup
pm2 save

# 查看运行状态
pm2 status
pm2 logs data-tool  # 查看日志
```

### 第七步：配置防火墙

```bash
# 开放 3000 端口（临时测试用）
sudo ufw allow 3000

# 开放 SSH 端口（重要！）
sudo ufw allow 22

# 启用防火墙
sudo ufw enable
```

**在云服务器控制台也要开放端口**：

- 登录腾讯云/华为云控制台
- 找到"安全组"设置
- 添加入站规则：允许 TCP 3000 端口

### 第八步：测试访问

在浏览器访问：`http://你的服务器IP:3000`

如果能看到登录页面，恭喜部署成功！🎉

---

## 🔧 安装 Nginx（推荐，用于反向代理）

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/data-tool
```

粘贴以下配置：

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    client_max_body_size 10M;

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
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/data-tool /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 开放 80 端口
sudo ufw allow 80
sudo ufw allow 443  # HTTPS 端口
```

**在云服务器控制台开放 80 和 443 端口**

现在访问：`http://你的服务器IP` （不需要端口号了）

---

## 🔐 配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取免费 SSL 证书（需要域名）
sudo certbot --nginx -d 你的域名.com

# 按提示输入邮箱，同意条款
# 选择：2 (Redirect - 自动跳转 HTTPS)

# 自动续期
sudo certbot renew --dry-run
```

现在访问：`https://你的域名.com` 🔒

---

## 📊 常用 PM2 命令

```bash
pm2 status              # 查看所有进程状态
pm2 logs data-tool      # 查看日志
pm2 restart data-tool   # 重启应用
pm2 stop data-tool      # 停止应用
pm2 delete data-tool    # 删除应用
pm2 monit               # 实时监控
```

---

## 🔄 更新代码

```bash
cd /opt/data-tool

# 方法1：使用 Git
git pull

# 方法2：重新上传文件（使用 WinSCP 或 scp）

# 重装依赖（如果 package.json 有变化）
npm install --production

# 重启应用
pm2 restart data-tool
```

---

## 🛠️ 故障排查

### 无法连接到服务器

```bash
# 检查 Node.js 是否运行
pm2 status

# 查看错误日志
pm2 logs data-tool --lines 50

# 检查端口占用
sudo netstat -tlnp | grep 3000
```

### 数据库连接失败

```bash
# 检查 MySQL 是否运行
sudo systemctl status mysql

# 重启 MySQL
sudo systemctl restart mysql

# 测试数据库连接
mysql -u datatool -p data_tool_db
```

### 权限问题

```bash
# 修改项目目录权限
sudo chown -R $USER:$USER /opt/data-tool
sudo chmod -R 755 /opt/data-tool
```

---

## 📱 数据库备份

```bash
# 备份数据库
mysqldump -u datatool -p data_tool_db > backup_$(date +%Y%m%d).sql

# 定时备份（每天凌晨2点）
crontab -e
# 添加这行：
0 2 * * * mysqldump -u datatool -p你的密码 data_tool_db > /opt/backups/db_$(date +\%Y\%m\%d).sql
```

---

## 💰 成本估算

| 项目     | 费用            | 说明                  |
| -------- | --------------- | --------------------- |
| 云服务器 | ¥100-300/年     | 2 核 2G，学生机更便宜 |
| 域名     | ¥30-80/年       | .com/.cn 域名         |
| SSL 证书 | 免费            | Let's Encrypt         |
| **总计** | **¥130-380/年** | 约 ¥11-32/月          |

---

## 🎯 快速部署脚本

创建一键部署脚本：

```bash
# 在服务器上创建
nano /opt/deploy.sh
```

```bash
#!/bin/bash
echo "开始部署数据处理工具..."

cd /opt/data-tool
git pull
npm install --production
pm2 restart data-tool

echo "部署完成！"
pm2 status
```

```bash
chmod +x /opt/deploy.sh

# 以后更新只需执行：
/opt/deploy.sh
```

---

## 📞 技术支持

遇到问题？检查：

1. PM2 日志：`pm2 logs data-tool`
2. Nginx 日志：`sudo tail -f /var/log/nginx/error.log`
3. 系统日志：`sudo journalctl -xe`

祝部署顺利！🚀
