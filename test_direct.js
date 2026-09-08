const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 700 });
    
    const allLogs = [];
    page.on('console', msg => {
        allLogs.push(`[${msg.type()}] ${msg.text()}`);
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
        allLogs.push(`[PAGE ERROR] ${err.message}`);
        console.log(`[PAGE ERROR] ${err.message}`);
    });
    
    console.log('正在加载游戏...');
    await page.goto('http://localhost:8765/dist/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(5000);
    
    // 直接在页面中测试SpriteLoader
    console.log('\n========== 直接测试SpriteLoader ==========');
    const result = await page.evaluate(async () => {
        try {
            // 检查window.game是否存在
            if (!window.game) {
                return { error: 'window.game not found' };
            }
            
            // 获取当前场景
            const scene = window.game.scene.scenes[0];
            if (!scene) {
                return { error: 'no scene found' };
            }
            
            console.log('当前场景:', scene.scene.key);
            
            // 检查SpriteLoader是否存在
            if (typeof SpriteLoader === 'undefined') {
                return { error: 'SpriteLoader not defined in global scope' };
            }
            
            console.log('SpriteLoader存在，调用loadPlayerCartoon...');
            SpriteLoader.loadPlayerCartoon(scene);
            
            // 等待2秒
            await new Promise(r => setTimeout(r, 2000));
            
            // 检查纹理
            return {
                player_cartoon_side: scene.textures.exists('player_cartoon_side'),
                player_cartoon_front: scene.textures.exists('player_cartoon_front'),
                player_cartoon_back: scene.textures.exists('player_cartoon_back'),
            };
        } catch (e) {
            return { error: e.message, stack: e.stack };
        }
    });
    
    console.log('\n========== 测试结果 ==========');
    console.log(JSON.stringify(result, null, 2));
    
    await browser.close();
})();
