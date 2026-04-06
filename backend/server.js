require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据库配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-website-generator';

// 目录配置
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const PROJECTS_DIR = path.join(__dirname, '../projects');
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(PROJECTS_DIR);

// ============================================
// 数据库连接
// ============================================
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB 连接成功');
    } catch (error) {
        console.error('❌ MongoDB 连接失败:', error.message);
        console.warn('⚠️  将继续运行，但某些功能可能不可用');
    }
}

// ============================================
// 中间件配置
// ============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/projects', express.static(PROJECTS_DIR));

// ============================================
// 路由导入
// ============================================
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const conversationRoutes = require('./routes/conversations');

// ============================================
// API 路由挂载
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/conversations', conversationRoutes);

// ============================================
// 健康检查
// ============================================
app.get('/api/health', async (req, res) => {
    try {
        const mongoStatus = mongoose.connection.readyState === 1 ? '已连接' : '未连接';
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'AI Website Generator',
            database: mongoStatus,
            version: '2.0.0'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// ============================================
// 前端页面服务
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================
// 错误处理
// ============================================
// 404 处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.originalUrl
    });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
    console.error('未处理的错误:', error);
    
    // 处理 multer 错误
    if (error.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            error: '文件上传错误',
            message: error.message
        });
    }
    
    // 处理其他错误
    res.status(error.status || 500).json({
        success: false,
        error: '服务器内部错误',
        message: error.message
    });
});

// ============================================
// 服务器启动
// ============================================
async function startServer() {
    try {
        // 连接数据库
        await connectDB();
        
        // 启动服务器
        const server = app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════╗');
            console.log('║   🚀 AI 网站生成器 v2.0 服务器启动   ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('');
            console.log('📍 本地访问: http://localhost:' + PORT);
            console.log('📊 数据库: ' + MONGODB_URI);
            console.log('🔑 API密钥: ' + (process.env.DEEPSEEK_API_KEY ? '✓ 已配置' : '✗ 未配置'));
            console.log('🎯 JWT密钥: ' + (process.env.JWT_SECRET ? '✓ 已配置' : '✗ 使用默认值'));
            console.log('');
            console.log('📚 API 文档:');
            console.log('   - 认证: POST /api/auth/register, /api/auth/login');
            console.log('   - 用户: GET/PUT /api/users/me');
            console.log('   - 项目: GET/POST /api/projects');
            console.log('   - 健康: GET /api/health');
            console.log('');
        });
        
        // 优雅关闭处理
        process.on('SIGINT', () => {
            console.log('\n\n🛑 收到关闭信号，正在关闭服务器...');
            server.close(async () => {
                try {
                    await mongoose.connection.close();
                    console.log('✅ 数据库连接已关闭');
                } catch (error) {
                    console.error('关闭数据库连接失败:', error);
                }
                console.log('✅ 服务器已关闭');
                process.exit(0);
            });
        });
        
        process.on('SIGTERM', () => {
            console.log('\n\n🛑 收到终止信号，正在关闭服务器...');
            server.close(async () => {
                try {
                    await mongoose.connection.close();
                    console.log('✅ 数据库连接已关闭');
                } catch (error) {
                    console.error('关闭数据库连接失败:', error);
                }
                console.log('✅ 服务器已关闭');
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ 启动服务器失败:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
