import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

export class EquipmentScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EquipmentScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        this.add.text(w / 2, h * 0.05, '装备选择', { fontSize: '32px', color: '#F44336', fontWeight: 'bold' }).setOrigin(0.5);
        this.addBackButton();
        
        const slots = [
            { key: 'weapon', name: '武器', icon: '⚔' },
            { key: 'armor', name: '护甲', icon: '🛡' },
            { key: 'accessory', name: '饰品', icon: '💍' },
            { key: 'relic', name: '圣物', icon: '📿' }
        ];
        
        // 当前装备显示
        const currentY = h * 0.13;
        this.add.text(w / 2, currentY - 20, '当前装备', { fontSize: '16px', color: '#FFD700' }).setOrigin(0.5);
        
        slots.forEach((slot, i) => {
            const x = w * 0.15 + i * w * 0.22;
            const eqId = gameState.data.currentEquipments[slot.key];
            const eq = gameState.getEquipment(eqId);
            
            this.add.rectangle(x, currentY + 20, w * 0.18, 60, 0x333333, 0.8)
                .setStrokeStyle(2, 0xFFD700, 0.5);
            this.add.text(x, currentY + 5, slot.icon, { fontSize: '20px' }).setOrigin(0.5);
            this.add.text(x, currentY + 30, eq.name, { fontSize: '12px', color: '#FFFFFF' }).setOrigin(0.5);
        });
        
        // 装备列表
        const allEquipments = ['energy_blade', 'plasma_gun', 'nano_armor', 'speed_boots', 'crit_ring', 'xp_amulet', 'phoenix_feather'];
        const listStartY = h * 0.28;
        const itemH = h * 0.08;
        const gap = h * 0.01;
        
        this.add.text(w / 2, listStartY - 15, '可用装备（点击装备/解锁）', { fontSize: '14px', color: '#AAAAAA' }).setOrigin(0.5);
        
        allEquipments.forEach((eqId, i) => {
            const eq = gameState.getEquipment(eqId);
            const y = listStartY + i * (itemH + gap);
            const unlocked = gameState.data.unlockedEquipments.includes(eqId);
            const equipped = Object.values(gameState.data.currentEquipments).includes(eqId);
            
            const rect = this.add.rectangle(w / 2, y, w * 0.9, itemH, 0x222222, unlocked ? 0.8 : 0.4)
                .setStrokeStyle(equipped ? 3 : 1, equipped ? 0x4CAF50 : 0xFFFFFF, equipped ? 1 : 0.2)
                .setInteractive({ useHandCursor: true });
            
            this.add.text(w * 0.1, y, eq.name, { fontSize: '14px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0, 0.5);
            this.add.text(w * 0.1, y + 15, eq.desc, { fontSize: '11px', color: '#AAAAAA' }).setOrigin(0, 0.5);
            
            const slotNames = { weapon: '武器', armor: '护甲', accessory: '饰品', relic: '圣物' };
            this.add.text(w * 0.6, y, `[${slotNames[eq.slot]}]`, { fontSize: '11px', color: '#888888' }).setOrigin(0, 0.5);
            
            if (!unlocked) {
                this.add.text(w * 0.85, y, `🔒${eq.unlockCost}💰`, { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
            } else if (equipped) {
                this.add.text(w * 0.85, y, '✓已装备', { fontSize: '12px', color: '#4CAF50' }).setOrigin(0.5);
            } else {
                this.add.text(w * 0.85, y, '点击装备', { fontSize: '11px', color: '#FFFFFF' }).setOrigin(0.5);
            }
            
            rect.on('pointerdown', () => {
                if (!unlocked) {
                    if (gameState.unlockEquipment(eqId)) {
                        soundManager.play('coin');
                        this.scene.restart();
                    } else {
                        soundManager.play('hurt');
                    }
                } else {
                    soundManager.play('click');
                    gameState.equipItem(eq.slot, eqId);
                    this.scene.restart();
                }
            });
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
