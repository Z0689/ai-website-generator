const mongoose = require('mongoose');

// 对话历史数据模型
const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // 对话基本信息
    title: {
        type: String,
        default: '未命名对话'
    },
    
    // 对话消息
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        // 如果是生成请求，记录对应的项目 ID
        projectId: {
            type: String,
            default: null
        }
    }],
    
    // 关联的项目
    associatedProjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    
    // 对话元数据
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    },
    
    // 标签和搜索
    tags: [String],
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    
    // 统计
    messageCount: {
        type: Number,
        default: 0
    },
    
    // 时间戳
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // 是否收藏
    isFavorite: {
        type: Boolean,
        default: false
    }
});

// 索引优化
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, isFavorite: 1 });
conversationSchema.index({ tags: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
