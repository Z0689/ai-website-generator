/**
 * 数据库初始化脚本
 * 用途：创建初始管理员用户和演示数据
 * 用法：node backend/scripts/init-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-website-generator';

async function initializeDatabase() {
    try {
        // 连接数据库
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ 数据库连接成功');

        // 检查是否存在管理员
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (adminExists) {
            console.log('⚠️  管理员用户已存在:', adminExists.username);
            console.log('跳过初始化');
            await mongoose.connection.close();
            return;
        }

        // 创建默认管理员
        const admin = new User({
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123', // ⚠️ 强烈建议修改此密码
            nickname: '系统管理员',
            role: 'admin',
            isActive: true
        });

        await admin.save();
        console.log('✅ 管理员用户创建成功');
        console.log('   用户名: admin');
        console.log('   密码: admin123');
        console.log('   ⚠️  请立即修改密码！');

        // 创建演示普通用户
        const demoUser = new User({
            username: 'demo',
            email: 'demo@example.com',
            password: 'demo123',
            nickname: '演示用户',
            bio: '这是一个演示账户',
            role: 'user',
            isActive: true
        });

        await demoUser.save();
        console.log('✅ 演示用户创建成功');
        console.log('   用户名: demo');
        console.log('   密码: demo123');

        console.log('\n✅ 数据库初始化完成！');
        console.log('\n📝 下一步：');
        console.log('1. 修改管理员密码');
        console.log('2. 使用管理员账户登录');
        console.log('3. 邀请其他用户注册');

    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

// 运行初始化
initializeDatabase();
