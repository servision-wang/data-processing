# 📤 上传代码到服务器的三种方法

## 方法 1：WinSCP（推荐，最简单）⭐

### 步骤：

1. **下载 WinSCP**

   - 访问：https://winscp.net/eng/download.php
   - 下载安装版或便携版

2. **连接到服务器**

   - 打开 WinSCP
   - 填写连接信息：
     ```
     文件协议：SFTP
     主机名：你的服务器IP
     端口号：22
     用户名：root
     密码：你的服务器密码
     ```
   - 点击"登录"

3. **上传文件**

   - 左侧：本地电脑文件
   - 右侧：服务器文件
   - 在右侧导航到 `/opt/` 目录
   - 将本地的 `demo` 文件夹拖拽到右侧
   - 右键重命名为 `data-tool`

4. **完成！**
   - 代码已上传到 `/opt/data-tool/`

---

## 方法 2：Git（推荐用于持续更新）

### 前置准备：

1. **在 GitHub/Gitee 创建仓库**

   - 访问 https://github.com/new
   - 创建一个新仓库（public 或 private）

2. **本地推送代码**

   ```powershell
   # 在本地项目目录
   cd d:\workspace\vue\project\demo

   # 初始化 Git
   git init

   # 添加所有文件
   git add .

   # 提交
   git commit -m "Initial commit"

   # 关联远程仓库
   git remote add origin https://github.com/你的用户名/仓库名.git

   # 推送到 GitHub
   git push -u origin main
   ```

### 服务器端拉取：

```bash
# 在服务器上执行
cd /opt
git clone https://github.com/你的用户名/仓库名.git data-tool
cd data-tool
```

### 后续更新：

```bash
# 本地修改后推送
cd d:\workspace\vue\project\demo
git add .
git commit -m "更新说明"
git push

# 服务器拉取更新
ssh root@服务器IP
cd /opt/data-tool
git pull
pm2 restart data-tool
```

---

## 方法 3：SCP 命令行上传

### Windows PowerShell：

```powershell
# 上传整个项目
cd d:\workspace\vue\project\demo
scp -r . root@服务器IP:/opt/data-tool/

# 或者先打包再上传（更快）
tar --exclude='node_modules' --exclude='.git' -czf demo.tar.gz .
scp demo.tar.gz root@服务器IP:/opt/

# 然后在服务器上解压
ssh root@服务器IP
cd /opt
mkdir data-tool
tar -xzf demo.tar.gz -C data-tool
```

### 单个文件更新：

```powershell
# 只上传修改的文件
scp server.js root@服务器IP:/opt/data-tool/
scp .env root@服务器IP:/opt/data-tool/
```

---

## 方法 4：使用 FTP/SFTP 客户端

### FileZilla（免费）

1. **下载 FileZilla**

   - 访问：https://filezilla-project.org/

2. **连接设置**

   ```
   主机：sftp://服务器IP
   用户名：root
   密码：服务器密码
   端口：22
   ```

3. **拖拽上传**
   - 左侧：本地文件
   - 右侧：服务器（/opt/data-tool/）

---

## 方法 5：压缩包方式（适合大文件）

### 在本地：

```powershell
# 压缩项目（排除不必要的文件）
cd d:\workspace\vue\project
Compress-Archive -Path demo\* -DestinationPath demo.zip -CompressionLevel Optimal
```

### 上传到服务器：

```powershell
scp demo.zip root@服务器IP:/opt/
```

### 在服务器解压：

```bash
cd /opt
unzip demo.zip -d data-tool
```

---

## 比较和建议

| 方法      | 难度        | 速度 | 适用场景           |
| --------- | ----------- | ---- | ------------------ |
| WinSCP    | ⭐ 最简单   | 中等 | 首次部署，偶尔更新 |
| Git       | ⭐⭐ 简单   | 快   | 持续开发，频繁更新 |
| SCP       | ⭐⭐⭐ 中等 | 快   | 命令行熟练者       |
| FileZilla | ⭐ 最简单   | 中等 | 大量文件管理       |
| 压缩包    | ⭐⭐ 简单   | 最快 | 大项目首次上传     |

### 推荐方案：

- **首次部署**：WinSCP（图形界面，直观）
- **日常开发**：Git（版本控制，方便回滚）
- **紧急修复**：SCP（快速上传单个文件）

---

## 常见问题

### Q1: Permission denied

```bash
# 在服务器上修改权限
sudo chown -R $USER:$USER /opt/data-tool
sudo chmod -R 755 /opt/data-tool
```

### Q2: 文件太大上传慢

```bash
# 排除 node_modules（在服务器上重新安装）
# 本地删除 node_modules 后再上传
# 服务器上执行：
cd /opt/data-tool
npm install --production
```

### Q3: 上传中断

```bash
# 使用 rsync 代替 scp（支持断点续传）
rsync -avz --progress demo/ root@服务器IP:/opt/data-tool/
```

### Q4: Git 推送失败

```bash
# 如果文件太大，配置 Git LFS
git lfs install
git lfs track "*.zip"
git add .gitattributes
git commit -m "Add LFS"
git push
```

---

## 自动化部署脚本

创建 `deploy.ps1`（Windows）：

```powershell
# 自动部署脚本
param(
    [string]$ServerIP = "你的服务器IP",
    [string]$User = "root"
)

Write-Host "开始部署..." -ForegroundColor Green

# 压缩项目
Write-Host "压缩项目文件..." -ForegroundColor Yellow
Compress-Archive -Path demo\* -DestinationPath demo.zip -Force

# 上传到服务器
Write-Host "上传到服务器..." -ForegroundColor Yellow
scp demo.zip ${User}@${ServerIP}:/opt/

# 在服务器上执行部署
Write-Host "在服务器上部署..." -ForegroundColor Yellow
ssh ${User}@${ServerIP} @"
cd /opt
rm -rf data-tool
unzip -q demo.zip -d data-tool
cd data-tool
npm install --production
pm2 restart data-tool
"@

Write-Host "部署完成！" -ForegroundColor Green
```

使用：

```powershell
.\deploy.ps1 -ServerIP "你的IP" -User "root"
```

---

## 最佳实践

1. **使用 .gitignore**

   ```
   node_modules/
   .env
   *.log
   .DS_Store
   ```

2. **敏感文件单独上传**

   - `.env` 文件不要提交到 Git
   - 使用 WinSCP 或 SCP 单独上传

3. **定期备份**

   ```bash
   # 服务器上定期备份
   cd /opt
   tar -czf data-tool-backup-$(date +%Y%m%d).tar.gz data-tool/
   ```

4. **使用持续集成**
   - GitHub Actions
   - GitLab CI/CD
   - 自动部署到服务器

---

需要帮助？查看：

- [QUICKSTART.md](QUICKSTART.md) - 快速开始
- [DEPLOY.md](DEPLOY.md) - 完整部署指南
- [CHECKLIST.md](CHECKLIST.md) - 部署检查清单
