// ============================================
// 全局变量和 DOM 元素
// ============================================
const DOM = {
    // 模式切换
    createMode: document.getElementById('createMode'),
    historyMode: document.getElementById('historyMode'),
    toggleViewBtn: document.getElementById('toggleViewBtn'),
    viewIcon: document.getElementById('viewIcon'),
    viewText: document.getElementById('viewText'),
    
    // 创建模式元素
    siteDescription: document.getElementById('siteDescription'),
    generateBtn: document.getElementById('generateBtn'),
    clearBtn: document.getElementById('clearBtn'),
    btnText: document.getElementById('btnText'),
    
    // 文件上传
    fileUpload: document.getElementById('fileUpload'),
    uploadArea: document.getElementById('uploadArea'),
    filePreview: document.getElementById('filePreview'),
    
    // 预览和代码
    previewContainer: document.getElementById('previewContainer'),
    codePreview: document.getElementById('codePreview'),
    previewTab: document.getElementById('previewTab'),
    codeTab: document.getElementById('codeTab'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    
    // 代码操作
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    
    // 历史模式
    projectSearch: document.getElementById('projectSearch'),
    projectsGrid: document.getElementById('projectsGrid'),
    
    // 模态框
    projectModal: document.getElementById('projectModal'),
    closeModal: document.getElementById('closeModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalDescription: document.getElementById('modalDescription'),
    modalCreatedAt: document.getElementById('modalCreatedAt'),
    modalUpdatedAt: document.getElementById('modalUpdatedAt'),
    regenerateBtn: document.getElementById('regenerateBtn'),
    viewProjectBtn: document.getElementById('viewProjectBtn'),
    deleteBtn: document.getElementById('deleteBtn')
};

let generatedHTML = '';
let currentProject = null;
let uploadedFiles = [];
let isHistoryView = false;

// ============================================
// 文件上传管理
// ============================================
const FileManager = {
    init() {
        this.initFileUpload();
        this.initDragAndDrop();
    },

    initFileUpload() {
        // 上传区域点击事件
        DOM.uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('.file-item')) {
                DOM.fileUpload.click();
            }
        });

        // 上传按钮点击事件
        DOM.uploadArea.querySelector('.upload-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            DOM.fileUpload.click();
        });

        DOM.fileUpload.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    },

    initDragAndDrop() {
        DOM.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            DOM.uploadArea.classList.add('dragover');
        });

        DOM.uploadArea.addEventListener('dragleave', () => {
            DOM.uploadArea.classList.remove('dragover');
        });

        DOM.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            DOM.uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    },

    handleFiles(files) {
        for (let file of files) {
            if (uploadedFiles.length >= 5) {
                UIController.showMessage('最多只能上传5个文件', 'error');
                break;
            }

            if (file.size > 10 * 1024 * 1024) {
                UIController.showMessage(`文件 ${file.name} 超过10MB限制`, 'error');
                continue;
            }

            uploadedFiles.push(file);
            this.renderFileItem(file);
        }
        DOM.fileUpload.value = '';
    },

    renderFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${file.name}</span>
            <button class="file-remove" data-filename="${file.name}">×</button>
        `;
        
        fileItem.querySelector('.file-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFile(file.name);
        });
        
        DOM.filePreview.appendChild(fileItem);
    },

    removeFile(filename) {
        uploadedFiles = uploadedFiles.filter(file => file.name !== filename);
        this.renderFileList();
    },

    renderFileList() {
        DOM.filePreview.innerHTML = '';
        uploadedFiles.forEach(file => this.renderFileItem(file));
    },

    clearFiles() {
        uploadedFiles = [];
        this.renderFileList();
    }
};

// ============================================
// 标签页管理
// ============================================
const TabManager = {
    init() {
        DOM.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
    },

    switchTab(tabName) {
        // 更新按钮状态
        DOM.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        if (tabName === 'code' && generatedHTML) {
            DOM.codePreview.textContent = generatedHTML;
        }
    }
};

// ============================================
// 项目管理
// ============================================
const ProjectManager = {
    async loadProjects() {
        try {
            document.dispatchEvent(new CustomEvent('ui:projects:loading'));
            const data = await apiClient.get('/api/projects');
            if (data && data.success) {
                this.renderProjects(data.projects);
            } else {
                this.renderProjects([]);
            }
        } catch (error) {
            console.error('加载项目失败:', error);
            UIController.showMessage('加载项目失败', 'error');
            this.renderProjects([]);
        } finally {
            document.dispatchEvent(new CustomEvent('ui:projects:loaded'));
        }
    },

    renderProjects(projects) {
        if (projects.length === 0) {
            DOM.projectsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <h3>暂无项目</h3>
                    <p>创建的网站将显示在这里</p>
                </div>
            `;
            return;
        }

        DOM.projectsGrid.innerHTML = projects.map(project => `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <div>
                        <div class="project-title">${this.escapeHtml(project.title)}</div>
                        <div class="project-date">${new Date(project.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="project-description">${this.escapeHtml(project.description)}</div>
                ${project.files && project.files.length > 0 ? `
                    <div style="margin-top: 0.75rem; font-size: 0.8rem; color: #64748b;">
                        📎 ${project.files.length} 个文件
                    </div>
                ` : ''}
            </div>
        `).join('');

        // 添加点击事件
        DOM.projectsGrid.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showProjectDetail(card.dataset.projectId);
            });
        });
    },

    async showProjectDetail(projectId) {
        try {
            const data = await apiClient.get(`/api/projects/${projectId}`);
            if (data && data.success) {
                currentProject = data.project;
                this.openProjectModal(data.project);
            } else {
                UIController.showMessage('项目不存在或无法加载', 'error');
            }
        } catch (error) {
            console.error('加载项目详情失败:', error);
            UIController.showMessage('加载项目详情失败', 'error');
        }
    },

    openProjectModal(project) {
        DOM.modalTitle.value = project.title || '';
        DOM.modalDescription.value = project.description || '';
        DOM.modalCreatedAt.textContent = new Date(project.createdAt).toLocaleString();
        DOM.modalUpdatedAt.textContent = new Date(project.updatedAt).toLocaleString();
        
        DOM.projectModal.style.display = 'block';
    },

    async deleteProject(projectId) {
        if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
            return;
        }

        try {
            const data = await apiClient.del(`/api/projects/${projectId}`);
            if (data && data.success) {
                UIController.showMessage('项目删除成功', 'success');
                DOM.projectModal.style.display = 'none';
                this.loadProjects();
                if (currentProject && currentProject.id === projectId) {
                    UIController.handleClear();
                }
            } else {
                UIController.showMessage('删除失败', 'error');
            }
        } catch (error) {
            console.error('删除项目失败:', error);
            UIController.showMessage('删除项目失败', 'error');
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ============================================
// UI 控制器模块
// ============================================
const UIController = {
    init() {
        this.initViewToggle();
        this.initButtons();
        this.initModal();
        this.initSearch();
        FileManager.init();
        TabManager.init();
        ProjectManager.loadProjects();
        
        // 初始化预览容器状态
        this.resetPreview();
    },

    initViewToggle() {
        DOM.toggleViewBtn.addEventListener('click', () => {
            this.toggleView();
        });
    },

    initButtons() {
        DOM.clearBtn.addEventListener('click', () => this.handleClear());
        DOM.generateBtn.addEventListener('click', () => this.handleGenerate());
        DOM.copyCodeBtn.addEventListener('click', () => this.handleCopyCode());
        DOM.downloadBtn.addEventListener('click', () => this.handleDownload());
    },

    initModal() {
        DOM.closeModal.addEventListener('click', () => {
            DOM.projectModal.style.display = 'none';
        });

        DOM.regenerateBtn.addEventListener('click', () => {
            this.handleRegenerate();
        });

        DOM.viewProjectBtn.addEventListener('click', () => {
            this.handleViewProject();
        });

        DOM.deleteBtn.addEventListener('click', () => {
            if (currentProject) {
                ProjectManager.deleteProject(currentProject.id);
            }
        });

        // 点击模态框外部关闭（通用）
        window.addEventListener('click', (e) => {
            const modals = ['projectModal', 'conversationModal', 'generatingModal', 'loginModal'];
            modals.forEach(id => {
                const el = document.getElementById(id);
                if (el && e.target === el) el.style.display = 'none';
            });
        });

        // ESC 键关闭所有模态框
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['projectModal','conversationModal','generatingModal','loginModal'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.style.display && el.style.display !== 'none') el.style.display = 'none';
                });
            }
        });

        // 登录模态关闭按钮
        const closeLogin = document.getElementById('closeLoginModal');
        if (closeLogin) closeLogin.addEventListener('click', () => document.getElementById('loginModal').style.display = 'none');
    },

    initSearch() {
        DOM.projectSearch.addEventListener('input', (e) => {
            this.filterProjects(e.target.value);
        });
    },

    toggleView() {
        isHistoryView = !isHistoryView;
        
        if (isHistoryView) {
            DOM.createMode.style.display = 'none';
            DOM.historyMode.style.display = 'block';
            DOM.viewIcon.textContent = '🚀';
            DOM.viewText.textContent = '创建网站';
            ProjectManager.loadProjects();
        } else {
            DOM.createMode.style.display = 'block';
            DOM.historyMode.style.display = 'none';
            DOM.viewIcon.textContent = '📚';
            DOM.viewText.textContent = '历史项目';
        }
    },

    filterProjects(searchTerm) {
        const projects = DOM.projectsGrid.querySelectorAll('.project-card');
        projects.forEach(project => {
            const title = project.querySelector('.project-title').textContent.toLowerCase();
            const description = project.querySelector('.project-description').textContent.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            if (title.includes(search) || description.includes(search)) {
                project.style.display = 'block';
            } else {
                project.style.display = 'none';
            }
        });
    },

    async handleGenerate() {
        const description = DOM.siteDescription.value.trim();
        if (!description) {
            this.showMessage('请输入网站描述！', 'error');
            return;
        }

        // 显示加载状态
        const originalText = DOM.btnText.innerHTML;
        DOM.btnText.innerHTML = '<span class="loading"></span>AI生成中...';
        DOM.generateBtn.disabled = true;

        try {
            // 使用流式生成以便实时展示进度
            StreamingUI.showProgress();
            streamingGenerator.generateStream(description, uploadedFiles, null, {
                onProgress: (p) => {
                    StreamingUI.updateProgress(p);
                    StreamingUI.addLog(`进度 ${p}%`);
                },
                onChunk: (chunk) => {
                    StreamingUI.addLog(chunk.slice(0, 120));
                },
                onComplete: async (result) => {
                    generatedHTML = result.html;
                    currentProject = result.project;
                    UIController.showMessage('网站生成成功！', 'success');
                    StreamingUI.hideProgress();
                    ProjectManager.loadProjects();
                    TabManager.switchTab('preview');
                    UIController.showPreview();
                },
                onError: (err) => {
                    StreamingUI.addLog('错误：' + err);
                    StreamingUI.hideProgress();
                    UIController.showMessage('生成失败: ' + err, 'error');
                }
            });
        } catch (error) {
            console.error('生成失败:', error);
            this.showMessage('生成失败: ' + error.message, 'error');
        } finally {
            DOM.btnText.innerHTML = originalText;
            DOM.generateBtn.disabled = false;
        }
    },

    handleClear() {
        DOM.siteDescription.value = '';
        FileManager.clearFiles();
        this.resetPreview();
        generatedHTML = '';
        currentProject = null;
    },

    resetPreview() {
        DOM.previewContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <h3>开始创建您的网站</h3>
                <p>在左侧输入网站描述，AI将为您生成完整的单页面网站</p>
            </div>
        `;
        DOM.codePreview.textContent = '';
        
        // 添加 empty 类，显示空状态
        DOM.previewContainer.classList.add('empty');
    },

    showPreview() {
        if (!generatedHTML) return;
        // 清空预览容器
        DOM.previewContainer.innerHTML = '';

        // 使用 DOM API 创建 iframe 并直接设置 srcdoc，避免把 HTML 转义后传入属性
        const iframe = document.createElement('iframe');
        iframe.className = 'preview-iframe';
        // 直接赋值 srcdoc，浏览器会正确解析生成的 HTML
        iframe.srcdoc = generatedHTML;
        // 允许页面内脚本运行和同源行为以支持交互（根据需求可收紧沙箱权限）
        iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups';

        DOM.previewContainer.appendChild(iframe);

        // 移除 empty 类，显示预览内容
        DOM.previewContainer.classList.remove('empty');
    },

    async handleCopyCode() {
        if (!generatedHTML) return;
        
        try {
            await navigator.clipboard.writeText(generatedHTML);
            this.showMessage('代码已复制到剪贴板！', 'success');
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = generatedHTML;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showMessage('代码已复制到剪贴板！', 'success');
        }
    },

    handleDownload() {
        if (!generatedHTML) return;
        
        const blob = new Blob([generatedHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentProject ? `${currentProject.title}.html` : 'website.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('文件下载成功！', 'success');
    },

    async handleRegenerate() {
        if (!currentProject) return;
        
        const newDescription = DOM.modalDescription.value;
        const newTitle = DOM.modalTitle.value;
        if (!newDescription) {
            this.showMessage('请输入新的网站描述', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/projects/${currentProject.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: newDescription,
                    title: newTitle
                })
            });

            const data = await response.json();

            if (data.success) {
                generatedHTML = data.project.html;
                currentProject = data.project;
                this.showPreview();
                this.showMessage('网站重新生成成功！', 'success');
                DOM.projectModal.style.display = 'none';
                ProjectManager.loadProjects();
            }
        } catch (error) {
            console.error('重新生成失败:', error);
            this.showMessage('重新生成失败: ' + error.message, 'error');
        }
    },

    handleViewProject() {
        if (!currentProject) return;
        // 如果项目在内存中包含 html，直接使用；否则尝试通过已保存的静态 HTML 路径加载
        const applyAndSwitch = () => {
            DOM.projectModal.style.display = 'none';
            // 切换回创建模式并切换到预览标签
            if (isHistoryView) this.toggleView();
            TabManager.switchTab('preview');
        };

        if (currentProject.html && currentProject.html.trim() !== '') {
            generatedHTML = currentProject.html;
            this.showPreview();
            applyAndSwitch();
        } else {
            const htmlUrl = `/projects/${currentProject.id}.html`;
            fetch(htmlUrl).then(r => {
                if (!r.ok) throw new Error('无法加载项目HTML文件');
                return r.text();
            }).then(text => {
                generatedHTML = text;
                this.showPreview();
                applyAndSwitch();
            }).catch(err => {
                console.error('加载项目HTML失败:', err);
                this.showMessage('加载项目HTML失败', 'error');
            });
        }
    },

    showMessage(message, type = 'info') {
        // 移除现有消息
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);

        // 3秒后自动移除
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ============================================
// 对话管理界面控制
// ============================================
const ConversationUI = {
    conversationModal: document.getElementById('conversationModal'),
    conversationList: document.getElementById('conversationList'),
    conversationMessages: document.getElementById('conversationMessages'),
    conversationTitle: document.getElementById('conversationTitle'),
    conversationSearch: document.getElementById('conversationSearch'),
    messageInput: document.getElementById('messageInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    currentConvId: null,

    init() {
        if (!this.conversationModal) return;

        // 对话按钮
        const conversationBtn = document.getElementById('conversationBtn');
        if (conversationBtn) {
            conversationBtn.addEventListener('click', () => this.openModal());
        }

        // 关闭按钮
        const closeBtn = document.getElementById('closeConversationModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // 模态框外部点击关闭
        this.conversationModal.addEventListener('click', (e) => {
            if (e.target === this.conversationModal) this.closeModal();
        });

        // 新建对话
        const newBtn = document.getElementById('newConversationBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.createNewConversation());
        }

        // 搜索对话
        this.conversationSearch?.addEventListener('input', (e) => {
            this.loadConversations(e.target.value);
        });

        // 发送消息
        this.sendMessageBtn?.addEventListener('click', () => this.sendMessage());
        this.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 其他操作按钮
        document.getElementById('toggleFavoriteBtn')?.addEventListener('click', () => this.toggleFavorite());
        document.getElementById('exportConversationBtn')?.addEventListener('click', () => this.exportConversation());
        document.getElementById('deleteConversationBtn')?.addEventListener('click', () => this.deleteConversation());

        // 初始加载对话列表
        this.loadConversations();
    },

    async openModal() {
        this.conversationModal.style.display = 'flex';
        await this.loadConversations();
    },

    closeModal() {
        this.conversationModal.style.display = 'none';
    },

    async createNewConversation() {
        const title = prompt('输入对话标题:') || `对话 ${new Date().toLocaleString()}`;
        try {
            const conversation = await conversationManager.createConversation(title);
            this.currentConvId = conversation._id;
            this.renderConversationDetail(conversation);
            await this.loadConversations();
        } catch (error) {
            UIController.showMessage('创建对话失败: ' + error.message, 'error');
        }
    },

    async loadConversations(searchQuery = '') {
        try {
            const data = await conversationManager.listConversations(1, 50, searchQuery);
            this.renderConversationList(data.conversations);
        } catch (error) {
            console.error('加载对话列表失败:', error);
        }
    },

    renderConversationList(conversations) {
        if (conversations.length === 0) {
            this.conversationList.innerHTML = '<div class="empty-state"><p>暂无对话记录</p></div>';
            return;
        }

        this.conversationList.innerHTML = conversations.map(conv => `
            <div class="conversation-item ${conv._id === this.currentConvId ? 'active' : ''}" data-id="${conv._id}">
                <div class="conversation-item-title">${conv.title}</div>
                <div class="conversation-item-time">${new Date(conv.createdAt).toLocaleString()}</div>
            </div>
        `).join('');

        this.conversationList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const conversation = await conversationManager.getConversation(id);
                this.renderConversationDetail(conversation);
            });
        });
    },

    renderConversationDetail(conversation) {
        this.currentConvId = conversation._id;
        this.conversationTitle.textContent = conversation.title;

        // 渲染消息
        this.conversationMessages.innerHTML = conversation.messages.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-badge">${msg.role === 'user' ? '👤' : '🤖'}</div>
                <div class="message-content">${this.escapeHTML(msg.content)}</div>
                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('');

        // 滚动到底部
        this.conversationMessages.scrollTop = this.conversationMessages.scrollHeight;

        // 清空输入框
        this.messageInput.value = '';
    },

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.currentConvId) return;

        try {
            const conversation = await conversationManager.addMessage(
                this.currentConvId,
                'user',
                content
            );

            this.renderConversationDetail(conversation);
            UIController.showMessage('消息已发送', 'success');
        } catch (error) {
            UIController.showMessage('发送消息失败: ' + error.message, 'error');
        }
    },

    async toggleFavorite() {
        if (!this.currentConvId) return;
        try {
            const conversation = await conversationManager.toggleFavorite(this.currentConvId);
            UIController.showMessage(conversation.isFavorite ? '已收藏' : '已取消收藏', 'success');
        } catch (error) {
            UIController.showMessage('操作失败: ' + error.message, 'error');
        }
    },

    async exportConversation() {
        if (!this.currentConvId) return;
        try {
            const blob = await conversationManager.exportConversation(this.currentConvId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation-${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UIController.showMessage('导出成功', 'success');
        } catch (error) {
            UIController.showMessage('导出失败: ' + error.message, 'error');
        }
    },

    async deleteConversation() {
        if (!this.currentConvId || !confirm('确定要删除此对话吗?')) return;
        try {
            await conversationManager.deleteConversation(this.currentConvId);
            this.currentConvId = null;
            await this.loadConversations();
            UIController.showMessage('对话已删除', 'success');
        } catch (error) {
            UIController.showMessage('删除失败: ' + error.message, 'error');
        }
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ============================================
// 流式生成界面控制
// ============================================
const StreamingUI = {
    generatingModal: document.getElementById('generatingModal'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    generatingLogs: document.getElementById('generatingLogs'),
    cancelBtn: document.getElementById('cancelGeneratingBtn'),

    init() {
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                streamingGenerator.cancel();
                this.hideProgress();
                UIController.showMessage('生成已取消', 'info');
            });
        }
    },

    showProgress() {
        if (this.generatingModal) {
            this.generatingModal.style.display = 'flex';
            this.clearLogs();
            this.updateProgress(0);
        }
    },

    hideProgress() {
        if (this.generatingModal) {
            this.generatingModal.style.display = 'none';
        }
    },

    updateProgress(percent) {
        if (this.progressFill) {
            this.progressFill.style.width = `${percent}%`;
            this.progressFill.textContent = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `${percent}%`;
        }
    },

    addLog(message) {
        if (this.generatingLogs) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `
                <span class="log-entry-time">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-entry-message">${this.escapeHTML(message)}</span>
            `;
            this.generatingLogs.appendChild(entry);
            this.generatingLogs.scrollTop = this.generatingLogs.scrollHeight;
        }
    },

    clearLogs() {
        if (this.generatingLogs) {
            this.generatingLogs.innerHTML = '';
        }
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ============================================
// 初始化应用
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        UIController.init();
        ConversationUI.init();
        StreamingUI.init();
    });
} else {
    UIController.init();
    ConversationUI.init();
    StreamingUI.init();
}