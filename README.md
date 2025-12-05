# 数据处理工具 - SSR 版本

一个基于 Node.js + Express + EJS 的服务端渲染应用，带有用户认证和管理功能。

## 功能特点

- 🔐 **用户认证系统**：安全的登录/登出功能
- 👥 **用户管理**：管理员可以创建、编辑、删除用户
- ⏰ **账号有效期**：支持为用户设置账号过期时间
- 📊 **数据处理工具**：原有的数据分析和计算功能
- 🎨 **响应式设计**：适配各种屏幕尺寸

## 技术栈

- **后端**：Node.js + Express
- **模板引擎**：EJS
- **数据库**：MySQL
- **身份验证**：bcryptjs + express-session
- **验证**：express-validator

## 项目结构

```
demo/
├── config/
│   └── database.js          # 数据库配置
├── middlewares/
│   └── auth.js              # 认证中间件
├── models/
│   └── User.js              # 用户模型
├── public/
│   ├── css/
│   │   └── style.css        # 样式文件
│   └── js/
│       ├── tool.js          # 工具页面脚本
│       └── admin.js         # 管理页面脚本
├── routes/
│   ├── auth.js              # 认证路由
│   ├── tool.js              # 工具路由
│   └── admin.js             # 管理路由
├── views/
│   ├── partials/
│   │   └── header.ejs       # 头部组件
│   ├── login.ejs            # 登录页面
│   ├── tool.ejs             # 工具页面
│   └── admin.ejs            # 管理页面
├── .env.example             # 环境变量示例
├── .gitignore
├── package.json
├── server.js                # 服务器入口
└── README.md
```

## 📚 文档导航

- **[快速开始](QUICKSTART.md)** - 5 分钟快速部署到云服务器
- **[完整部署指南](DEPLOY.md)** - 详细的云服务器部署教程
- **[部署检查清单](CHECKLIST.md)** - 逐步检查确保部署成功

---

## 🏠 本地开发安装

### 1. 克隆项目并安装依赖

```bash
cd demo
npm install
```

### 2. 配置环境变量

复制 `.env.example` 文件并重命名为 `.env`：

```bash
copy .env.example .env
```

编辑 `.env` 文件，配置你的数据库信息：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=data_tool_db
DB_PORT=3306

# Session 密钥
SESSION_SECRET=your_secret_key_change_this_in_production

# 管理员账号（首次运行时会创建）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. 确保 MySQL 已启动

确保你的 MySQL 服务正在运行。应用启动时会自动创建数据库和表。

### 4. 启动应用

**开发环境**（带自动重启）：

```bash
npm run dev
```

**生产环境**：

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 使用说明

### 首次登录

1. 访问 `http://localhost:3000`
2. 使用默认管理员账号登录：
   - 用户名：`admin`（或你在 .env 中设置的用户名）
   - 密码：`admin123`（或你在 .env 中设置的密码）

### 管理员功能

登录后，管理员可以：

1. **创建用户**

   - 设置用户名和密码
   - 可选设置账号有效期

2. **编辑用户**

   - 修改用户密码
   - 更新账号有效期

3. **删除用户**

   - 删除普通用户（管理员账号不能被删除）

4. **查看用户列表**
   - 查看所有用户信息
   - 查看账号状态（正常/已过期）

### 普通用户

普通用户登录后可以：

- 使用数据处理工具
- 查看和处理数据
- 账号过期后将无法登录

## 数据库说明

应用启动时会自动创建 `users` 表：

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    expiry_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

## 云服务部署

### 部署到阿里云/腾讯云

1. **准备服务器**

   - 购买云服务器（CentOS/Ubuntu）
   - 安装 Node.js（建议 v16 或更高版本）
   - 安装 MySQL

2. **上传代码**

   ```bash
   # 使用 git
   git clone your-repository-url
   cd demo

   # 或使用 scp 上传
   scp -r ./demo user@your-server:/path/to/app
   ```

3. **安装依赖**

   ```bash
   npm install --production
   ```

4. **配置环境变量**

   ```bash
   cp .env.example .env
   vim .env  # 编辑配置
   ```

5. **使用 PM2 管理进程**

   ```bash
   npm install -g pm2
   pm2 start server.js --name data-tool
   pm2 save
   pm2 startup
   ```

6. **配置 Nginx 反向代理**（可选）
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### 使用 Docker 部署（可选）

创建 `Dockerfile`：

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

创建 `docker-compose.yml`：

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql-data:
```

运行：

```bash
docker-compose up -d
```

## 安全建议

1. **修改默认密码**：首次登录后立即修改管理员密码
2. **使用强密钥**：修改 `.env` 中的 `SESSION_SECRET`
3. **启用 HTTPS**：生产环境务必使用 SSL 证书
4. **定期备份**：定期备份 MySQL 数据库
5. **防火墙配置**：只开放必要的端口（80, 443, 3306）

## 故障排查

### 无法连接数据库

- 检查 MySQL 服务是否启动
- 确认 `.env` 中的数据库配置是否正确
- 检查防火墙是否阻止了数据库连接

### 无法登录

- 确认管理员账号是否已创建（查看启动日志）
- 清除浏览器 Cookie 后重试

### 页面样式丢失

- 确认 `public` 目录下的文件都已正确上传
- 检查服务器静态文件路径配置

## 开发说明

### 添加新路由

在 `routes/` 目录下创建新的路由文件，然后在 `server.js` 中引入：

```javascript
const newRoute = require("./routes/newRoute");
app.use("/new", newRoute);
```

### 修改数据库结构

在 `config/database.js` 的 `initialize()` 函数中添加新的表创建语句。

## 许可证

ISC

## 支持

如有问题，请提交 Issue 或联系管理员。
