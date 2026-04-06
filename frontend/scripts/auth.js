class AuthManagerClass {
    constructor() {
        this.tokenKey = 'token';
        this.refreshKey = 'refreshToken';
        this.userKey = 'user';
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        this._listeners = [];
        this.initFromStorage();
    }

    initFromStorage() {
        // 优先从 sessionStorage 保持短期登录，否则 localStorage（记住我）
        const token = sessionStorage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey);
        const refresh = sessionStorage.getItem(this.refreshKey) || localStorage.getItem(this.refreshKey);
        const user = sessionStorage.getItem(this.userKey) || localStorage.getItem(this.userKey);

        if (token) this.token = token;
        if (refresh) this.refreshToken = refresh;
        if (user) this.user = JSON.parse(user);
    }

    isAuthenticated() {
        const t = this.getToken();
        if (!t) return false;
        return !this._isTokenExpired(t);
    }

    getToken() { return this.token; }

    getUser() { return this.user; }

    setAuth({ token, refreshToken = null, user = null, remember = false }) {
        this.token = token;
        if (refreshToken) this.refreshToken = refreshToken;
        if (user) this.user = user;

        if (remember) {
            localStorage.setItem(this.tokenKey, token);
            if (refreshToken) localStorage.setItem(this.refreshKey, refreshToken);
            if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
        } else {
            sessionStorage.setItem(this.tokenKey, token);
            if (refreshToken) sessionStorage.setItem(this.refreshKey, refreshToken);
            if (user) sessionStorage.setItem(this.userKey, JSON.stringify(user));
        }

        this._emitChange();
    }

    clearAuth() {
        this.token = null; this.refreshToken = null; this.user = null;
        localStorage.removeItem(this.tokenKey); localStorage.removeItem(this.refreshKey); localStorage.removeItem(this.userKey);
        sessionStorage.removeItem(this.tokenKey); sessionStorage.removeItem(this.refreshKey); sessionStorage.removeItem(this.userKey);
        this._emitChange();
    }

    onChange(cb) { this._listeners.push(cb); }
    _emitChange() { this._listeners.forEach(cb => cb({ token: this.token, user: this.user })); }

    // 简单解析 JWT 负载判断过期（不验证签名）
    _parseJwt(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (e) { return null; }
    }

    _isTokenExpired(token) {
        const payload = this._parseJwt(token);
        if (!payload || !payload.exp) return true;
        const now = Math.floor(Date.now() / 1000);
        return payload.exp <= now + 5; // 提前5秒判定为过期
    }

    async tryRefresh() {
        if (!this.refreshToken) return false;
        try {
            const resp = await window.fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            if (!resp.ok) return false;
            const data = await resp.json();
            if (data && data.token) {
                // 保持现有存储位置 — 假设 refresh 续期使用相同的存储
                // 判断是否在 localStorage 中存在 token
                const remember = !!localStorage.getItem(this.tokenKey);
                this.setAuth({ token: data.token, refreshToken: data.refreshToken || this.refreshToken, user: data.user || this.user, remember });
                return true;
            }
            return false;
        } catch (e) {
            console.error('刷新 token 失败:', e);
            return false;
        }
    }
}

const AuthManager = new AuthManagerClass();

// 公开事件：当 auth 过期时，触发 login modal
AuthManager.onChange(({ token, user }) => {
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: { token, user } }));
});

// 当 API 检测到过期广播 "api:auth:expired" 时，显示登录模态框
document.addEventListener('api:auth:expired', () => {
    // 这里触发展示登录模态
    const btn = document.getElementById('conversationBtn');
    // 简单触发显示登录框
    showLoginModal();
});

// 登录模态管理函数（在全局中定义，UI 部分会实现）
function showLoginModal() {
    const el = document.getElementById('loginModal');
    if (el) el.style.display = 'flex';
}

function hideLoginModal() {
    const el = document.getElementById('loginModal');
    if (el) el.style.display = 'none';
}
