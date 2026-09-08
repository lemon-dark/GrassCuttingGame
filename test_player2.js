const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 700 });
    
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
            console.log('ERROR:', msg.text());
        }
    });
    page.on('pageerror', err => {
        errors.push(err.message);
        console.log('PAGE ERROR:', err.message);
    });
    
    console.log('正在加载游戏...');
    await page.goto('http://localhost:8765/dist/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(3000);
    
    // 点击开始游戏按钮（左上角）
    const canvas = await page.$('canvas');
    if (canvas) {
        const box = await canvas.boundingBox();
        // 开始游戏按钮大约在左上角 x=100, y=200
        await page.mouse.click(box.x + 100, box.y + 200);
        console.log('点击了开始游戏按钮');
    }
    
    await sleep(3000);
    
    // 截图游戏画面
    await page.screenshot({ path: 'test_game2.png' });
    console.log('游戏画面截图已保存');
    
    // 模拟移动（点击左半屏拖动）
    if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + 80, box.y + box.height - 200);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + box.height - 250, { steps: 10 });
        await sleep(2000);
        await page.mouse.up();
        console.log('模拟移动完成');
    }
    
    await page.screenshot({ path: 'test_moving2.png' });
    console.log('移动后画面截图已保存');
    
    console.log('\n========== 测试结果 ==========');
    console.log(`错误数量: ${errors.length}`);
    
    await browser.close();
    console.log('测试完成');
})();
