/**
 * 流式生成管理器 - 处理实时流式网站生成和进度更新
 */

class StreamingGenerator {
    constructor(apiBaseUrl = '/api') {
        this.apiBaseUrl = apiBaseUrl;
        this.currentStream = null;
        this.isGenerating = false;
        this.generatedHTML = '';
    }

    /**
     * 生成网站流式输出
     * @param {string} description - 网站描述
     * @param {File[]} files - 上传的文件数组
     * @param {string} conversationId - 可选的对话ID
     * @param {Object} callbacks - 回调函数对象
     *   - onProgress: (progress: number) => void
     *   - onChunk: (chunk: string) => void
     *   - onComplete: (result: Object) => void
     *   - onError: (error: string) => void
     */
    async generateStream(description, files = [], conversationId = null, callbacks = {}) {
        if (this.isGenerating) {
            throw new Error('已有生成任务在进行中');
        }

        this.isGenerating = true;
        this.generatedHTML = '';

        try {
            // 准备表单数据
            const formData = new FormData();
            formData.append('description', description);
            if (conversationId) {
                formData.append('conversationId', conversationId);
            }

            // 添加文件
            files.forEach((file, index) => {
                formData.append(`files`, file);
            });

            // 发起 SSE 连接（使用 window.fetch 保持对 stream 的访问）
            const token = AuthManager.getToken();
            let response = await window.fetch(`${this.apiBaseUrl}/projects/generate-stream`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            // 如果未授权，尝试刷新 token 一次
            if (response.status === 401) {
                const refreshed = await AuthManager.tryRefresh();
                if (refreshed) {
                    const newToken = AuthManager.getToken();
                    response = await window.fetch(`${this.apiBaseUrl}/projects/generate-stream`, {
                        method: 'POST',
                        headers: newToken ? { 'Authorization': `Bearer ${newToken}` } : {},
                        body: formData
                    });
                }
            }

            if (!response.ok) {
                throw new Error(`生成请求失败: ${response.statusText}`);
            }

            // 处理 SSE 流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            this.currentStream = { reader, decoder };

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // 保留最后一行在缓冲区（可能不完整）
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            this._handleStreamEvent(data, callbacks);
                        } catch (e) {
                            console.error('解析 SSE 数据失败:', e);
                        }
                    }
                }
            }

            this.isGenerating = false;
            this.currentStream = null;

        } catch (error) {
            console.error('流式生成错误:', error);
            this.isGenerating = false;
            this.currentStream = null;

            if (callbacks.onError) {
                callbacks.onError(error.message);
            }

            throw error;
        }
    }

    /**
     * 处理 SSE 事件
     */
    _handleStreamEvent(data, callbacks) {
        switch (data.type) {
            case 'progress':
                if (callbacks.onProgress) {
                    callbacks.onProgress(data.progress);
                }
                console.log(`生成进度: ${data.progress}% (${data.currentSize} 字节)`);
                break;

            case 'chunk':
                this.generatedHTML += data.data;
                if (callbacks.onChunk) {
                    callbacks.onChunk(data.data, this.generatedHTML);
                }
                break;

            case 'complete':
                this.isGenerating = false;
                if (callbacks.onComplete) {
                    callbacks.onComplete({
                        success: true,
                        html: this.generatedHTML,
                        project: data.project,
                        totalSize: data.totalSize
                    });
                }
                console.log('生成完成:', data);
                break;

            case 'error':
                this.isGenerating = false;
                if (callbacks.onError) {
                    callbacks.onError(data.error || data.details || '未知错误');
                }
                console.error('生成错误:', data);
                break;

            default:
                console.log('未知事件类型:', data.type);
        }
    }

    /**
     * 取消当前生成任务
     */
    cancel() {
        if (this.currentStream) {
            this.currentStream.reader.cancel();
            this.currentStream = null;
            this.isGenerating = false;
            console.log('已取消生成任务');
        }
    }

    /**
     * 获取当前生成的 HTML
     */
    getGeneratedHTML() {
        return this.generatedHTML;
    }

    /**
     * 检查是否正在生成
     */
    isCurrentlyGenerating() {
        return this.isGenerating;
    }
}

// 导出实例
const streamingGenerator = new StreamingGenerator();
