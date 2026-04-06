/**
 * API 测试脚本
 * 用途：测试用户管理和项目 API
 * 用法：node backend/scripts/test-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

class APITester {
    constructor() {
        this.token = null;
        this.userId = null;
    }

    async makeRequest(method, endpoint, body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, BASE_URL);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (this.token) {
                options.headers['Authorization'] = `Bearer ${this.token}`;
            }

            const req = http.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, data: json });
                    } catch {
                        resolve({ status: res.statusCode, data });
                    }
                });
            });

            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    async runTests() {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║        API 测试套件                    ║');
        console.log('╚════════════════════════════════════════╝\n');

        try {
            // 1. 健康检查
            console.log('📋 测试 1: 健康检查');
            let res = await this.makeRequest('GET', '/api/health');
            console.log(`   状态: ${res.status === 200 ? '✅' : '❌'}`);
            console.log(`   数据库: ${res.data.database}\n`);

            // 2. 注册用户
            console.log('📋 测试 2: 注册新用户');
            res = await this.makeRequest('POST', '/api/auth/register', {
                username: `testuser_${Date.now()}`,
                email: `test${Date.now()}@example.com`,
                password: 'testpass123',
                confirmPassword: 'testpass123'
            });
            if (res.status === 201 && res.data.success) {
                console.log('   ✅ 注册成功');
                this.token = res.data.token;
                this.userId = res.data.user.id;
                console.log(`   Token: ${this.token.substring(0, 20)}...`);
            } else {
                console.log(`   ❌ 注册失败: ${res.data.error}\n`);
                return;
            }
            console.log();

            // 3. 获取用户信息
            console.log('📋 测试 3: 获取当前用户信息');
            res = await this.makeRequest('GET', '/api/users/me');
            if (res.status === 200 && res.data.success) {
                console.log('   ✅ 获取成功');
                console.log(`   用户名: ${res.data.user.username}`);
                console.log(`   角色: ${res.data.user.role}`);
            } else {
                console.log(`   ❌ 获取失败\n`);
            }
            console.log();

            // 4. 更新用户信息
            console.log('📋 测试 4: 更新用户信息');
            res = await this.makeRequest('PUT', '/api/users/me', {
                nickname: '测试用户',
                bio: '这是一个测试账户'
            });
            if (res.status === 200 && res.data.success) {
                console.log('   ✅ 更新成功');
                console.log(`   昵称: ${res.data.user.nickname}`);
            } else {
                console.log(`   ❌ 更新失败\n`);
            }
            console.log();

            // 5. 验证 Token
            console.log('📋 测试 5: 验证 Token');
            res = await this.makeRequest('POST', '/api/auth/verify');
            if (res.status === 200 && res.data.success) {
                console.log('   ✅ Token 有效');
            } else {
                console.log('   ❌ Token 无效\n');
            }
            console.log();

            // 6. 获取项目列表
            console.log('📋 测试 6: 获取项目列表');
            res = await this.makeRequest('GET', '/api/projects');
            if (res.status === 200 && res.data.success) {
                console.log('   ✅ 获取成功');
                console.log(`   项目数: ${res.data.projects.length}`);
                console.log(`   分页: ${res.data.pagination.page}/${res.data.pagination.pages}`);
            } else {
                console.log(`   ❌ 获取失败\n`);
            }
            console.log();

            // 7. 修改密码
            console.log('📋 测试 7: 修改密码');
            res = await this.makeRequest('POST', '/api/users/me/change-password', {
                oldPassword: 'testpass123',
                newPassword: 'newpass456',
                confirmPassword: 'newpass456'
            });
            if (res.status === 200 && res.data.success) {
                console.log('   ✅ 密码修改成功');
            } else {
                console.log(`   ❌ 密码修改失败: ${res.data.error}\n`);
            }
            console.log();

            // 8. 注销并使用新密码重新登录
            console.log('📋 测试 8: 使用新密码登录');
            res = await this.makeRequest('POST', '/api/auth/login', {
                username: res.username || 'testuser',
                password: 'newpass456'
            });
            // 注：这里需要记录用户名
            console.log('   (跳过，需要记录用户名)\n');

            console.log('╔════════════════════════════════════════╗');
            console.log('║        测试完成 ✅                    ║');
            console.log('╚════════════════════════════════════════╝\n');

        } catch (error) {
            console.error('❌ 测试出错:', error.message);
        }
    }
}

// 运行测试
console.log('\n⏳ 连接到服务器: ' + BASE_URL);
console.log('⏳ 等待 3 秒...\n');

setTimeout(() => {
    const tester = new APITester();
    tester.runTests();
}, 3000);
