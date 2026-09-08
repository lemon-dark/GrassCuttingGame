import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

export class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        
        this.add.text(w / 2, h * 0.08, '关卡选择', {
            fontSize: '36px',
            color: '#4FC3F7',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // 返回按钮
        this.addBackButton();
        
        // 关卡列表
        const levels = [1, 2, 3, 4, 5];
        const cardW = w * 0.8;
        const cardH = h * 0.12;
        const gap = h * 0.02;
        const startY = h * 0.18;
        
        levels.forEach((levelId, i) => {
            const level = gameState.getLevel(levelId);
            const y = startY + i * (cardH + gap);
            const cleared = gameState.data.clearedLevels.includes(levelId);
            const isCurrent = gameState.data.currentLevel === levelId;
            
            const colors = {
                1: 0x4CAF50, 2: 0x8BC34A, 3: 0x2196F3, 4: 0xFF9800, 5: 0xF44336
            };
            
            const rect = this.add.rectangle(w / 2, y, cardW, cardH, colors[levelId], 0.7)
                .setStrokeStyle(isCurrent ? 4 : 2, isCurrent ? 0xFFD700 : 0xFFFFFF, isCurrent ? 1 : 0.3)
                .setInteractive({ useHandCursor: true });
            
            this.add.text(w * 0.15, y, `第${levelId}关`, {
                fontSize: '20px',
                color: '#FFFFFF',
                fontWeight: 'bold'
            }).setOrigin(0, 0.5);
            
            this.add.text(w * 0.35, y - 15, level.name, {
                fontSize: '18px',
                color: '#FFFFFF'
            }).setOrigin(0, 0.5);
            
            this.add.text(w * 0.35, y + 15, `${level.desc} | 奖励: ${level.reward}金币`, {
                fontSize: '12px',
                color: '#CCCCCC'
            }).setOrigin(0, 0.5);
            
            if (cleared) {
                this.add.text(w * 0.85, y, '✓', {
                    fontSize: '28px',
                    color: '#FFD700'
                }).setOrigin(0.5);
            }
            
            rect.on('pointerdown', () => {
                soundManager.play('click');
                gameState.selectLevel(levelId);
                this.scene.start('GameScene');
            });
        });
    }
    
    addBackButton() {
        const w = this.scale.width;
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
