const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 启动简单的HTTP服务器
const distPath = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
    let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(8765, async () => {
    console.log('HTTP服务器启动: http://localhost:8765');
    
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=400,800'
        ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800 });
    
    // 捕获控制台错误
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            console.log('控制台错误:', msg.text());
        }
    });
    
    page.on('pageerror', err => {
        consoleErrors.push('PageError: ' + err.message);
        console.log('页面错误:', err.message);
    });
    
    try {
        console.log('打开游戏页面...');
        await page.goto('http://localhost:8765', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // 等待游戏加载
        await sleep(3000);
        console.log('游戏已加载，截图主菜单...');
        await page.screenshot({ path: 'test_1_menu.png' });
        
        // 直接用代码进入游戏场景，跳过菜单和角色选择
        console.log('直接进入游戏场景...');
        await page.evaluate(() => {
            if (window.game) {
                window.game.scene.start('GameScene');
                return '已进入游戏场景';
            }
            return '无法访问游戏实例';
        });
        
        await sleep(3000);
        console.log('游戏场景已加载，截图游戏画面...');
        await page.screenshot({ path: 'test_2_game.png' });
        
        // 直接调用游戏内部方法触发升级
        console.log('触发升级界面...');
        await page.evaluate(() => {
            if (window.game) {
                const scene = window.game.scene.getScene('GameScene');
                if (scene) {
                    scene.showLevelUp();
                    return '升级界面已触发';
                }
            }
            return '无法访问游戏场景';
        });
        
        // 连续监控5秒，确认升级界面稳定
        console.log('开始监控升级界面稳定性...');
        for (let i = 1; i <= 5; i++) {
            await sleep(1000);
            const state = await page.evaluate(() => {
                if (window.game) {
                    const scene = window.game.scene.getScene('GameScene');
                    if (scene) {
                        return {
                            gameState: scene.gameState,
                            childrenCount: scene.children ? scene.children.length : 0,
                            hitStop: scene.hitStop
                        };
                    }
                }
                return null;
            });
            console.log(`第${i}秒:`, JSON.stringify(state));
        }
        
        // 测试刷新技能按钮（点击3次）
        console.log('测试刷新技能按钮...');
        for (let i = 1; i <= 3; i++) {
            // 点击刷新按钮位置（右上角，大约 x=340, y=100）
            await page.mouse.click(340, 100);
            await sleep(500);
            const state = await page.evaluate(() => {
                if (window.game) {
                    const scene = window.game.scene.getScene('GameScene');
                    if (scene) {
                        return {
                            gameState: scene.gameState,
                            rerollCount: scene.rerollCount,
                            childrenCount: scene.children ? scene.children.length : 0
                        };
                    }
                }
                return null;
            });
            console.log(`刷新第${i}次后:`, JSON.stringify(state));
            await page.screenshot({ path: `test_reroll_${i}.png` });
        }
        
        // 再监控5秒，确认刷新后稳定
        console.log('刷新后监控稳定性...');
        for (let i = 1; i <= 5; i++) {
            await sleep(1000);
            const state = await page.evaluate(() => {
                if (window.game) {
                    const scene = window.game.scene.getScene('GameScene');
                    if (scene) {
                        return {
                            gameState: scene.gameState,
                            childrenCount: scene.children ? scene.children.length : 0
                        };
                    }
                }
                return null;
            });
            console.log(`刷新后第${i}秒:`, JSON.stringify(state));
        }
        
        await page.screenshot({ path: 'test_final.png' });
        
        // 检查游戏状态
        const gameState = await page.evaluate(() => {
            if (window.game) {
                const scene = window.game.scene.getScene('GameScene');
                if (scene) {
                    return {
                        gameState: scene.gameState,
                        skillPreviewsCount: scene.skillPreviews ? scene.skillPreviews.length : 0,
                        levelUpOptionsCount: scene.levelUpOptions ? scene.levelUpOptions.length : 0,
                        childrenCount: scene.children ? scene.children.length : 0,
                        hitStop: scene.hitStop,
                        slowMotion: scene.slowMotion
                    };
                }
            }
            return null;
        });
        
        console.log('游戏状态:', JSON.stringify(gameState, null, 2));
        console.log('控制台错误数量:', consoleErrors.length);
        
        if (consoleErrors.length > 0) {
            console.log('=== 控制台错误列表 ===');
            consoleErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
        }
        
    } catch (e) {
        console.error('测试失败:', e.message);
    } finally {
        await browser.close();
        server.close();
        console.log('测试完成');
    }
});
