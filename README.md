# AI 网站生成器 v2.0 - 用户管理系统集成

## 📋 概览

这是一个基于 AI 的网站生成器，集成了完整的用户管理系统。系统使用 **Node.js + Express + MongoDB + JWT 认证 + DeepSeek AI API** 技术栈，支持用户注册、登录、项目管理和角色权限控制。

**新增功能：**
- ✅ 用户注册与登录（JWT 认证）
- ✅ 用户信息管理与密码修改
- ✅ 项目与用户关联（隔离用户数据）
- ✅ 用户角色系统（普通用户、管理员）
- ✅ 项目公开/私密设置
- ✅ 密码加密存储（bcrypt）
- ✅ MongoDB 数据持久化

---

## 🛠️ 安装与配置

### 1. 安装依赖

```bash
npm install
```

新增依赖包：
- `mongoose` - MongoDB ODM
- `bcrypt` - 密码加密
- `jsonwebtoken` - JWT token 管理

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填入实际配置：

```bash
cp .env.example .env
```

**关键配置项：**
```
# 数据库连接
MONGODB_URI=mongodb://localhost:27017/ai-website-generator

# DeepSeek API 密钥
DEEPSEEK_API_KEY=your-key-here

# JWT 密钥（务必修改）
JWT_SECRET=your-strong-secret-key-here
JWT_EXPIRE=7d
```

### 3. 启动 MongoDB

确保 MongoDB 服务运行：
```bash
# Windows
mongod

# 或使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. 启动服务器

```bash
npm start          # 生产模式
npm run dev        # 开发模式（带自动重启）
```

---

## 📚 API 文档

### 认证 API (`/api/auth`)

#### 注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}

Response (201):
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

#### 邮箱登录
```http
POST /api/auth/login-email
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 验证 Token
```http
POST /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Response (200):
{
  "success": true,
  "user": { ... }
}
```

---

### 用户 API (`/api/users`)

#### 获取当前用户信息
```http
GET /api/users/me
Authorization: Bearer {token}

Response:
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "nickname": "John",
    "bio": "Web Developer",
    "role": "user",
    "lastLogin": "2024-01-15T10:30:00Z"
  }
}
```

#### 获取其他用户公开信息
```http
GET /api/users/{userId}

Response:
{
  "success": true,
  "user": { ... }
}
```

#### 更新用户信息
```http
PUT /api/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "nickname": "John Doe",
  "bio": "Full Stack Developer",
  "avatar": "https://example.com/avatar.jpg"
}

Response:
{
  "success": true,
  "message": "用户信息更新成功",
  "user": { ... }
}
```

#### 修改密码
```http
POST /api/users/me/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "password123",
  "newPassword": "newpassword456",
  "confirmPassword": "newpassword456"
}

Response:
{
  "success": true,
  "message": "密码修改成功"
}
```

#### 列出所有用户（仅管理员）
```http
GET /api/users?page=1&limit=20&search=john
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "users": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### 禁用用户（仅管理员）
```http
POST /api/users/{userId}/disable
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "message": "用户已禁用",
  "user": { ... }
}
```

#### 设置用户角色（仅管理员）
```http
POST /api/users/{userId}/set-role
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "role": "admin"
}
```

---

### 项目 API (`/api/projects`)

#### 生成网站（需登录）
```http
POST /api/projects/generate
Authorization: Bearer {token}
Content-Type: multipart/form-data

参数：
- description: "创建一个电商网站，包含产品展示和购物车" (必需)
- files: [file1, file2] (可选，最多5个)

