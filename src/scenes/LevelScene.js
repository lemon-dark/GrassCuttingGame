import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { GameConfig } from '../config/GameConfig.js';

export class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        
        this.add.text(w / 2, h * 0.06, '关卡选择', {
            fontSize: '32px',
            color: '#4FC3F7',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // 返回按钮
        this.addBackButton();
        
        // 难度选择
        this.addDifficultySelector(w, h);
        
        // 关卡列表
        const levels = [1, 2, 3, 4, 5];
        const cardW = w * 0.8;
        const cardH = h * 0.11;
        const gap = h * 0.015;
        const startY = h * 0.28;
        
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
                fontSize: '18px',
                color: '#FFFFFF',
                fontWeight: 'bold'
            }).setOrigin(0, 0.5);
            
            this.add.text(w * 0.35, y - 12, level.name, {
                fontSize: '16px',
                color: '#FFFFFF'
            }).setOrigin(0, 0.5);
            
            this.add.text(w * 0.35, y + 12, `${level.desc} | 奖励: ${level.reward}金币`, {
                fontSize: '11px',
                color: '#CCCCCC'
            }).setOrigin(0, 0.5);
            
            if (cleared) {
                this.add.text(w * 0.85, y, '✓', {
                    fontSize: '24px',
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
    
    addDifficultySelector(w, h) {
        const difficulties = ['easy', 'normal', 'hard', 'hell'];
        const btnW = w * 0.2;
        const btnH = h * 0.05;
        const gap = w * 0.02;
        const totalW = difficulties.length * btnW + (difficulties.length - 1) * gap;
        const startX = w / 2 - totalW / 2 + btnW / 2;
        const y = h * 0.18;
        
        this.add.text(w / 2, y - btnH, '选择难度', {
            fontSize: '16px',
            color: '#AAAAAA'
        }).setOrigin(0.5);
        
        this.difficultyButtons = [];
        
        difficulties.forEach((diffKey, i) => {
            const diff = GameConfig.DIFFICULTIES[diffKey];
            const x = startX + i * (btnW + gap);
            const isSelected = gameState.data.currentDifficulty === diffKey;
            
            const btn = this.add.rectangle(x, y, btnW, btnH, diff.color, isSelected ? 0.9 : 0.5)
                .setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xFFD700 : 0xFFFFFF, isSelected ? 1 : 0.3)
                .setInteractive({ useHandCursor: true });
            
            this.add.text(x, y, diff.name, {
                fontSize: '14px',
                color: '#FFFFFF',
                fontWeight: isSelected ? 'bold' : 'normal'
            }).setOrigin(0.5);
            
            this.difficultyButtons.push({ btn, key: diffKey });
            
            btn.on('pointerdown', () => {
                soundManager.play('click');
                gameState.data.currentDifficulty = diffKey;
                gameState.save();
                // 更新所有按钮的选中状态
                this.difficultyButtons.forEach(item => {
                    const selected = item.key === diffKey;
                    const d = GameConfig.DIFFICULTIES[item.key];
                    item.btn.setFillStyle(d.color, selected ? 0.9 : 0.5);
                    item.btn.setStrokeStyle(selected ? 3 : 1, selected ? 0xFFD700 : 0xFFFFFF, selected ? 1 : 0.3);
                });
                console.log('难度已选择:', diff.name);
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
