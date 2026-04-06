const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const Project = require('../models/Project');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { callDeepSeekAPI, streamDeepSeekAPI, extractTitleFromDescription } = require('../utils/ai');

// 配置文件上传
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const PROJECTS_DIR = path.join(__dirname, '../../projects');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'), false);
        }
    }
});

/**
 * 生成网站（需要登录）
 * POST /api/projects/generate
 */
router.post('/generate', authMiddleware, upload.array('files', 5), async (req, res) => {
    try {
        const { description } = req.body;
        const files = req.files || [];
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: '网站描述不能为空'
            });
        }
        
        console.log('收到生成请求:', description.substring(0, 100) + '...');
        console.log('上传文件数量:', files.length);
        
        // 调用 DeepSeek API
        const generatedHTML = await callDeepSeekAPI(description, files);
        
        // 创建项目
        const projectId = uuidv4();
        const project = new Project({
            id: projectId,
            userId: req.user.userId,
            title: extractTitleFromDescription(description),
            description: description,
            html: generatedHTML,
            files: files.map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype
            }))
        });
        
        await project.save();
        
        // 保存 HTML 文件
        const htmlFilePath = path.join(PROJECTS_DIR, `${projectId}.html`);
        fs.writeFileSync(htmlFilePath, generatedHTML);
        
        res.status(201).json({
            success: true,
            message: '网站生成成功',
            html: generatedHTML,
            project: {
                id: project._id,
                ...project.toObject()
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('生成失败:', error);
        res.status(500).json({
            success: false,
            error: '生成失败，请重试',
            details: error.message
        });
    }
});

/**
 * 获取当前用户的所有项目
 * GET /api/projects
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const projects = await Project.find({ userId: req.user.userId })
            .skip(skip)
            .limit(parseInt(limit))
            .sort(sort)
            .lean();
        
        const total = await Project.countDocuments({ userId: req.user.userId });
        
        res.json({
            success: true,
            projects,
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
            error: '获取项目列表失败',
            details: error.message
        });
    }
});

/**
 * 获取单个项目
 * GET /api/projects/:projectId
 */
router.get('/:projectId', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            userId: req.user.userId
        });
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: '项目不存在'
            });
        }
        
        res.json({
            success: true,
            project
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取项目失败',
            details: error.message
        });
    }
});

/**
 * 获取公开项目
 * GET /api/projects/public/:projectId
 */
router.get('/public/:projectId', optionalAuthMiddleware, async (req, res) => {
    try {
        const project = await Project.findOne({
            id: req.params.projectId,
            isPublic: true
        }).populate('userId', 'username nickname avatar');
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: '项目不存在或不公开'
            });
        }
        
        res.json({
            success: true,
            project
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取项目失败',
            details: error.message
        });
    }
});

/**
 * 更新项目
 * PUT /api/projects/:projectId
 */
router.put('/:projectId', authMiddleware, async (req, res) => {
    try {
        const { title, description, html, isPublic, tags } = req.body;
        
        const project = await Project.findOne({
            _id: req.params.projectId,
            userId: req.user.userId
        });
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: '项目不存在'
            });
        }
        
        // 如果提供了新的描述，重新生成
        let updatedHTML = html || project.html || '';
        if (description && description !== project.description) {
            updatedHTML = await callDeepSeekAPI(description, project.files);
        }
        
        // 更新项目
        if (title !== undefined) project.title = title;
        if (description !== undefined) project.description = description;
        if (html !== undefined || (description && description !== project.description)) {
            project.html = updatedHTML;
        }
        if (isPublic !== undefined) project.isPublic = isPublic;
        if (tags !== undefined) project.tags = tags;
        
        project.updatedAt = new Date();
        await project.save();
        
        // 更新 HTML 文件
        if (updatedHTML) {
            const htmlFilePath = path.join(PROJECTS_DIR, `${project.id}.html`);
            fs.writeFileSync(htmlFilePath, updatedHTML);
        }
        
        res.json({
            success: true,
            message: '项目更新成功',
            project
        });
        
    } catch (error) {
        console.error('更新失败:', error);
        res.status(500).json({
            success: false,
            error: '更新失败',
            details: error.message
        });
    }
});

/**
 * 流式生成网站（支持实时进度和中断）
 * POST /api/projects/generate-stream
 * Body: { description: string, conversationId?: string, files?: [] }
 */
