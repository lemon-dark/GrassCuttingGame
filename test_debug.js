const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 700 });
    
    // 收集所有控制台输出
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
    
    // 检查纹理是否存在
    const textureInfo = await page.evaluate(() => {
        if (window.game && window.game.scene) {
            const scene = window.game.scene.scenes[0];
            if (scene && scene.textures) {
                return {
                    exists: scene.textures.exists('player_cartoon_side'),
                    keys: scene.textures.getTextureKeys().filter(k => k.includes('player'))
                };
            }
        }
        return { exists: false, keys: [], error: 'game not found' };
    });
    console.log('纹理信息:', JSON.stringify(textureInfo));
    
    await browser.close();
    console.log('调试完成');
})();