Response (201):
{
  "success": true,
  "message": "网站生成成功",
  "html": "<!DOCTYPE html>...",
  "project": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "uuid-string",
    "userId": "507f1f77bcf86cd799439012",
    "title": "电商网站",
    "description": "创建一个电商网站...",
    "html": "<!DOCTYPE html>...",
    "isPublic": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 获取用户项目列表
```http
GET /api/projects?page=1&limit=20&sort=-createdAt
Authorization: Bearer {token}

Response:
{
  "success": true,
  "projects": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### 获取单个项目
```http
GET /api/projects/{projectId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "project": { ... }
}
```

#### 获取公开项目（无需登录）
```http
GET /api/projects/public/{projectId}

Response:
{
  "success": true,
  "project": {
    "id": "uuid-string",
    "title": "电商网站",
    "html": "<!DOCTYPE html>...",
    "userId": {
      "username": "john_doe",
      "nickname": "John",
      "avatar": "..."
    }
  }
}
```

#### 更新项目
```http
PUT /api/projects/{projectId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "我的新电商网站",
  "description": "更新后的描述",
  "isPublic": true,
  "tags": ["ecommerce", "web"]
}

Response:
{
  "success": true,
  "message": "项目更新成功",
  "project": { ... }
}
```

#### 删除项目
```http
DELETE /api/projects/{projectId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "项目删除成功"
}
```

#### 切换项目公开状态
```http
POST /api/projects/{projectId}/toggle-public
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "项目已设为公开",
  "project": { ... }
}
```

---

## 🔐 认证流程

### JWT Token 使用

所有需要认证的 API 请求都需要在 `Authorization` 头中提供 token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token 生命周期

1. **获取 Token**：用户注册或登录时获得
2. **使用 Token**：在请求头中附加 token
3. **Token 过期**：默认 7 天后过期
4. **刷新 Token**：重新登录获取新 token

---

## 📦 数据模型

### User 模型

```javascript
{
  username: String,        // 用户名（唯一）
  email: String,          // 邮箱（唯一）
  password: String,       // 加密后的密码
  nickname: String,       // 昵称
  avatar: String,         // 头像 URL
  bio: String,            // 个人简介
  role: String,           // 角色：'user' | 'admin'
  isActive: Boolean,      // 账户是否激活
  createdAt: Date,        // 创建时间
  updatedAt: Date,        // 更新时间
  lastLogin: Date         // 最后登录时间
}
```

### Project 模型

```javascript
{
  id: String,             // 项目唯一标识符
  userId: ObjectId,       // 所有者用户 ID（外键）
  title: String,          // 项目标题
  description: String,    // 项目描述
  html: String,           // 生成的 HTML 代码
  files: Array,           // 关联的上传文件
  isPublic: Boolean,      // 是否公开
  isTemplate: Boolean,    // 是否为模板
  tags: Array,            // 项目标签
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

---

## 🔑 环境变量详解

| 变量名 | 说明 | 示例值 |
|-------|------|--------|
| `PORT` | 服务器端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` / `production` |
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb://localhost:27017/ai-website-generator` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-...` |
| `JWT_SECRET` | JWT 签名密钥 | 任意复杂字符串 |
| `JWT_EXPIRE` | JWT 过期时间 | `7d` / `24h` |

---

## 🚀 快速开始示例

### 1. 注册新用户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "secure123",
    "confirmPassword": "secure123"
  }'
```

### 2. 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secure123"
  }'
```

获取返回的 `token`。

### 3. 生成网站

```bash
curl -X POST http://localhost:3000/api/projects/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "description=创建一个绿色植物电商网站，包含产品展示、购物车和支付功能"
```

### 4. 获取项目列表

```bash
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🛡️ 安全建议

### 生产环境配置

1. **修改 JWT_SECRET**
   ```bash
   # 生成强密钥
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **使用环境变量**
   - 不要将敏感信息提交到版本控制系统
   - 使用 `.env` 文件（已在 `.gitignore` 中）

3. **HTTPS**
   - 生产环境必须使用 HTTPS

4. **速率限制**
   - 建议在 nginx 或 API 网关层添加速率限制

5. **CORS 配置**
   ```javascript
   // 生产环境配置
   app.use(cors({
     origin: ['https://yourdomain.com'],
     credentials: true
   }));
   ```

---

## 📝 常见问题

### Q: 如何重置数据库？

```bash
# 连接 MongoDB
mongo

# 删除数据库
use ai-website-generator
db.dropDatabase()
```

### Q: 用户密码忘记了怎么办？

目前需要通过数据库直接重置。未来可添加"找回密码"功能。

### Q: 如何创建管理员？

通过 API 调用或直接数据库操作：
```javascript
// 数据库操作
db.users.updateOne(
  { username: "admin" },
  { $set: { role: "admin" } }
)
```

---

## 📞 支持与反馈

如有问题或建议，欢迎提出！

---


## 📋 更新日志

### v2.0.0
- ✅ 添加用户认证系统（JWT）
- ✅ 项目与用户关联
- ✅ 密码加密存储（bcrypt）
- ✅ MongoDB 数据库支持
- ✅ 用户角色权限系统
- ✅ 项目公开/私密设置

### v1.0.0
- ✅ 基础网站生成功能
- ✅ DeepSeek API 集成
- ✅ 文件上传支持
