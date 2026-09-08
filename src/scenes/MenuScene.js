import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }
    
    create() {
        soundManager.init();
        soundManager.updateSettings(gameState.data.settings);
        
        const w = this.scale.width;
        const h = this.scale.height;
        
        // 背景
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        
        // 背景网格
        const bgGraphics = this.add.graphics();
        bgGraphics.lineStyle(1, 0x1a1a3a, 0.3);
        for (let x = 0; x < w; x += 50) {
            bgGraphics.lineBetween(x, 0, x, h);
        }
        for (let y = 0; y < h; y += 50) {
            bgGraphics.lineBetween(0, y, w, y);
        }
        
        // 标题
        this.add.text(w / 2, h * 0.10, '割草传说', {
            fontSize: `${Math.min(w * 0.14, 64)}px`,
            color: '#4FC3F7',
            fontWeight: 'bold',
            stroke: '#01579B',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.add.text(w / 2, h * 0.17, 'Phaser 完整版', {
            fontSize: '18px',
            color: '#FFD700'
        }).setOrigin(0.5);
        
        // 金币显示
        this.add.text(w - 15, 15, `💰 ${gameState.data.coins}`, {
            fontSize: '18px',
            color: '#FFD700'
        }).setOrigin(1, 0);
        
        // 菜单按钮（3列3行网格）
        const buttons = [
            { name: '开始游戏', icon: '▶', color: 0x4CAF50, scene: 'GameScene' },
            { name: '关卡选择', icon: '🗺', color: 0x2196F3, scene: 'LevelScene' },
            { name: '成长系统', icon: '🌳', color: 0xFFD700, scene: 'ProgressionScene' },
            { name: '永久强化', icon: '⬆', color: 0xFF9800, scene: 'UpgradeScene' },
            { name: '角色选择', icon: '👤', color: 0x9C27B0, scene: 'CharacterScene' },
            { name: '装备选择', icon: '⚔', color: 0xF44336, scene: 'EquipmentScene' },
            { name: '怪物图鉴', icon: '👾', color: 0x00BCD4, scene: 'BestiaryScene' },
            { name: '技能图鉴', icon: '✨', color: 0x8BC34A, scene: 'SkillBestiaryScene' },
            { name: '设置', icon: '⚙', color: 0x607D8B, scene: 'SettingsScene' },
            { name: '错误日志', icon: '🐛', color: 0xF44336, scene: 'ErrorLogScene' }
        ];
        
        const cols = 3;
        const btnW = Math.min(w * 0.28, 200);
        const btnH = Math.min(h * 0.10, 70);
        const gapX = w * 0.02;
        const gapY = h * 0.015;
        
        // 正确的居中计算
        const totalWidth = cols * btnW + (cols - 1) * gapX;
        const startX = (w - totalWidth) / 2 + btnW / 2;
        const rows = Math.ceil(buttons.length / cols);
        const totalHeight = rows * btnH + (rows - 1) * gapY;
        const startY = h * 0.24 + btnH / 2;
        
        buttons.forEach((btn, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (btnW + gapX);
            const y = startY + row * (btnH + gapY);
            
            const rect = this.add.rectangle(x, y, btnW, btnH, btn.color, 0.85)
                .setStrokeStyle(3, 0xFFFFFF, 0.5)
                .setInteractive({ useHandCursor: true });
            
            // 图标在左侧
            this.add.text(x - btnW * 0.28, y, btn.icon, {
                fontSize: '28px'
            }).setOrigin(0.5);
            
            // 文字在右侧
            this.add.text(x + btnW * 0.12, y, btn.name, {
                fontSize: '17px',
                color: '#FFFFFF',
                fontWeight: 'bold'
            }).setOrigin(0.5);
            
            rect.on('pointerover', () => {
                rect.setFillStyle(btn.color, 1);
                rect.setScale(1.03);
            });
            rect.on('pointerout', () => {
                rect.setFillStyle(btn.color, 0.85);
                rect.setScale(1);
            });
            rect.on('pointerdown', () => {
                soundManager.play('click');
                this.scene.start(btn.scene);
            });
        });
        
        // 底部信息
        this.add.text(w / 2, h - 20, '左半屏拖动移动 | 自动攻击 | 10分钟一局', {
            fontSize: '11px',
            color: '#666666'
        }).setOrigin(0.5);
    }
}
