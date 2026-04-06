# 项目文件结构

```
web_agent/
├── backend/                          # 后端代码
│   ├── server.js                    # 主服务器文件（v2.0 - 使用 MongoDB + 路由系统）
│   ├── models/                      # 数据模型（MongoDB schemas）
│   │   ├── User.js                  # 用户模型
│   │   └── Project.js               # 项目模型
│   ├── middleware/                  # 中间件
│   │   └── auth.js                  # JWT 认证中间件
│   ├── routes/                      # API 路由
│   │   ├── auth.js                  # 认证路由（注册/登录）
│   │   ├── users.js                 # 用户管理路由
│   │   └── projects.js              # 项目管理路由
│   ├── utils/                       # 工具函数
│   │   └── ai.js                    # AI 相关函数（DeepSeek API 调用）
│   └── scripts/                     # 工具脚本
│       ├── init-db.js               # 数据库初始化脚本
│       └── test-api.js              # API 测试脚本
│
├── frontend/                         # 前端代码
│   ├── index.html                   # 主页面
│   ├── scripts/
│   │   └── app.js                   # 前端应用逻辑
│   └── styles/
│       └── main.css                 # 样式文件
│
├── uploads/                          # 用户上传的文件存储目录
├── projects/                         # 生成的 HTML 项目存储目录
├── package.json                      # 项目依赖配置
├── .env.example                      # 环境变量示例
├── .env                              # 环境变量（本地）
├── .gitignore                        # Git 忽略文件列表
├── USER_MANAGEMENT_README.md         # 用户管理系统完整文档
├── PROJECT_STRUCTURE.md              # 本文件
└── README.md                         # 原始项目说明（可选）
```

## 核心模块说明

### 1. 后端架构

#### server.js（v2.0）
- **职责**：主服务器入口
- **功能**：
  - MongoDB 连接管理
  - Express 中间件配置
  - 路由挂载
  - 错误处理
  - 服务器启动与优雅关闭

#### models/ - 数据模型

**User.js**
```
字段：
- username (唯一)
- email (唯一)
- password (加密)
- nickname
- avatar
- bio
- role (user / admin)
- isActive
- lastLogin

方法：
- comparePassword()
- toPublic()
```

**Project.js**
```
字段：
- id (唯一)
- userId (外键 → User)
- title
- description
- html
- files[]
- isPublic
- isTemplate
- tags[]
- createdAt / updatedAt
```

#### middleware/ - 中间件

**auth.js**
```
函数：
- generateToken(userId)        # 生成 JWT
- verifyToken(token)           # 验证 JWT
- authMiddleware               # 强制认证
- optionalAuthMiddleware       # 可选认证
- adminMiddleware              # 管理员认证
```

#### routes/ - API 路由

**auth.js**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/login-email
- POST /api/auth/verify

**users.js**
- GET /api/users/me
- GET /api/users/:userId
- PUT /api/users/me
- POST /api/users/me/change-password
- GET /api/users (管理员)
- POST /api/users/:userId/disable (管理员)
- POST /api/users/:userId/enable (管理员)
- POST /api/users/:userId/set-role (管理员)

**projects.js**
- POST /api/projects/generate
- GET /api/projects
- GET /api/projects/:projectId
- GET /api/projects/public/:projectId
- PUT /api/projects/:projectId
- DELETE /api/projects/:projectId
- POST /api/projects/:projectId/toggle-public

#### utils/ - 工具函数

**ai.js**
```
函数：
- callDeepSeekAPI()            # 调用 DeepSeek API
- extractHTMLFromAIResponse()  # 解析 AI 响应
- extractTitleFromDescription()# 从描述提取标题
```

### 2. 前端架构

#### index.html
- 应用主容器
- 用户界面结构（创建模式/历史模式）
- 模态框定义
- 脚本/样式引入

#### app.js
- DOM 管理
- 事件监听
- API 调用
- 状态管理
- 预览显示

#### main.css
- 响应式布局
- 深色/浅色主题
- 动画效果
- 组件样式

## 数据流

### 注册流程
```
前端表单 → POST /api/auth/register 
→ User.create() + bcrypt 密码加密 
→ JWT token 生成 
→ 前端存储 token
```

### 项目生成流程
```
前端表单 → POST /api/projects/generate (需要 token)
→ 验证用户认证
→ 调用 AI API (DeepSeek)
→ 创建 Project 记录
→ 存储 HTML 文件
→ 返回项目数据
```

### 用户项目隔离
```
所有项目查询都添加 userId 过滤：
GET /api/projects
→ Project.find({ userId: req.user.userId })
→ 只返回该用户的项目
```

## 安全措施

1. **密码安全**
   - 使用 bcrypt 加密（salt rounds: 10）
   - 密码从不直接返回

2. **认证**
   - JWT token 验证
   - Token 过期时间设置

3. **授权**
   - 路由级别权限检查
   - 用户数据隔离

4. **数据验证**
   - 输入验证
   - 错误消息隐藏敏感信息

## 依赖包

| 包名 | 版本 | 用途 |
|------|------|------|
| express | ^4.18.2 | Web 框架 |
| mongoose | ^8.0.0 | MongoDB ORM |
| bcrypt | ^5.1.1 | 密码加密 |
| jsonwebtoken | ^9.1.2 | JWT 管理 |
| cors | ^2.8.5 | 跨域请求 |
| dotenv | ^16.3.0 | 环境变量 |
| multer | ^1.4.5 | 文件上传 |
| openai | ^4.20.1 | DeepSeek API |
| uuid | ^9.0.1 | UUID 生成 |
| fs-extra | ^11.3.2 | 文件系统增强 |
| nodemon | ^3.0.0 | 开发自动重启 |

## 常用命令

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 开发模式（自动重启）
npm run dev

# 初始化数据库（创建默认用户）
npm run init-db

# 测试 API
npm run test-api

# 停止服务器
npm run stop
```

## 环境配置

```bash
# .env 文件示例
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai-website-generator
DEEPSEEK_API_KEY=your-key-here
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
```

## 部署注意事项

1. **数据库**
   - 使用 MongoDB Atlas（云服务）或自托管 MongoDB
   - 定期备份

2. **环境变量**
   - 生产环境使用强密钥
   - 不提交 `.env` 到版本控制

3. **安全头**
   - 添加 HTTPS
   - 配置安全的 CORS

4. **日志**
   - 启用日志系统
   - 监控错误和异常

5. **性能**
   - 数据库索引优化
   - 缓存策略

---

## 更新历史

- **v2.0.0** (2024-01): 完整的用户管理系统
- **v1.0.0** (2024): 基础网站生成功能
