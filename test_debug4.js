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
    await sleep(3000);
    
    // 点击开始游戏按钮
    const canvas = await page.$('canvas');
    if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + 100, box.y + 200);
        console.log('点击了开始游戏按钮');
    }
    
    await sleep(5000);
    
    console.log('\n========== 所有日志 ==========');
    allLogs.forEach(l => console.log(l));
    
    await browser.close();
})();
