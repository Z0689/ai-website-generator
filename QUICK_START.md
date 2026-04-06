# 🚀 快速开始指南

## 5 分钟内运行 AI 网站生成器 v2.0

### 前置要求

- Node.js >= 14.x
- MongoDB (本地或远程)
- DeepSeek API 密钥

---

## 第一步：环境准备

### 1.1 启动 MongoDB

**选项 A：本地 MongoDB**
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**选项 B：Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

验证连接：
```bash
mongosh  # 或 mongo
```

### 1.2 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env，填入你的 API 密钥
# DEEPSEEK_API_KEY=sk-xxxxxxxx
```

---

## 第二步：安装并启动

### 2.1 安装依赖

```bash
npm install
```

### 2.2 初始化数据库

```bash
npm run init-db
```

这将创建：
- 管理员用户：`admin` / `admin123`
- 演示用户：`demo` / `demo123`

⚠️ **务必修改管理员密码！**

### 2.3 启动服务器

```bash
npm start
```

或开发模式（带自动重启）：
```bash
npm run dev
```

预期输出：
```
╔════════════════════════════════════════╗
║   🚀 AI 网站生成器 v2.0 服务器启动   ║
╚════════════════════════════════════════╝

📍 本地访问: http://localhost:3000
📊 数据库: mongodb://localhost:27017/ai-website-generator
🔑 API密钥: ✓ 已配置
🎯 JWT密钥: ✓ 已配置

📚 API 文档:
   - 认证: POST /api/auth/register, /api/auth/login
   - 用户: GET/PUT /api/users/me
   - 项目: GET/POST /api/projects
   - 健康: GET /api/health
```

---

## 第三步：测试 API

### 在新终端窗口执行：

```bash
npm run test-api
```

这将运行一系列测试，包括：
- ✅ 健康检查
- ✅ 用户注册
- ✅ 获取用户信息
- ✅ 更新用户信息
- ✅ Token 验证
- ✅ 获取项目列表
- ✅ 修改密码

---

## 第四步：手动测试

### 4.1 打开浏览器

访问：http://localhost:3000

### 4.2 注册新账户

填写表单并提交（旧的前端 UI）

### 4.3 使用 API 生成网站

```bash
# 1. 注册/登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "password": "demo123"
  }'

# 获取返回的 token

# 2. 生成网站
curl -X POST http://localhost:3000/api/projects/generate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "description=创建一个专业的科技公司官网，包括首页、产品展示、团队介绍和联系方式"

# 3. 获取项目列表
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 常见命令

```bash
# 开发
npm run dev              # 启动（自动重启）
npm run test-api        # 测试 API
npm run init-db         # 重置数据库

# 生产
npm start               # 启动服务器

# 管理
npm run stop            # 停止服务器
```

---

## 故障排除

### 问题 1：MongoDB 连接失败

**症状**：`MongoDB 连接失败`

**解决方案**：
```bash
# 检查 MongoDB 是否运行
mongosh

# 检查连接字符串
echo $MONGODB_URI

# 使用 Docker 启动
docker run -d -p 27017:27017 mongo:latest
```

### 问题 2：DeepSeek API 连接失败

**症状**：`生成失败`

**解决方案**：
1. 检查 API 密钥是否正确
2. 检查 .env 文件中 `DEEPSEEK_API_KEY` 是否设置
3. 检查网络连接

### 问题 3：端口 3000 已被占用

**症状**：`listen EADDRINUSE :::3000`

**解决方案**：
```bash
# 方案 A：使用另一个端口
PORT=3001 npm start

# 方案 B：杀死占用端口的进程
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### 问题 4：密码修改后无法登录

**症状**：`用户名或密码错误`

**解决方案**：
```bash
# 重置数据库
npm run init-db

# 或通过 MongoDB 直接修改
# 连接 MongoDB，删除用户，重新初始化
```

---

## API 快速参考

### 认证

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/verify | 验证 Token |

### 用户

| 方法 | 端点 | 说明 | 需要认证 |
|------|------|------|--------|
| GET | /api/users/me | 获取当前用户 | ✓ |
| PUT | /api/users/me | 更新用户信息 | ✓ |
| POST | /api/users/me/change-password | 修改密码 | ✓ |

### 项目

| 方法 | 端点 | 说明 | 需要认证 |
|------|------|------|--------|
| POST | /api/projects/generate | 生成网站 | ✓ |
| GET | /api/projects | 获取我的项目 | ✓ |
| GET | /api/projects/:id | 获取单个项目 | ✓ |
| PUT | /api/projects/:id | 更新项目 | ✓ |
| DELETE | /api/projects/:id | 删除项目 | ✓ |
| GET | /api/projects/public/:id | 获取公开项目 | ✗ |

---

## 下一步

- 📖 阅读 [USER_MANAGEMENT_README.md](./USER_MANAGEMENT_README.md) 了解完整 API
- 📁 查看 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) 理解项目结构
- 🎨 自定义前端界面
- 🔒 配置生产环境安全设置

---

## 需要帮助？

遇到问题？检查以下文件：
- 错误日志：服务器控制台输出
- 配置：`.env` 文件
- API 文档：`USER_MANAGEMENT_README.md`
- 项目结构：`PROJECT_STRUCTURE.md`

---

## 版本信息

- **版本**：2.0.0
- **发布**：2024-01-15
- **主要特性**：完整用户管理系统 + MongoDB 集成

---

**祝你使用愉快！🎉**
