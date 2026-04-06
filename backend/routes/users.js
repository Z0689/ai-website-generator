const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        res.json({
            success: true,
            user: user.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取用户信息失败',
            details: error.message
        });
    }
});

/**
 * 获取用户公开信息
 * GET /api/users/:userId
 */
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        res.json({
            success: true,
            user: user.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取用户信息失败',
            details: error.message
        });
    }
});

/**
 * 更新用户信息
 * PUT /api/users/me
 */
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const { nickname, bio, avatar } = req.body;
        
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        // 更新允许的字段
        if (nickname !== undefined) {
            user.nickname = nickname;
        }
        if (bio !== undefined) {
            user.bio = bio;
        }
        if (avatar !== undefined) {
            user.avatar = avatar;
        }
        
        user.updatedAt = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: '用户信息更新成功',
            user: user.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '更新用户信息失败',
            details: error.message
        });
    }
});

/**
 * 修改密码
 * POST /api/users/me/change-password
 */
router.post('/me/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: '旧密码、新密码和确认密码不能为空'
            });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: '两次输入的新密码不一致'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: '新密码长度至少为6位'
            });
        }
        
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        // 验证旧密码
        const isOldPasswordValid = await user.comparePassword(oldPassword);
        
        if (!isOldPasswordValid) {
            return res.status(401).json({
                success: false,
                error: '旧密码不正确'
            });
        }
        
        // 更新密码
        user.password = newPassword;
        await user.save();
        
        res.json({
            success: true,
            message: '密码修改成功'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '修改密码失败',
            details: error.message
        });
    }
});

/**
 * 列出所有用户（仅管理员）
 * GET /api/users
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: '只有管理员可以访问'
            });
        }
        
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const query = search ? {
            $or: [
                { username: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') }
            ]
        } : {};
        
        const users = await User.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-password')
            .sort({ createdAt: -1 });
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            users: users.map(u => u.toPublic()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取用户列表失败',
            details: error.message
        });
    }
});

/**
 * 禁用用户（仅管理员）
 * POST /api/users/:userId/disable
 */
router.post('/:userId/disable', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: '只有管理员可以执行此操作'
            });
        }
        
        const targetUser = await User.findById(req.params.userId);
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        targetUser.isActive = false;
        await targetUser.save();
        
        res.json({
            success: true,
            message: '用户已禁用',
            user: targetUser.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '禁用用户失败',
            details: error.message
        });
    }
});

/**
 * 启用用户（仅管理员）
 * POST /api/users/:userId/enable
 */
router.post('/:userId/enable', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: '只有管理员可以执行此操作'
            });
        }
        
        const targetUser = await User.findById(req.params.userId);
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        targetUser.isActive = true;
        await targetUser.save();
        
        res.json({
            success: true,
            message: '用户已启用',
            user: targetUser.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '启用用户失败',
            details: error.message
        });
    }
});

/**
 * 设置用户角色（仅管理员）
 * POST /api/users/:userId/set-role
 */
router.post('/:userId/set-role', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: '只有管理员可以执行此操作'
            });
        }
        
        const { role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: '无效的角色'
            });
        }
        
        const targetUser = await User.findById(req.params.userId);
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        targetUser.role = role;
        await targetUser.save();
        
        res.json({
            success: true,
            message: '用户角色已更新',
            user: targetUser.toPublic()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '设置用户角色失败',
            details: error.message
        });
    }
});

module.exports = router;
