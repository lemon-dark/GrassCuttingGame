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
        const text = msg.text();
        allLogs.push(text);
        if (text.includes('玩家角色') || text.includes('Sprite') || text.includes('sprite')) {
            console.log('[FOUND]', text);
        }
    });
    page.on('pageerror', err => {
        console.log('[PAGE ERROR]', err.message);
    });
    
    console.log('正在加载游戏...');
    await page.goto('http://localhost:8765/dist/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(8000);
    
    console.log('\n========== 所有包含玩家角色的日志 ==========');
    allLogs.filter(l => l.includes('玩家角色') || l.includes('Sprite') || l.includes('sprite')).forEach(l => console.log(l));
    
    console.log('\n========== 所有错误日志 ==========');
    allLogs.filter(l => l.includes('ERROR') || l.includes('error') || l.includes('Error')).forEach(l => console.log(l));
    
    await browser.close();
})();
