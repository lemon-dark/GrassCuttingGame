import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

export class CharacterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        this.add.text(w / 2, h * 0.06, '角色选择', { fontSize: '32px', color: '#9C27B0', fontWeight: 'bold' }).setOrigin(0.5);
        this.addBackButton();
        
        const characters = ['cyber_ninja', 'flame_warrior', 'ice_mage'];
        const cardW = w * 0.8;
        const cardH = h * 0.2;
        const gap = h * 0.03;
        const startY = h * 0.18;
        
        characters.forEach((charId, i) => {
            const char = gameState.getCharacter(charId);
            const y = startY + i * (cardH + gap);
            const unlocked = gameState.data.unlockedCharacters.includes(charId);
            const isSelected = gameState.data.currentCharacter === charId;
            
            const rect = this.add.rectangle(w / 2, y, cardW, cardH, char.color, unlocked ? 0.7 : 0.3)
                .setStrokeStyle(isSelected ? 4 : 2, isSelected ? 0xFFD700 : 0xFFFFFF, isSelected ? 1 : 0.3)
                .setInteractive({ useHandCursor: true });
            
            // 角色头像（圆形）
            this.add.circle(w * 0.2, y, 40, char.color, 1).setStrokeStyle(3, 0xFFFFFF, 0.5);
            this.add.text(w * 0.2, y, char.name[0], { fontSize: '28px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0.5);
            
            this.add.text(w * 0.4, y - 25, char.name, { fontSize: '20px', color: '#FFFFFF', fontWeight: 'bold' }).setOrigin(0, 0.5);
            this.add.text(w * 0.4, y, char.desc, { fontSize: '14px', color: '#CCCCCC' }).setOrigin(0, 0.5);
            
            // 加成显示
            let bonusStr = '';
            for (const key in char.bonus) {
                const val = char.bonus[key];
                const names = { attack: '攻击', maxHp: '生命', attackSpeed: '攻速', moveSpeed: '移速' };
                bonusStr += `${names[key] || key}${val > 0 ? '+' : ''}${val} `;
            }
            this.add.text(w * 0.4, y + 25, bonusStr || '无特殊加成', { fontSize: '12px', color: '#FFD700' }).setOrigin(0, 0.5);
            
            if (!unlocked) {
                this.add.text(w * 0.8, y, `🔒 ${char.unlockCost}💰`, { fontSize: '16px', color: '#FFD700' }).setOrigin(0.5);
            } else if (isSelected) {
                this.add.text(w * 0.8, y, '✓ 已选择', { fontSize: '16px', color: '#FFD700' }).setOrigin(0.5);
            } else {
                this.add.text(w * 0.8, y, '点击选择', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
            }
            
            rect.on('pointerdown', () => {
                if (!unlocked) {
                    if (gameState.unlockCharacter(charId)) {
                        soundManager.play('coin');
                        this.scene.restart();
                    } else {
                        soundManager.play('hurt');
                    }
                } else {
                    soundManager.play('click');
                    gameState.selectCharacter(charId);
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
