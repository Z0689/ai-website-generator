const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authMiddleware } = require('../middleware/auth');

/**
 * 注册API
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        
        // 验证输入
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: '用户名、邮箱和密码不能为空'
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: '两次输入的密码不一致'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: '密码长度至少为6位'
            });
        }
        
        // 检查用户名和邮箱是否已存在
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: existingUser.username === username ? '用户名已存在' : '邮箱已存在'
            });
        }
        
        // 创建新用户
        const newUser = new User({
            username,
            email,
            password,
            nickname: username
        });
        
        await newUser.save();
        
        // 生成token
        const token = generateToken(newUser._id.toString());
        
        res.status(201).json({
            success: true,
            message: '注册成功',
            token,
            user: newUser.toPublic()
        });
        
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            error: '注册失败',
            details: error.message
        });
    }
});

/**
 * 登录API
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: '用户名和密码不能为空'
            });
        }
        
        // 查找用户
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }
        
        // 检查用户是否被禁用
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: '账户已被禁用'
            });
        }
        
        // 验证密码
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }
        
        // 更新最后登录时间
        user.lastLogin = new Date();
        await user.save();
        
        // 生成token
        const token = generateToken(user._id.toString());
        
        res.json({
            success: true,
            message: '登录成功',
            token,
            user: user.toPublic()
        });
        
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            error: '登录失败',
            details: error.message
        });
    }
});

/**
 * 使用邮箱登录
 * POST /api/auth/login-email
 */
router.post('/login-email', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: '邮箱和密码不能为空'
            });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: '邮箱或密码错误'
            });
        }
        
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: '账户已被禁用'
            });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: '邮箱或密码错误'
            });
        }
        
        user.lastLogin = new Date();
        await user.save();
        
        const token = generateToken(user._id.toString());
        
        res.json({
            success: true,
            message: '登录成功',
            token,
            user: user.toPublic()
        });
        
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            error: '登录失败',
            details: error.message
        });
    }
});

/**
 * 验证token
 * POST /api/auth/verify
 */
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'token无效'
            });
        }
        
        res.json({
            success: true,
            user: user.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'token验证失败',
            details: error.message
        });
    }
});

module.exports = router;
