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
    });
    page.on('pageerror', err => {
        allLogs.push(`[PAGE ERROR] ${err.message}`);
    });
    
    console.log('正在加载游戏...');
    await page.goto('http://localhost:8765/dist/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // 等待10秒，确保所有资源加载完成
    await sleep(10000);
    
    console.log('\n========== 所有日志 ==========');
    allLogs.forEach(l => console.log(l));
    
    // 检查纹理是否存在
    const textureInfo = await page.evaluate(() => {
        try {
            const game = window.game;
            if (game && game.scene && game.scene.scenes) {
                const scene = game.scene.scenes.find(s => s.textures);
                if (scene) {
                    return {
                        player_cartoon_side: scene.textures.exists('player_cartoon_side'),
                        player_cartoon_front: scene.textures.exists('player_cartoon_front'),
                        player_cartoon_back: scene.textures.exists('player_cartoon_back'),
                        allPlayerTextures: scene.textures.getTextureKeys().filter(k => k.includes('player'))
                    };
                }
            }
            return { error: 'game not found' };
        } catch (e) {
            return { error: e.message };
        }
    });
    console.log('\n========== 纹理信息 ==========');
    console.log(JSON.stringify(textureInfo, null, 2));
    
    await browser.close();
})();
