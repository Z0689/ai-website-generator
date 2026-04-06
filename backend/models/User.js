const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// 用户数据模型
const userSchema = new mongoose.Schema({
    // 基本信息
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-zA-Z0-9_-]+$/
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    
    // 用户信息
    nickname: {
        type: String,
        default: ''
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    
    // 角色和权限
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    
    // 账户状态
    isActive: {
        type: Boolean,
        default: true
    },
    
    // 时间戳
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    // 最后登录时间
    lastLogin: {
        type: Date,
        default: null
    }
});

// 保存前加密密码
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        this.updatedAt = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

// 比较密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 获取用户公开信息（不包含密码）
userSchema.methods.toPublic = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        nickname: this.nickname,
        avatar: this.avatar,
        bio: this.bio,
        role: this.role,
        isActive: this.isActive,
        createdAt: this.createdAt,
        lastLogin: this.lastLogin
    };
};

// 索引优化
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
