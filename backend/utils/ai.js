const OpenAI = require('openai');

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
});

/**
 * 流式调用 DeepSeek API
 * 返回完整 HTML，通过回调函数传递流式数据块
 */
async function streamDeepSeekAPI(description, files = [], onChunk) {
    let fileContext = '';
    
    if (files.length > 0) {
        fileContext = '\n\n上传文件信息：';
        files.forEach((file, index) => {
            fileContext += `\n文件${index + 1}: ${file.originalname} (${file.mimetype})`;
        });
        fileContext += '\n请根据上传的文件内容和用户描述来生成网站。';
    }

    const prompt = `你是一位资深的 Web 前端开发专家，精通 HTML、CSS 和原生 JavaScript。

你的任务是根据用户提供的网站描述${files.length > 0 ? '和上传的文件' : ''}，生成一个完整、独立的单页面网站。

约束:
1. 技术栈: 只能使用 HTML、CSS 和原生 JavaScript。
2. 禁止外部依赖: 绝对不允许使用任何外部 CSS 框架、JS 库或字体库。
3. 独立文件: 所有代码必须内联在一个HTML文件中。
4. 响应式设计: 网站必须是响应式的。
5. 内容填充: 根据用户描述生成真实的内容，不要使用Lorem Ipsum。
6. 代码质量: 代码结构清晰，有适当注释。
7. 交互性: 根据描述实现相应的交互功能。
8. 安全性: 所有功能都是纯客户端的。

用户需求: ${description}${fileContext}

请直接输出完整的HTML代码，不要包含任何解释或markdown代码块标记：`;

    console.log('启动流式 DeepSeek API 调用...');
    
    let fullContent = '';
    
    try {
        const stream = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的Web前端开发助手，专门生成单页面网站代码。请严格按照用户要求生成完整、独立的HTML文件，根据用户描述创建真实的内容。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "deepseek-chat",
            temperature: 0.7,
            max_tokens: 8000,
            stream: true
        });

        // 流式处理响应
        for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                fullContent += content;
                
                // 调用回调函数传递数据块
                if (onChunk) {
                    onChunk({
                        type: 'chunk',
                        data: content,
                        progress: Math.min((fullContent.length / 4000) * 100, 99)
                    });
                }
            }
        }

        console.log('AI 流式响应完成，总长度:', fullContent.length);
        
        // 处理完整的 HTML
        const html = extractHTMLFromAIResponse(fullContent);
        
        if (onChunk) {
            onChunk({
                type: 'complete',
                data: html,
                progress: 100
            });
        }
        
        return html;

    } catch (error) {
        console.error('流式 API 调用失败:', error);
        if (onChunk) {
            onChunk({
                type: 'error',
                error: error.message
            });
        }
        throw error;
    }
}

/**
 * 非流式调用 DeepSeek API 生成 HTML（保持兼容性）
 */
async function callDeepSeekAPI(description, files = []) {
    let fileContext = '';
    
    if (files.length > 0) {
        fileContext = '\n\n上传文件信息：';
        files.forEach((file, index) => {
            fileContext += `\n文件${index + 1}: ${file.originalname} (${file.mimetype})`;
        });
        fileContext += '\n请根据上传的文件内容和用户描述来生成网站。';
    }

    const prompt = `你是一位资深的 Web 前端开发专家，精通 HTML、CSS 和原生 JavaScript。

你的任务是根据用户提供的网站描述${files.length > 0 ? '和上传的文件' : ''}，生成一个完整、独立的单页面网站。

约束:
1. 技术栈: 只能使用 HTML、CSS 和原生 JavaScript。
2. 禁止外部依赖: 绝对不允许使用任何外部 CSS 框架、JS 库或字体库。
3. 独立文件: 所有代码必须内联在一个HTML文件中。
4. 响应式设计: 网站必须是响应式的。
5. 内容填充: 根据用户描述生成真实的内容，不要使用Lorem Ipsum。
6. 代码质量: 代码结构清晰，有适当注释。
7. 交互性: 根据描述实现相应的交互功能。
8. 安全性: 所有功能都是纯客户端的。

用户需求: ${description}${fileContext}

请直接输出完整的HTML代码，不要包含任何解释或markdown代码块标记：`;

    console.log('调用DeepSeek API...');
    
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "你是一个专业的Web前端开发助手，专门生成单页面网站代码。请严格按照用户要求生成完整、独立的HTML文件，根据用户描述创建真实的内容。"
            },
            {
                role: "user",
                content: prompt
            }
        ],
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 8000,
        stream: false
    });

    console.log('AI响应接收完成');
    
    const aiResponse = completion.choices[0].message.content;
    
    return extractHTMLFromAIResponse(aiResponse);
}

/**
 * 从AI响应中提取HTML
 */
function extractHTMLFromAIResponse(aiResponse) {
    console.log('清理AI响应...');
    
    let html = aiResponse.trim();
    
    // 移除可能的markdown代码块标记
    html = html.replace(/```html\s*/g, '');
    html = html.replace(/```\s*/g, '');
    
    // 检查是否包含完整的HTML结构
    const hasDoctype = html.includes('<!DOCTYPE html>');
    const hasHtmlTag = html.includes('<html');
    
    console.log('HTML检查 - 包含DOCTYPE:', hasDoctype, '包含HTML标签:', hasHtmlTag);
    
    // 如果没有完整的HTML结构，包装它
    if (!hasDoctype || !hasHtmlTag) {
        console.log('包装不完整的HTML响应');
        html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>生成的网站</title>
    <style>
        /* 基础样式 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            line-height: 1.6;
            color: #333;
            background-color: #ffffff;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        ${html}
    </div>
</body>
</html>`;
    }
    
    console.log('最终HTML长度:', html.length);
    return html;
}

/**
 * 从描述中提取标题
 */
function extractTitleFromDescription(description) {
    const titleMatch = description.match(/(创建一个?|做一个?|生成一个?)([^，,。.\n]+?)(网站|页面|主页)/);
    if (titleMatch && titleMatch[2]) {
        return titleMatch[2].trim();
    }
    return '未命名项目';
}

module.exports = {
    callDeepSeekAPI,
    streamDeepSeekAPI,
    extractHTMLFromAIResponse,
    extractTitleFromDescription
};
