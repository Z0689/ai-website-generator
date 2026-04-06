class APIClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.retryCount = 1;
        this.retryDelay = 800; // ms
    }

    async fetch(input, init = {}) {
        const url = input.startsWith('/') ? input : `${this.baseUrl}${input}`;
        const finalInit = Object.assign({}, init);

        finalInit.headers = finalInit.headers || {};

        // Attach JSON header by default when body present and no content-type
        if (finalInit.body && !(finalInit.body instanceof FormData)) {
            finalInit.headers['Content-Type'] = 'application/json';
        }

        // Attach Authorization header if token exists
        const token = AuthManager.getToken();
        if (token) {
            finalInit.headers['Authorization'] = `Bearer ${token}`;
        }

        // Emit global loading start
        document.dispatchEvent(new CustomEvent('api:loading:start', { detail: { url } }));

        try {
            let attempt = 0;
            while (true) {
                let resp = await window.fetch(url, finalInit);

                // handle 401 (token expired or invalid)
                if (resp.status === 401) {
                    // try refresh once
                    const refreshed = await AuthManager.tryRefresh();
                    if (refreshed) {
                        // update header and retry immediately
                        const newToken = AuthManager.getToken();
                        if (newToken) finalInit.headers['Authorization'] = `Bearer ${newToken}`;
                        attempt++;
                        if (attempt <= this.retryCount) continue; // retry once after refresh
                    }
                    // cannot refresh -> broadcast logout
                    AuthManager.clearAuth();
                    document.dispatchEvent(new CustomEvent('api:auth:expired', { detail: { url } }));
                    throw new Error('未授权或登录已过期');
                }

                // retry on 502/503/504 or network errors
                if ((resp.status >= 500 && resp.status < 600) && attempt < this.retryCount) {
                    attempt++;
                    await this._delay(this.retryDelay);
                    continue;
                }

                // Stop loading event
                document.dispatchEvent(new CustomEvent('api:loading:end', { detail: { url } }));

                // For non-JSON we return raw
                const contentType = resp.headers.get('content-type') || '';
                if (!resp.ok) {
                    let text = await resp.text();
                    let errMsg = text;
                    try { errMsg = JSON.parse(text); } catch (e) {}
                    const error = new Error(resp.statusText || '请求失败');
                    error.status = resp.status;
                    error.body = errMsg;
                    throw error;
                }

                if (contentType.includes('application/json')) {
                    return resp.json();
                } else {
                    return resp.text();
                }
            }

        } catch (error) {
            document.dispatchEvent(new CustomEvent('api:loading:end', { detail: { url } }));
            throw error;
        }
    }

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    get(path) { return this.fetch(path, { method: 'GET' }); }
    post(path, body, opts = {}) {
        const init = Object.assign({ method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }, opts);
        return this.fetch(path, init);
    }
    put(path, body) { return this.fetch(path, { method: 'PUT', body: JSON.stringify(body) }); }
    del(path) { return this.fetch(path, { method: 'DELETE' }); }
}

// 单例
const apiClient = new APIClient('/api');
