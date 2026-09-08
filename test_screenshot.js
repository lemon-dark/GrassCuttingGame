const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 700 });
    
    console.log('正在加载游戏...');
    await page.goto('http://localhost:8765/dist/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(3000);
    
    // 点击开始游戏按钮
    const canvas = await page.$('canvas');
    if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + 100, box.y + 200);
    }
    
    await sleep(5000);
    
    // 截图游戏画面
    await page.screenshot({ path: 'test_game_final.png' });
    console.log('游戏画面截图已保存');
    
    // 模拟移动
    if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + 80, box.y + box.height - 200);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + box.height - 250, { steps: 10 });
        await sleep(2000);
        await page.mouse.up();
    }
    
    await page.screenshot({ path: 'test_moving_final.png' });
    console.log('移动后画面截图已保存');
    
    await browser.close();
    console.log('测试完成');
})();
