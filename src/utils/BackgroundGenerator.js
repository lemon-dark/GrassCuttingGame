// 代码绘制背景生成器（替代AI图片，更清晰更轻量）
export class BackgroundGenerator {
    // 生成关卡背景纹理
    static generate(scene, levelId) {
        const key = 'bg_code_level' + levelId;
        if (scene.textures.exists(key)) return key;
        
        const size = 2048;
        const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
        
        switch (levelId) {
            case 1: this.drawNeonCity(graphics, size); break;
            case 2: this.drawDataForest(graphics, size); break;
            case 3: this.drawSpaceStation(graphics, size); break;
            case 4: this.drawLavaCore(graphics, size); break;
            case 5: this.drawQuantumAbyss(graphics, size); break;
            default: this.drawNeonCity(graphics, size);
        }
        
        graphics.generateTexture(key, size, size);
        graphics.destroy();
        console.log('代码背景生成成功:', key, size + 'x' + size);
        return key;
    }
    
    // 关卡1：霓虹都市
    static drawNeonCity(g, size) {
        // 深色底色
        g.fillStyle(0x0a0a1a, 1);
        g.fillRect(0, 0, size, size);
        
        // 网格
        g.lineStyle(1, 0x1a1a3a, 0.6);
        for (let x = 0; x <= size; x += 64) {
            g.lineBetween(x, 0, x, size);
        }
        for (let y = 0; y <= size; y += 64) {
            g.lineBetween(0, y, size, y);
        }
        
        // 电路板纹路（青蓝色）
        g.lineStyle(2, 0x00BCD4, 0.4);
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 50 + Math.random() * 150;
            const horizontal = Math.random() > 0.5;
            if (horizontal) {
                g.lineBetween(x, y, x + len, y);
                // 节点
                g.fillStyle(0x00BCD4, 0.6);
                g.fillCircle(x + len, y, 4);
            } else {
                g.lineBetween(x, y, x, y + len);
                g.fillStyle(0x00BCD4, 0.6);
                g.fillCircle(x, y + len, 4);
            }
        }
        
