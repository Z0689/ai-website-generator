const mongoose = require('mongoose');

// 项目数据模型
const projectSchema = new mongoose.Schema({
    // 项目基本信息
    id: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        default: '未命名项目'
    },
    description: {
        type: String,
        required: true
    },
    html: {
        type: String,
        required: true
    },
    
    // 关联文件
    files: [{
        originalName: String,
        filename: String,
        path: String,
        size: Number,
        mimetype: String
    }],
    
    // 元数据
    isPublic: {
        type: Boolean,
        default: false
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    tags: [String],
    
    // 时间戳
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 索引
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ id: 1 });
projectSchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
