const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * 生成 JWT token
 */
function generateToken(userId) {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
    );
}

/**
 * 验证 JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: '未提供认证token'
            });
        }
        
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'token无效或已过期'
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: '认证失败',
            details: error.message
        });
    }
}

/**
 * 可选的认证中间件（不强制登录）
 */
function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            if (decoded) {
                req.user = decoded;
            }
        }
        
        next();
    } catch (error) {
        next();
    }
}

/**
 * 管理员认证中间件
 */
function adminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: '未认证'
        });
    }
    
    // 这里应该检查用户角色，暂时放在注释中
    // 需要在 authMiddleware 后使用，并从数据库加载用户完整信息
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    optionalAuthMiddleware,
    adminMiddleware,
    JWT_SECRET,
    JWT_EXPIRE
};