router.post('/generate-stream', authMiddleware, upload.array('files', 5), async (req, res) => {
    try {
        const { description, conversationId } = req.body;
        const files = req.files || [];
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: '网站描述不能为空'
            });
        }
        
        console.log('收到流式生成请求:', description.substring(0, 100) + '...');
        
        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        const projectId = uuidv4();
        let generatedHTML = '';
        let lastChunkSize = 0;
        let isCancelled = false;
        
        // 检查客户端中断
        req.on('close', () => {
            isCancelled = true;
            console.log('客户端中断流式生成');
        });
        
        try {
            // 流式调用 AI API
            await streamDeepSeekAPI(description, files, async (progress) => {
                if (isCancelled) return;
                
                if (progress.type === 'chunk') {
                    generatedHTML += progress.data;
                    
                    // 每累积100个字符发送一次进度
                    if (generatedHTML.length - lastChunkSize >= 100) {
                        lastChunkSize = generatedHTML.length;
                        
                        res.write(`data: ${JSON.stringify({
                            type: 'progress',
                            progress: Math.min(progress.progress, 99),
                            currentSize: generatedHTML.length,
                            timestamp: new Date().toISOString()
                        })}\n\n`);
                    }
                }
            });
            
            if (isCancelled) {
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    error: '生成已被中断'
                })}\n\n`);
                res.end();
                return;
            }
            
            // 创建项目
            const project = new Project({
                id: projectId,
                userId: req.user.userId,
                title: extractTitleFromDescription(description),
                description: description,
                html: generatedHTML,
                files: files.map(file => ({
                    originalName: file.originalname,
                    filename: file.filename,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype
                }))
            });
            
            await project.save();
            
            // 保存 HTML 文件
            const htmlFilePath = path.join(PROJECTS_DIR, `${projectId}.html`);
            fs.writeFileSync(htmlFilePath, generatedHTML);
            
            // 如果提供了 conversationId，添加此项目到对话
            if (conversationId) {
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    userId: req.user.userId
                });
                
                if (conversation) {
                    // 添加生成结果消息
                    conversation.messages.push({
                        role: 'assistant',
                        content: `生成了新项目: ${project.title}`,
                        timestamp: new Date(),
                        projectId: project._id
                    });
                    
                    // 关联项目
                    if (!conversation.associatedProjects.includes(project._id)) {
                        conversation.associatedProjects.push(project._id);
                    }
                    
                    await conversation.save();
                }
            }
            
            // 发送完成事件
            res.write(`data: ${JSON.stringify({
                type: 'complete',
                success: true,
                message: '网站生成成功',
                html: generatedHTML.substring(0, 1000) + '...',
                project: {
                    id: project._id,
                    title: project.title,
                    description: project.description,
                    createdAt: project.createdAt
                },
                totalSize: generatedHTML.length,
                timestamp: new Date().toISOString()
            })}\n\n`);
            
            res.end();
            
        } catch (error) {
            console.error('流式生成失败:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: '生成失败',
                details: error.message
            })}\n\n`);
            res.end();
        }
        
    } catch (error) {
        console.error('流式生成端点错误:', error);
        res.status(500).json({
            success: false,
            error: '请求处理失败',
            details: error.message
        });
    }
});

/**
 * 删除项目
 * DELETE /api/projects/:projectId
 */
router.delete('/:projectId', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            userId: req.user.userId
        });
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: '项目不存在'
            });
        }
        
        // 删除相关文件
        project.files.forEach(file => {
            try {
                fs.unlinkSync(file.path);
            } catch (error) {
                console.error('删除文件失败:', error);
            }
        });
        
        // 删除 HTML 文件
        try {
            const htmlFilePath = path.join(PROJECTS_DIR, `${project.id}.html`);
            fs.unlinkSync(htmlFilePath);
        } catch (error) {
            console.error('删除HTML文件失败:', error);
        }
        
        // 从数据库删除
        await Project.deleteOne({ _id: project._id });
        
        res.json({
            success: true,
            message: '项目删除成功'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '删除项目失败',
            details: error.message
        });
    }
});

/**
 * 设置项目公开状态
 * POST /api/projects/:projectId/toggle-public
 */
router.post('/:projectId/toggle-public', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            userId: req.user.userId
        });
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: '项目不存在'
            });
        }
        
        project.isPublic = !project.isPublic;
        await project.save();
        
        res.json({
            success: true,
            message: project.isPublic ? '项目已设为公开' : '项目已设为私密',
            project
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '操作失败',
            details: error.message
        });
    }
});

module.exports = router;
