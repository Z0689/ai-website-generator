const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Project = require('../models/Project');
const { authMiddleware } = require('../middleware/auth');

/**
 * 创建新对话
 * POST /api/conversations
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, initialMessage } = req.body;
        
        const conversation = new Conversation({
            userId: req.user.userId,
            title: title || '新对话',
            description: description || '',
            messages: initialMessage ? [{
                role: 'user',
                content: initialMessage,
                timestamp: new Date()
            }] : [],
            messageCount: initialMessage ? 1 : 0
        });
        
        await conversation.save();
        
        res.status(201).json({
            success: true,
            message: '对话创建成功',
            conversation
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '创建对话失败',
            details: error.message
        });
    }
});

/**
 * 获取对话列表
 * GET /api/conversations?page=1&limit=20&search=&sort=-updatedAt
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', sort = '-updatedAt', isFavorite } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let query = { userId: req.user.userId, status: { $ne: 'deleted' } };
        
        // 搜索
        if (search) {
            query.$or = [
                { title: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { tags: search }
            ];
        }
        
        // 收藏过滤
        if (isFavorite === 'true') {
            query.isFavorite = true;
        }
        
        const conversations = await Conversation.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort(sort)
            .select('-messages')
            .lean();
        
        const total = await Conversation.countDocuments(query);
        
        res.json({
            success: true,
            conversations,
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
            error: '获取对话列表失败',
            details: error.message
        });
    }
});

/**
 * 获取单个对话
 * GET /api/conversations/:conversationId
 */
router.get('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId: req.user.userId
        }).populate('associatedProjects', 'title id');
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: '对话不存在'
            });
        }
        
        res.json({
            success: true,
            conversation
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取对话失败',
            details: error.message
        });
    }
});

/**
 * 更新对话信息（标题、描述、标签等）
 * PUT /api/conversations/:conversationId
 */
router.put('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { title, description, tags, isFavorite } = req.body;
        
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: '对话不存在'
            });
        }
        
        if (title !== undefined) conversation.title = title;
        if (description !== undefined) conversation.description = description;
        if (tags !== undefined) conversation.tags = tags;
        if (isFavorite !== undefined) conversation.isFavorite = isFavorite;
        
        conversation.updatedAt = new Date();
        await conversation.save();
        
        res.json({
            success: true,
            message: '对话更新成功',
            conversation
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '更新对话失败',
            details: error.message
        });
    }
});

/**
 * 添加消息到对话
 * POST /api/conversations/:conversationId/messages
 */
router.post('/:conversationId/messages', authMiddleware, async (req, res) => {
    try {
        const { role, content, projectId } = req.body;
        
        if (!role || !content) {
            return res.status(400).json({
                success: false,
                error: '消息角色和内容不能为空'
            });
        }
        
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: '对话不存在'
            });
        }
        
        // 添加消息
        conversation.messages.push({
            role,
            content,
            timestamp: new Date(),
            projectId
        });
        
        conversation.messageCount = conversation.messages.length;
        conversation.updatedAt = new Date();
        
        // 如果是项目，关联到项目
        if (projectId && role === 'assistant') {
            if (!conversation.associatedProjects.includes(projectId)) {
                conversation.associatedProjects.push(projectId);
            }
        }
        
        await conversation.save();
        
        res.json({
            success: true,
            message: '消息添加成功',
            conversation
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '添加消息失败',
            details: error.message
        });
    }
});

/**
 * 删除对话
 * DELETE /api/conversations/:conversationId
 */
router.delete('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { soft = true } = req.query;
        
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: '对话不存在'
            });
        }
        
        if (soft === 'true') {
            // 软删除
            conversation.status = 'deleted';
            await conversation.save();
        } else {
            // 硬删除
            await Conversation.deleteOne({ _id: req.params.conversationId });
        }
        
        res.json({
            success: true,
            message: '对话删除成功'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '删除对话失败',
            details: error.message
        });
    }
});

/**
 * 导出对话为 JSON
 * GET /api/conversations/:conversationId/export/json
 */
router.get('/:conversationId/export/json', authMiddleware, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: '对话不存在'
            });
        }
        
        const exportData = {
            title: conversation.title,
            description: conversation.description,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messages: conversation.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversation._id}.json"`);
        res.json(exportData);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '导出失败',
            details: error.message
        });
    }
});

/**
 * 继续对话（从指定消息继续）
 * POST /api/conversations/:conversationId/continue
 */
router.post('/:conversationId/continue', authMiddleware, async (req, res) => {
    try {
        const { messageIndex } = req.body;
        
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: '对话不存在'
            });
        }
        
        // 截断消息列表到指定位置
        if (messageIndex !== undefined && messageIndex >= 0) {
            conversation.messages = conversation.messages.slice(0, messageIndex + 1);
            conversation.messageCount = conversation.messages.length;
        }
        
        conversation.updatedAt = new Date();
        await conversation.save();
        
        res.json({
            success: true,
            message: '已从该点继续对话',
            conversation
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '操作失败',
            details: error.message
        });
    }
});

/**
 * 搜索对话（高级搜索）
 * GET /api/conversations/search?q=keyword&tags=tag1,tag2&dateFrom=&dateTo=
 */
router.get('/search/advanced', authMiddleware, async (req, res) => {
    try {
        const { q, tags, dateFrom, dateTo } = req.query;
        
        let query = { userId: req.user.userId, status: { $ne: 'deleted' } };
        
        // 文本搜索
        if (q) {
            query.$or = [
                { title: new RegExp(q, 'i') },
                { description: new RegExp(q, 'i') },
                { 'messages.content': new RegExp(q, 'i') }
            ];
        }
        
        // 标签过滤
        if (tags) {
            const tagArray = tags.split(',').map(t => t.trim());
            query.tags = { $in: tagArray };
        }
        
        // 日期范围
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }
        
        const conversations = await Conversation.find(query)
            .select('-messages')
            .sort({ updatedAt: -1 });
        
        res.json({
            success: true,
            results: conversations,
            count: conversations.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '搜索失败',
            details: error.message
        });
    }
});

module.exports = router;
