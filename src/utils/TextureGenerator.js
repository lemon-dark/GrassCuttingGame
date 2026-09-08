// 程序生成角色和怪物纹理
export class TextureGenerator {
    static generateAll(scene) {
        this.generatePlayer(scene);
        this.generateEnemy(scene, 'normal', 0x66BB6A, 0x2E7D32);
        this.generateEnemy(scene, 'fast', 0xFFEE58, 0xF9A825);
        this.generateEnemy(scene, 'tank', 0xEF5350, 0xB71C1C);
        this.generateEnemy(scene, 'elite', 0xAB47BC, 0x6A1B9A);
        this.generateEnemy(scene, 'boss', 0xFF6D00, 0xE65100);
        this.generateBullet(scene);
        this.generateXpGem(scene);
        console.log('所有纹理生成完成');
    }
    
    static generatePlayer(scene) {
        const size = 128;
        const g = scene.add.graphics();
        
        // 发光外圈
        g.fillStyle(0x4FC3F7, 0.3);
        g.fillCircle(size/2, size/2, size/2 - 5);
        
        // 身体
        g.fillStyle(0x4FC3F7, 1);
        g.fillCircle(size/2, size/2, size/2 - 15);
        
        // 身体高光
        g.fillStyle(0x81D4FA, 0.6);
        g.fillCircle(size/2 - 10, size/2 - 10, size/4);
        
        // 眼睛
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(size/2 - 12, size/2 - 8, 10);
        g.fillCircle(size/2 + 12, size/2 - 8, 10);
        
        // 瞳孔
        g.fillStyle(0x000000, 1);
        g.fillCircle(size/2 - 10, size/2 - 8, 4);
        g.fillCircle(size/2 + 14, size/2 - 8, 4);
        
        // 嘴巴
        g.lineStyle(3, 0x01579B, 1);
        g.beginPath();
        g.arc(size/2, size/2 + 10, 12, 0.2, Math.PI - 0.2);
        g.strokePath();
        
        // 生成纹理
        g.generateTexture('player', size, size);
        g.destroy();
    }
    
