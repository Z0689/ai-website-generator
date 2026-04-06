/**
 * 对话管理器 - 处理对话历史的保存、加载、搜索
 */

class ConversationManager {
    constructor(apiBaseUrl = '/api') {
        this.apiBaseUrl = apiBaseUrl;
        this.currentConversation = null;
        this.conversations = [];
        this.currentUser = null;
    }

    /**
     * 创建新对话
     */
    async createConversation(title, initialMessage = null) {
        try {
            const data = await apiClient.post('/conversations', {
                title: title || '新对话',
                initialMessage: initialMessage
            });
            this.currentConversation = data.conversation;
            return data.conversation;
        } catch (error) {
            console.error('创建对话出错:', error);
            throw error;
        }
    }

    /**
     * 获取对话列表
     */
    async listConversations(page = 1, limit = 20, searchQuery = '', filters = {}) {
        try {
            const params = new URLSearchParams({
                page,
                limit,
                ...(searchQuery && { search: searchQuery }),
                ...(filters.tags && { tags: filters.tags }),
                ...(filters.isFavorite && { isFavorite: true }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate })
            });

            const data = await apiClient.get(`/conversations?${params}`);
            this.conversations = data.conversations;
            return data;
        } catch (error) {
            console.error('获取对话列表出错:', error);
            throw error;
        }
    }

    /**
     * 获取单个对话
     */
    async getConversation(conversationId) {
        try {
            const data = await apiClient.get(`/conversations/${conversationId}`);
            this.currentConversation = data.conversation;
            return data.conversation;
        } catch (error) {
            console.error('获取对话出错:', error);
            throw error;
        }
    }

    /**
     * 添加消息到对话
     */
    async addMessage(conversationId, role, content, projectId = null) {
        try {
            const data = await apiClient.post(`/conversations/${conversationId}/messages`, {
                role,
                content,
                projectId
            });
            return data.conversation;
        } catch (error) {
            console.error('添加消息出错:', error);
            throw error;
        }
    }

    /**
     * 更新对话元数据
     */
    async updateConversation(conversationId, updates) {
        try {
            const data = await apiClient.put(`/conversations/${conversationId}`, updates);
            return data.conversation;
        } catch (error) {
            console.error('更新对话出错:', error);
            throw error;
        }
    }

    /**
     * 删除对话
     */
    async deleteConversation(conversationId, hardDelete = false) {
        try {
            return await apiClient.del(`/conversations/${conversationId}?hardDelete=${hardDelete}`);
        } catch (error) {
            console.error('删除对话出错:', error);
            throw error;
        }
    }

    /**
     * 导出对话为 JSON
     */
    async exportConversation(conversationId) {
        try {
            // apiClient returns JSON/text; use window.fetch to get blob (keep Authorization)
            const token = AuthManager.getToken();
            const resp = await window.fetch(`/api/conversations/${conversationId}/export/json`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (!resp.ok) throw new Error('导出对话失败');
            return await resp.blob();
        } catch (error) {
            console.error('导出对话出错:', error);
            throw error;
        }
    }

    /**
     * 从对话的某个点继续
     */
    async continueFromConversation(conversationId, messageIndex) {
        try {
            const data = await apiClient.post(`/conversations/${conversationId}/continue`, { fromMessageIndex: messageIndex });
            return data.conversation;
        } catch (error) {
            console.error('继续对话出错:', error);
            throw error;
        }
    }

    /**
     * 高级搜索对话
     */
    async advancedSearch(query, filters = {}) {
        try {
            const params = new URLSearchParams({
                q: query,
                ...(filters.tags && { tags: filters.tags.join(',') }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
                ...(filters.status && { status: filters.status })
            });

            const data = await apiClient.get(`/conversations/search/advanced?${params}`);
            return data;
        } catch (error) {
            console.error('搜索出错:', error);
            throw error;
        }
    }

    /**
     * 切换收藏状态
     */
    async toggleFavorite(conversationId) {
        try {
            const conversation = await this.getConversation(conversationId);
            return this.updateConversation(conversationId, {
                isFavorite: !conversation.isFavorite
            });
        } catch (error) {
            console.error('切换收藏出错:', error);
            throw error;
        }
    }

    /**
     * 添加标签
     */
    async addTags(conversationId, tags) {
        try {
            const conversation = await this.getConversation(conversationId);
            const newTags = [...new Set([...conversation.tags, ...tags])];
            return this.updateConversation(conversationId, {
                tags: newTags
            });
        } catch (error) {
            console.error('添加标签出错:', error);
            throw error;
        }
    }
}

// 导出管理器实例
const conversationManager = new ConversationManager();
