import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

export class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        
        this.add.text(w / 2, h * 0.06, '永久强化', {
            fontSize: '32px',
            color: '#FF9800',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.add.text(w - 20, 20, `💰 ${gameState.data.coins}`, {
            fontSize: '20px',
            color: '#FFD700'
        }).setOrigin(1, 0);
        
        this.addBackButton();
        
        const upgrades = [
            { key: 'attack', name: '攻击力', desc: '+5/级', icon: '⚔', color: 0xF44336 },
            { key: 'maxHp', name: '最大生命', desc: '+20/级', icon: '❤', color: 0xE91E63 },
            { key: 'attackSpeed', name: '攻击速度', desc: '+0.1/级', icon: '⚡', color: 0xFFC107 },
            { key: 'moveSpeed', name: '移动速度', desc: '+20/级', icon: '👟', color: 0x4CAF50 },
            { key: 'pickupRange', name: '拾取范围', desc: '+30/级', icon: '🧲', color: 0x2196F3 },
            { key: 'critChance', name: '暴击率', desc: '+3%/级', icon: '💥', color: 0x9C27B0 }
        ];
        
        const cardW = w * 0.85;
        const cardH = h * 0.1;
        const gap = h * 0.015;
        const startY = h * 0.14;
        
        this.upgradeTexts = {};
        
        upgrades.forEach((up, i) => {
            const y = startY + i * (cardH + gap);
            const level = gameState.data.metaUpgrades[up.key];
            const cost = gameState.getMetaUpgradeCost(up.key);
            
            const rect = this.add.rectangle(w / 2, y, cardW, cardH, up.color, 0.6)
                .setStrokeStyle(2, 0xFFFFFF, 0.3);
            
            this.add.text(w * 0.1, y, up.icon, { fontSize: '28px' }).setOrigin(0.5);
            this.add.text(w * 0.2, y - 10, up.name, { fontSize: '16px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0, 0.5);
            this.add.text(w * 0.2, y + 12, up.desc, { fontSize: '11px', color: '#CCCCCC' }).setOrigin(0, 0.5);
            
            const levelText = this.add.text(w * 0.55, y, `Lv.${level}`, {
                fontSize: '18px', color: '#FFD700', fontWeight: 'bold'
            }).setOrigin(0.5);
            this.upgradeTexts[up.key] = levelText;
            
            const btn = this.add.rectangle(w * 0.8, y, w * 0.2, cardH * 0.7, 0xFFD700, 0.9)
                .setStrokeStyle(2, 0xFFA000)
                .setInteractive({ useHandCursor: true });
            
            const costText = this.add.text(w * 0.8, y, `${cost}💰`, {
                fontSize: '14px', color: '#000000', fontWeight: 'bold'
            }).setOrigin(0.5);
            
            btn.on('pointerdown', () => {
                if (gameState.upgradeMeta(up.key)) {
                    soundManager.play('coin');
                    const newLevel = gameState.data.metaUpgrades[up.key];
                    const newCost = gameState.getMetaUpgradeCost(up.key);
                    levelText.setText(`Lv.${newLevel}`);
                    costText.setText(`${newCost}💰`);
                    this.updateCoinDisplay();
                } else {
                    soundManager.play('hurt');
                    // 闪烁提示
                    btn.setFillStyle(0xFF0000, 0.8);
                    setTimeout(() => btn.setFillStyle(0xFFD700, 0.9), 200);
                }
            });
        });
    }
    
    updateCoinDisplay() {
        // 重新创建金币显示（简单方式）
        const w = this.scale.width;
        this.children.list.filter(c => c.type === 'Text' && c.text && c.text.includes('💰') && c.x > w - 100).forEach(c => c.destroy());
        this.add.text(w - 20, 20, `💰 ${gameState.data.coins}`, {
            fontSize: '20px', color: '#FFD700'
        }).setOrigin(1, 0);
    }
    
    addBackButton() {
        const btn = this.add.rectangle(50, 40, 80, 40, 0x333333, 0.8)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(50, 40, '返回', { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0.5);
        btn.on('pointerdown', () => {
            soundManager.play('click');
            this.scene.start('MenuScene');
        });
    }
}
