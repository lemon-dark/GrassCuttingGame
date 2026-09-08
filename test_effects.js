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

server.listen(8766, async () => {
    console.log('HTTP服务器启动: http://localhost:8766');
    
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=400,800']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800 });
    
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push('PageError: ' + err.message));
    
    try {
        console.log('打开游戏页面...');
        await page.goto('http://localhost:8766', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);
        
        // 直接进入游戏场景
        console.log('进入游戏场景...');
        await page.evaluate(() => {
            window.game.scene.start('GameScene');
        });
        await sleep(3000);
        
        // 生成一些敌人在玩家周围
        console.log('生成敌人...');
        await page.evaluate(() => {
            const scene = window.game.scene.getScene('GameScene');
            // 在玩家周围生成10个敌人
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const dist = 150 + Math.random() * 100;
                const x = scene.player.x + Math.cos(angle) * dist;
                const y = scene.player.y + Math.sin(angle) * dist;
                scene.enemies.push({
                    x, y,
                    type: 'NORMAL',
                    hp: 100,
                    maxHp: 100,
                    speed: 60,
                    damage: 10,
                    color: 0xFF5722,
                    size: 20,
                    sprite: null,
                    hpBar: null,
                    hitFlash: 0,
                    knockbackX: 0,
                    knockbackY: 0
                });
            }
        });
        await sleep(1000);
        
        // 截图普通攻击特效
        console.log('截图普通攻击特效...');
        await page.screenshot({ path: 'effect_01_normal_attack.png' });
        
        // 给玩家添加各种技能，依次截图
        const skills = ['能量弹', '飞刀', '火球', '闪电', '灼烧光环', '追踪导弹', '冰锥术', '旋风斩'];
        
        for (let i = 0; i < skills.length; i++) {
            const skillName = skills[i];
            console.log(`添加技能: ${skillName}...`);
            
            await page.evaluate((name) => {
                const scene = window.game.scene.getScene('GameScene');
                // 清除现有技能
                scene.player.skills = [];
                // 添加新技能
                const skillFactory = window.game.scene.getScene('GameScene').add;
                // 直接创建技能对象
                const skillClasses = {
                    '能量弹': { name: '能量弹', level: 1, damage: 20, cooldown: 1, lastFire: 0 },
                    '飞刀': { name: '飞刀', level: 1, damage: 15, cooldown: 0.8, lastFire: 0 },
                    '火球': { name: '火球', level: 1, damage: 30, cooldown: 1.5, lastFire: 0 },
                    '闪电': { name: '闪电', level: 1, damage: 25, cooldown: 2, lastFire: 0 },
                    '灼烧光环': { name: '灼烧光环', level: 1, damage: 10, cooldown: 0.5, lastFire: 0 },
                    '追踪导弹': { name: '追踪导弹', level: 1, damage: 35, cooldown: 2, lastFire: 0 },
                    '冰锥术': { name: '冰锥术', level: 1, damage: 20, cooldown: 1.2, lastFire: 0 },
                    '旋风斩': { name: '旋风斩', level: 1, damage: 15, cooldown: 0.6, lastFire: 0 }
                };
                if (skillClasses[name]) {
                    scene.player.skills.push({...skillClasses[name]});
                }
            }, skillName);
            
            // 等待技能触发
            await sleep(2000);
            
            // 截图技能特效
            const num = String(i + 2).padStart(2, '0');
            await page.screenshot({ path: `effect_${num}_${skillName}.png` });
            console.log(`已截图: effect_${num}_${skillName}.png`);
        }
        
        console.log('控制台错误数量:', consoleErrors.length);
        if (consoleErrors.length > 0) {
            console.log('错误列表:', consoleErrors.slice(0, 10));
        }
        
    } catch (e) {
        console.error('测试失败:', e.message);
    } finally {
        await browser.close();
        server.close();
        console.log('测试完成');
    }
});