        // 品红色能量节点
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            g.fillStyle(0xE91E63, 0.5);
            g.fillCircle(x, y, 6 + Math.random() * 8);
            g.fillStyle(0xE91E63, 0.2);
            g.fillCircle(x, y, 15 + Math.random() * 10);
        }
        
        // 霓虹灯光斑
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const color = Math.random() > 0.5 ? 0x00BCD4 : 0xE91E63;
            g.fillStyle(color, 0.08);
            g.fillCircle(x, y, 40 + Math.random() * 60);
        }
    }
    
    // 关卡2：数据森林
    static drawDataForest(g, size) {
        g.fillStyle(0x0a1a0a, 1);
        g.fillRect(0, 0, size, size);
        
        // 发光苔藓斑块
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 20 + Math.random() * 60;
            g.fillStyle(0x4CAF50, 0.15);
            g.fillCircle(x, y, r);
            g.fillStyle(0x8BC34A, 0.2);
            g.fillCircle(x, y, r * 0.6);
        }
        
        // 数据流线（青色）
        g.lineStyle(2, 0x00BCD4, 0.3);
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 80 + Math.random() * 200;
            const angle = Math.random() * Math.PI * 2;
            g.lineBetween(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        }
        
        // 能量符文圆圈
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 30 + Math.random() * 50;
            g.lineStyle(2, 0x00E676, 0.4);
            g.strokeCircle(x, y, r);
            g.lineStyle(1, 0x00E676, 0.3);
            g.strokeCircle(x, y, r * 0.7);
            // 符文点
            for (let j = 0; j < 6; j++) {
                const a = (j / 6) * Math.PI * 2;
                g.fillStyle(0x00E676, 0.5);
                g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 3);
            }
        }
        
        // 荧光蘑菇/植物
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            g.fillStyle(0x69F0AE, 0.4);
            g.fillCircle(x, y, 5 + Math.random() * 8);
            g.fillStyle(0x69F0AE, 0.15);
            g.fillCircle(x, y, 12 + Math.random() * 10);
        }
    }
    
    // 关卡3：太空站
    static drawSpaceStation(g, size) {
        g.fillStyle(0x1a1a2a, 1);
        g.fillRect(0, 0, size, size);
        
        // 金属面板
        g.lineStyle(1, 0x3a3a4a, 0.5);
        for (let x = 0; x <= size; x += 128) {
            g.lineBetween(x, 0, x, size);
        }
        for (let y = 0; y <= size; y += 128) {
            g.lineBetween(0, y, size, y);
        }
        
        // 面板细节
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * (size / 128)) * 128;
            const y = Math.floor(Math.random() * (size / 128)) * 128;
            g.fillStyle(0x2a2a3a, 0.5);
            g.fillRect(x + 10, y + 10, 108, 108);
        }
        
        // 蓝色发光指示灯
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            g.fillStyle(0x2196F3, 0.6);
            g.fillCircle(x, y, 3 + Math.random() * 4);
            g.fillStyle(0x2196F3, 0.2);
            g.fillCircle(x, y, 8 + Math.random() * 6);
        }
        
        // 六边形星空窗口
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 40 + Math.random() * 60;
            g.fillStyle(0x0a0a2a, 0.8);
            // 画六边形
            g.beginPath();
            for (let j = 0; j < 6; j++) {
                const a = (j / 6) * Math.PI * 2 - Math.PI / 6;
                const px = x + Math.cos(a) * r;
                const py = y + Math.sin(a) * r;
                if (j === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.fillPath();
            g.lineStyle(2, 0x4FC3F7, 0.5);
            g.strokePath();
            // 星星
            for (let j = 0; j < 15; j++) {
                const sx = x + (Math.random() - 0.5) * r * 1.5;
                const sy = y + (Math.random() - 0.5) * r * 1.5;
                g.fillStyle(0xFFFFFF, 0.6 + Math.random() * 0.4);
                g.fillCircle(sx, sy, 1 + Math.random() * 2);
            }
        }
        
        // 管道
        g.lineStyle(4, 0x4a4a5a, 0.4);
        for (let i = 0; i < 10; i++) {
            const horizontal = Math.random() > 0.5;
            if (horizontal) {
                const y = Math.random() * size;
                g.lineBetween(0, y, size, y);
            } else {
                const x = Math.random() * size;
                g.lineBetween(x, 0, x, size);
            }
        }
    }
    
    // 关卡4：熔岩核心
    static drawLavaCore(g, size) {
        g.fillStyle(0x1a0a0a, 1);
        g.fillRect(0, 0, size, size);
        
        // 黑色岩石裂纹
        g.lineStyle(3, 0x2a1a1a, 0.8);
        for (let i = 0; i < 30; i++) {
            let x = Math.random() * size;
            let y = Math.random() * size;
            g.beginPath();
            g.moveTo(x, y);
            for (let j = 0; j < 5; j++) {
                x += (Math.random() - 0.5) * 200;
                y += (Math.random() - 0.5) * 200;
                g.lineTo(x, y);
            }
            g.strokePath();
        }
        
        // 岩浆裂缝（发光）
        for (let i = 0; i < 20; i++) {
            let x = Math.random() * size;
            let y = Math.random() * size;
            g.lineStyle(4, 0xFF5722, 0.6);
            g.beginPath();
            g.moveTo(x, y);
            for (let j = 0; j < 4; j++) {
                x += (Math.random() - 0.5) * 150;
                y += (Math.random() - 0.5) * 150;
                g.lineTo(x, y);
            }
            g.strokePath();
            // 发光
            g.lineStyle(8, 0xFF9800, 0.2);
            g.strokePath();
        }
        
        // 岩浆池
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 30 + Math.random() * 80;
            g.fillStyle(0xFF5722, 0.4);
            g.fillCircle(x, y, r);
            g.fillStyle(0xFF9800, 0.5);
            g.fillCircle(x, y, r * 0.7);
            g.fillStyle(0xFFC107, 0.6);
            g.fillCircle(x, y, r * 0.4);
        }
        
        // 金色火花
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            g.fillStyle(0xFFC107, 0.5 + Math.random() * 0.5);
            g.fillCircle(x, y, 1 + Math.random() * 3);
        }
        
        // 灼热光晕
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            g.fillStyle(0xFF5722, 0.05);
            g.fillCircle(x, y, 100 + Math.random() * 100);
        }
    }
    
    // 关卡5：量子深渊
    static drawQuantumAbyss(g, size) {
        g.fillStyle(0x0a0a1a, 1);
        g.fillRect(0, 0, size, size);
        
        // 深紫渐变底
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 100 + Math.random() * 200;
            g.fillStyle(0x4A148C, 0.08);
            g.fillCircle(x, y, r);
        }
        
        // 能量粒子流（蓝色）
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 60 + Math.random() * 200;
            const angle = Math.random() * Math.PI * 2;
            g.lineStyle(2, 0x2196F3, 0.3);
            g.lineBetween(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            // 粒子
            for (let j = 0; j < 5; j++) {
                const t = j / 5;
                g.fillStyle(0x4FC3F7, 0.4 + Math.random() * 0.4);
                g.fillCircle(x + Math.cos(angle) * len * t, y + Math.sin(angle) * len * t, 2 + Math.random() * 2);
            }
        }
        
        // 几何曼陀罗图案
        for (let i = 0; i < 5; i++) {
            const cx = Math.random() * size;
            const cy = Math.random() * size;
            const r = 60 + Math.random() * 100;
            const layers = 3 + Math.floor(Math.random() * 3);
            
            for (let layer = 0; layer < layers; layer++) {
                const lr = r * (1 - layer * 0.25);
                const points = 6 + layer * 2;
                g.lineStyle(2, layer % 2 === 0 ? 0x7C4DFF : 0x4FC3F7, 0.4);
                g.beginPath();
                for (let j = 0; j <= points; j++) {
                    const a = (j / points) * Math.PI * 2;
                    const px = cx + Math.cos(a) * lr;
                    const py = cy + Math.sin(a) * lr;
                    if (j === 0) g.moveTo(px, py);
                    else g.lineTo(px, py);
                }
                g.strokePath();
            }
            
            // 中心点
            g.fillStyle(0x7C4DFF, 0.5);
            g.fillCircle(cx, cy, 8);
            g.fillStyle(0x7C4DFF, 0.2);
            g.fillCircle(cx, cy, 20);
        }
        
        // 空间裂缝
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 100 + Math.random() * 200;
            g.lineStyle(3, 0xE040FB, 0.3);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + len * 0.3, y + (Math.random() - 0.5) * 50);
            g.lineTo(x + len * 0.6, y + (Math.random() - 0.5) * 80);
            g.lineTo(x + len, y + (Math.random() - 0.5) * 40);
            g.strokePath();
            g.lineStyle(6, 0xE040FB, 0.1);
            g.strokePath();
        }
        
        // 漂浮光点
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const color = Math.random() > 0.5 ? 0x7C4DFF : 0x4FC3F7;
            g.fillStyle(color, 0.3 + Math.random() * 0.5);
            g.fillCircle(x, y, 1 + Math.random() * 3);
        }
    }
}
