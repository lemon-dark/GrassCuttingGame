import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        this.add.text(w / 2, h * 0.05, '设置', { fontSize: '32px', color: '#607D8B', fontWeight: 'bold' }).setOrigin(0.5);
        this.addBackButton();
        
        const settings = [
            { key: 'masterVolume', name: '主音量', type: 'slider', min: 0, max: 1, step: 0.1 },
            { key: 'sfxVolume', name: '音效音量', type: 'slider', min: 0, max: 1, step: 0.1 },
            { key: 'musicVolume', name: '音乐音量', type: 'slider', min: 0, max: 1, step: 0.1 },
            { key: 'pickupVolume', name: '拾取音量', type: 'slider', min: 0, max: 1, step: 0.1 },
            { key: 'voiceVolume', name: '语音音量', type: 'slider', min: 0, max: 1, step: 0.1 },
            { key: 'particlesEnabled', name: '粒子效果', type: 'toggle' },
            { key: 'damageNumbersEnabled', name: '伤害数字', type: 'toggle' },
            { key: 'screenShakeEnabled', name: '屏幕震动', type: 'toggle' }
        ];
        
        const itemH = h * 0.08;
        const gap = h * 0.015;
        const startY = h * 0.13;
        
        settings.forEach((setting, i) => {
            const y = startY + i * (itemH + gap);
            const value = gameState.data.settings[setting.key];
            
            this.add.rectangle(w / 2, y, w * 0.9, itemH, 0x222222, 0.6)
                .setStrokeStyle(1, 0xFFFFFF, 0.2);
            
            this.add.text(w * 0.1, y, setting.name, { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0, 0.5);
            
            if (setting.type === 'slider') {
                // 滑块背景
                const barX = w * 0.5;
                const barW = w * 0.35;
                this.add.rectangle(barX + barW / 2, y, barW, 8, 0x444444).setOrigin(0.5);
                this.add.rectangle(barX + (barW * value) / 2, y, barW * value, 8, 0x4FC3F7).setOrigin(0, 0.5);
                
                // 数值显示
                const valText = this.add.text(w * 0.9, y, Math.round(value * 100) + '%', { fontSize: '14px', color: '#FFD700' }).setOrigin(0.5);
                
                // 点击区域
                const hitArea = this.add.rectangle(barX + barW / 2, y, barW, itemH, 0x000000, 0)
                    .setInteractive({ useHandCursor: true });
                
                hitArea.on('pointerdown', (pointer) => {
                    const ratio = Math.max(0, Math.min(1, (pointer.x - barX) / barW));
                    const newVal = Math.round(ratio * 10) / 10;
                    gameState.updateSetting(setting.key, newVal);
                    soundManager.updateSettings(gameState.data.settings);
                    soundManager.play('click');
                    this.scene.restart();
                });
            } else if (setting.type === 'toggle') {
                const toggleX = w * 0.8;
                const toggleW = 60;
                const toggleH = 30;
                
                this.add.rectangle(toggleX, y, toggleW, toggleH, value ? 0x4CAF50 : 0x555555)
                    .setStrokeStyle(2, 0xFFFFFF, 0.3)
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => {
                        gameState.updateSetting(setting.key, !value);
                        soundManager.play('click');
                        this.scene.restart();
                    });
                
                this.add.circle(toggleX + (value ? 15 : -15), y, 10, 0xFFFFFF);
                this.add.text(toggleX + (value ? 15 : -15), y, value ? '开' : '关', { fontSize: '10px', color: '#000000' }).setOrigin(0.5);
            }
        });
        
        // 重置存档按钮
        const resetY = h * 0.9;
        const resetBtn = this.add.rectangle(w / 2, resetY, w * 0.5, 50, 0xF44336, 0.7)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(w / 2, resetY, '重置所有存档', { fontSize: '16px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0.5);
        resetBtn.on('pointerdown', () => {
            if (confirm('确定要重置所有存档吗？这将清除所有金币、升级和进度！')) {
                gameState.reset();
                soundManager.play('hurt');
                this.scene.restart();
            }
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
