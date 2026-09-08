const puppeteer = require('puppeteer-core');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 700 });
    
    // 收集控制台错误
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
    
    // 等待游戏加载
    await sleep(5000);
    
    // 截图主菜单
    await page.screenshot({ path: 'test_menu.png' });
    console.log('主菜单截图已保存');
    
    // 尝试点击画布中心开始游戏
    const canvas = await page.$('canvas');
    if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        console.log('点击了画布中心');
    }
    
    // 等待游戏开始
    await sleep(3000);
    
    // 截图游戏画面
    await page.screenshot({ path: 'test_game.png' });
    console.log('游戏画面截图已保存');
    
    console.log('\n========== 测试结果 ==========');
    console.log(`错误数量: ${errors.length}`);
    if (errors.length > 0) {
        console.log('错误列表:');
        errors.forEach((e, i) => console.log(`  ${i+1}. ${e}`));
    }
    
    await browser.close();
    console.log('测试完成');
})();
