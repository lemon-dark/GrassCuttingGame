import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { GameConfig } from '../config/GameConfig.js';

export class BestiaryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BestiaryScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        this.add.text(w / 2, h * 0.05, '怪物图鉴', { fontSize: '32px', color: '#00BCD4', fontWeight: 'bold' }).setOrigin(0.5);
        this.addBackButton();
        
        const enemies = Object.entries(GameConfig.ENEMY_TYPES);
        const cardW = w * 0.85;
        const cardH = h * 0.14;
        const gap = h * 0.02;
        const startY = h * 0.14;
        
        enemies.forEach(([key, data], i) => {
            const y = startY + i * (cardH + gap);
            
            this.add.rectangle(w / 2, y, cardW, cardH, data.color, 0.5)
                .setStrokeStyle(2, 0xFFFFFF, 0.3);
            
            // 怪物图标（圆形+颜色）
            this.add.circle(w * 0.15, y, 30, data.color, 1).setStrokeStyle(3, 0xFFFFFF, 0.5);
            this.add.text(w * 0.15, y, data.name[0], { fontSize: '20px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0.5);
            
            this.add.text(w * 0.3, y - 30, data.name, { fontSize: '18px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0, 0.5);
            this.add.text(w * 0.3, y - 5, `生命: ${data.hp} | 攻击: ${data.damage}`, { fontSize: '12px', color: '#CCCCCC' }).setOrigin(0, 0.5);
            this.add.text(w * 0.3, y + 18, `速度: ${data.speed} | 经验: ${data.xp}`, { fontSize: '12px', color: '#CCCCCC' }).setOrigin(0, 0.5);
            
            // 特性描述
            const traits = {
                NORMAL: '普通怪物，数量多',
                FAST: '移动速度快，血量低',
                TANK: '血量高，移动慢',
                ELITE: '精英怪，高血量高攻击',
                BOSS: 'Boss，每2分钟出现'
            };
            this.add.text(w * 0.3, y + 38, traits[key] || '', { fontSize: '11px', color: '#FFD700' }).setOrigin(0, 0.5);
        });
    }
    
    addBackButton() {
        const btn = this.add.rectangle(50, 40, 80, 40, 0x333333, 0.8)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(50, 40, '返回', { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0.5);
        btn.on('pointerdown', () => { soundManager.play('click'); this.scene.start('MenuScene'); });
    }
}

export class SkillBestiaryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SkillBestiaryScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        this.add.text(w / 2, h * 0.05, '技能图鉴', { fontSize: '32px', color: '#8BC34A', fontWeight: 'bold' }).setOrigin(0.5);
        this.addBackButton();
        
        const skills = [
            { name: '能量弹', icon: '🔵', color: 0x4FC3F7, desc: '自动发射能量弹，可穿透敌人', evolve: '三联能量炮' },
            { name: '飞刀', icon: '🗡', color: 0xE0E0E0, desc: '环绕玩家的飞刀，持续造成伤害', evolve: '万剑归宗' },
            { name: '火球', icon: '🔥', color: 0xFF6D00, desc: '发射火球，命中后范围爆炸', evolve: '陨石雨' },
            { name: '闪电', icon: '⚡', color: 0xFFFF00, desc: '连锁闪电，在敌人间跳跃', evolve: '雷神之怒' },
            { name: '灼烧光环', icon: '☀', color: 0xFFAB40, desc: '持续对周围敌人造成伤害', evolve: '太阳风暴' },
            { name: '追踪导弹', icon: '🚀', color: 0x9E9E9E, desc: '自动追踪敌人，命中小爆炸', evolve: '全屏导弹雨' },
            { name: '冰锥术', icon: '❄', color: 0x80DEEA, desc: '发射冰锥，命中减速敌人', evolve: '绝对零度' },
            { name: '旋风斩', icon: '🌀', color: 0x80DEEA, desc: '环绕风刃，造成伤害并击退', evolve: '风暴领主' }
        ];
        
        const cardW = w * 0.42;
        const cardH = h * 0.18;
        const gapX = w * 0.03;
        const gapY = h * 0.02;
        const startX = w / 2 - cardW - gapX / 2;
        const startY = h * 0.13;
        
        skills.forEach((skill, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + col * (cardW + gapX);
            const y = startY + row * (cardH + gapY);
            
            this.add.rectangle(x, y, cardW, cardH, skill.color, 0.5)
                .setStrokeStyle(2, 0xFFFFFF, 0.3);
            
            this.add.text(x, y - cardH * 0.25, skill.icon, { fontSize: '28px' }).setOrigin(0.5);
            this.add.text(x, y - cardH * 0.05, skill.name, { fontSize: '16px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0.5);
            this.add.text(x, y + cardH * 0.12, skill.desc, { fontSize: '10px', color: '#CCCCCC', align: 'center', wordWrap: { width: cardW * 0.9 } }).setOrigin(0.5);
            this.add.text(x, y + cardH * 0.32, `超武: ${skill.evolve}`, { fontSize: '10px', color: '#FFD700' }).setOrigin(0.5);
        });
    }
    
    addBackButton() {
        const btn = this.add.rectangle(50, 40, 80, 40, 0x333333, 0.8)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(50, 40, '返回', { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0.5);
        btn.on('pointerdown', () => { soundManager.play('click'); this.scene.start('MenuScene'); });
    }
}