    static generateEnemy(scene, type, color, darkColor) {
        const size = type === 'boss' ? 160 : type === 'elite' ? 120 : 96;
        const g = scene.add.graphics();
        
        // 发光外圈
        g.fillStyle(color, 0.25);
        g.fillCircle(size/2, size/2, size/2 - 3);
        
        // 身体
        g.fillStyle(color, 1);
        if (type === 'fast') {
            // 三角形（快速怪）
            g.beginPath();
            g.moveTo(size/2, size/2 - size/3);
            g.lineTo(size/2 + size/3, size/2 + size/3);
            g.lineTo(size/2 - size/3, size/2 + size/3);
            g.closePath();
            g.fillPath();
        } else if (type === 'tank') {
            // 方形（坦克怪）
            g.fillRect(size/4, size/4, size/2, size/2);
        } else if (type === 'boss') {
            // 多边形（Boss）
            g.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI/2;
                const r = i % 2 === 0 ? size/2 - 8 : size/3;
                const x = size/2 + Math.cos(angle) * r;
                const y = size/2 + Math.sin(angle) * r;
                if (i === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.closePath();
            g.fillPath();
        } else {
            // 圆形（普通/精英）
            g.fillCircle(size/2, size/2, size/2 - 10);
        }
        
        // 高光
        g.fillStyle(0xFFFFFF, 0.3);
        g.fillCircle(size/2 - size/6, size/2 - size/6, size/8);
        
        // 眼睛
        g.fillStyle(0xFFFFFF, 1);
        const eyeY = size/2 - size/10;
        const eyeOffset = size/6;
        g.fillCircle(size/2 - eyeOffset, eyeY, size/12);
        g.fillCircle(size/2 + eyeOffset, eyeY, size/12);
        
        // 瞳孔（红色）
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(size/2 - eyeOffset, eyeY, size/24);
        g.fillCircle(size/2 + eyeOffset, eyeY, size/24);
        
        // 嘴巴（凶狠）
        g.lineStyle(2, darkColor, 1);
        g.beginPath();
        g.moveTo(size/2 - size/6, size/2 + size/6);
        g.lineTo(size/2 - size/10, size/2 + size/8);
        g.lineTo(size/2, size/2 + size/6);
        g.lineTo(size/2 + size/10, size/2 + size/8);
        g.lineTo(size/2 + size/6, size/2 + size/6);
        g.strokePath();
        
        // 生成纹理
        g.generateTexture('enemy_' + type, size, size);
        g.destroy();
    }
    
    static generateBullet(scene) {
        const size = 64;
        const g = scene.add.graphics();
        
        // 能量弹
        g.fillStyle(0x4FC3F7, 0.3);
        g.fillCircle(size/2, size/2, size/2 - 2);
        g.fillStyle(0x4FC3F7, 1);
        g.fillCircle(size/2, size/2, size/3);
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillCircle(size/2, size/2, size/6);
        g.generateTexture('bullet_energy', size, size);
        g.clear();
        
        // 火球
        g.fillStyle(0xFF6D00, 0.3);
        g.fillCircle(size/2, size/2, size/2 - 2);
        g.fillStyle(0xFF6D00, 1);
        g.fillCircle(size/2, size/2, size/3);
        g.fillStyle(0xFFFF00, 0.8);
        g.fillCircle(size/2, size/2, size/5);
        g.generateTexture('bullet_fireball', size, size);
        g.clear();
        
        // 飞刀
        g.fillStyle(0xE0E0E0, 1);
        g.beginPath();
        g.moveTo(size - 5, size/2);
        g.lineTo(size/4, size/3);
        g.lineTo(size/6, size/2);
        g.lineTo(size/4, size*2/3);
        g.closePath();
        g.fillPath();
        g.generateTexture('bullet_knife', size, size);
        g.clear();
        
        // 导弹
        g.fillStyle(0x9E9E9E, 1);
        g.fillRect(size/6, size/3, size*2/3, size/3);
        g.fillStyle(0xFF5722, 1);
        g.beginPath();
        g.moveTo(size - 5, size/2);
        g.lineTo(size*5/6, size/3);
        g.lineTo(size*5/6, size*2/3);
        g.closePath();
        g.fillPath();
        g.fillStyle(0xFF5722, 0.6);
        g.fillCircle(size/8, size/2, size/6);
        g.generateTexture('bullet_missile', size, size);
        g.clear();
        
        // 冰锥
        g.fillStyle(0x80DEEA, 0.3);
        g.fillCircle(size/2, size/2, size/2 - 2);
        g.fillStyle(0x80DEEA, 1);
        g.beginPath();
        g.moveTo(size - 5, size/2);
        g.lineTo(size/3, size/3);
        g.lineTo(size/5, size/2);
        g.lineTo(size/3, size*2/3);
        g.closePath();
        g.fillPath();
        g.fillStyle(0xFFFFFF, 0.6);
        g.fillCircle(size/2, size/2, size/8);
        g.generateTexture('bullet_ice', size, size);
        g.destroy();
    }
    
    static generateXpGem(scene) {
        const size = 48;
        const g = scene.add.graphics();
        
        // 发光
        g.fillStyle(0xFFD700, 0.3);
        g.fillCircle(size/2, size/2, size/2 - 2);
        
        // 菱形宝石
        g.fillStyle(0xFFD700, 1);
        g.beginPath();
        g.moveTo(size/2, 5);
        g.lineTo(size - 8, size/2);
        g.lineTo(size/2, size - 5);
        g.lineTo(8, size/2);
        g.closePath();
        g.fillPath();
        
        // 高光
        g.fillStyle(0xFFFFFF, 0.6);
        g.beginPath();
        g.moveTo(size/2, 10);
        g.lineTo(size/2 + 8, size/2 - 5);
        g.lineTo(size/2, size/2);
        g.lineTo(size/2 - 8, size/2 - 5);
        g.closePath();
        g.fillPath();
        
        g.generateTexture('xp_gem', size, size);
        g.destroy();
    }
}
