import Phaser from 'phaser';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { TalentTree, Achievements, Missions } from '../systems/ProgressionSystem.js';

export class ProgressionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ProgressionScene' });
        this.currentTab = 'talent';
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
        
        this.add.text(w / 2, h * 0.06, '成长系统', {
            fontSize: '32px', color: '#FFD700', fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // 金币显示
        this.add.text(w - 80, h * 0.06, `💰 ${gameState.data.coins}`, {
            fontSize: '18px', color: '#FFD700'
        }).setOrigin(0.5);
        
        // 返回按钮
        const backBtn = this.add.rectangle(50, 40, 80, 40, 0x333333, 0.8)
            .setStrokeStyle(2, 0xFFFFFF, 0.5).setInteractive({ useHandCursor: true });
        this.add.text(50, 40, '返回', { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            soundManager.play('click');
            this.scene.start('MenuScene');
        });
        
        // 标签页
        this.tabs = [
            { key: 'talent', name: '天赋树', icon: '🌳' },
            { key: 'achievement', name: '成就', icon: '🏆' },
            { key: 'daily', name: '每日挑战', icon: '📅' },
            { key: 'mission', name: '任务', icon: '📋' }
        ];
        
        const tabW = w * 0.2;
        const tabH = h * 0.06;
        const tabGap = w * 0.02;
        const tabStartX = w / 2 - (this.tabs.length * tabW + (this.tabs.length - 1) * tabGap) / 2 + tabW / 2;
        
        this.tabButtons = [];
        this.tabs.forEach((tab, i) => {
            const x = tabStartX + i * (tabW + tabGap);
            const y = h * 0.14;
            const btn = this.add.rectangle(x, y, tabW, tabH, this.currentTab === tab.key ? 0x4FC3F7 : 0x333333, this.currentTab === tab.key ? 0.9 : 0.7)
                .setStrokeStyle(2, this.currentTab === tab.key ? 0xFFD700 : 0xFFFFFF, 0.5)
                .setInteractive({ useHandCursor: true });
            this.add.text(x, y, `${tab.icon} ${tab.name}`, {
                fontSize: '14px', color: '#FFFFFF', fontWeight: this.currentTab === tab.key ? 'bold' : 'normal'
            }).setOrigin(0.5);
            
            btn.on('pointerdown', () => {
                soundManager.play('click');
                this.currentTab = tab.key;
                this.refreshContent();
            });
            this.tabButtons.push(btn);
        });
        
        // 内容区域
        this.contentContainer = this.add.container(0, 0);
        this.refreshContent();
    }
    
    refreshContent() {
        // 清空内容
        this.contentContainer.removeAll(true);
        
        // 更新标签页样式
        this.tabs.forEach((tab, i) => {
            const btn = this.tabButtons[i];
            const selected = this.currentTab === tab.key;
            btn.setFillStyle(selected ? 0x4FC3F7 : 0x333333, selected ? 0.9 : 0.7);
            btn.setStrokeStyle(2, selected ? 0xFFD700 : 0xFFFFFF, 0.5);
        });
        
        const w = this.scale.width;
        const h = this.scale.height;
        const contentY = h * 0.22;
        
        if (this.currentTab === 'talent') this.renderTalentTree(w, h, contentY);
        else if (this.currentTab === 'achievement') this.renderAchievements(w, h, contentY);
        else if (this.currentTab === 'daily') this.renderDailyChallenges(w, h, contentY);
        else if (this.currentTab === 'mission') this.renderMissions(w, h, contentY);
    }
    
    renderTalentTree(w, h, startY) {
        let y = startY;
        const cardH = h * 0.08;
        const gap = h * 0.01;
        
        for (const [branchKey, branch] of Object.entries(TalentTree)) {
            // 分支标题
            this.contentContainer.add(this.add.text(w * 0.1, y, `${branch.icon} ${branch.name}`, {
                fontSize: '18px', color: `#${branch.color.toString(16).padStart(6, '0')}`, fontWeight: 'bold'
            }).setOrigin(0, 0.5));
            y += h * 0.04;
            
            for (const talent of branch.talents) {
                const level = gameState.progression.getTalentLevel(talent.id);
                const cost = talent.cost * (level + 1);
                const maxed = level >= talent.maxLevel;
                const canAfford = gameState.data.coins >= cost;
                
                const card = this.add.rectangle(w / 2, y, w * 0.85, cardH, 0x1a1a2a, 0.9)
                    .setStrokeStyle(2, branch.color, maxed ? 1 : 0.5);
                
                this.contentContainer.add(card);
                this.contentContainer.add(this.add.text(w * 0.15, y - 10, talent.name, {
                    fontSize: '15px', color: '#FFFFFF', fontWeight: 'bold'
                }).setOrigin(0, 0.5));
                this.contentContainer.add(this.add.text(w * 0.15, y + 12, talent.desc, {
                    fontSize: '11px', color: '#AAAAAA'
                }).setOrigin(0, 0.5));
                this.contentContainer.add(this.add.text(w * 0.6, y, `Lv.${level}/${talent.maxLevel}`, {
                    fontSize: '14px', color: maxed ? '#FFD700' : '#FFFFFF'
                }).setOrigin(0.5));
                
                if (!maxed) {
                    const btn = this.add.rectangle(w * 0.82, y, w * 0.15, cardH * 0.7, canAfford ? 0x4CAF50 : 0x555555, 0.8)
                        .setStrokeStyle(2, canAfford ? 0x81C784 : 0x777777, 0.5)
                        .setInteractive({ useHandCursor: canAfford });
                    this.contentContainer.add(btn);
                    this.contentContainer.add(this.add.text(w * 0.82, y, `💰${cost}`, {
                        fontSize: '13px', color: canAfford ? '#FFFFFF' : '#888888'
                    }).setOrigin(0.5));
                    
                    if (canAfford) {
                        btn.on('pointerdown', () => {
                            soundManager.play('click');
                            if (gameState.progression.upgradeTalent(talent.id)) {
                                this.refreshContent();
                            }
                        });
                    }
                }
                
                y += cardH + gap;
            }
            y += h * 0.02;
        }
    }
    
    renderAchievements(w, h, startY) {
        let y = startY;
        const cardH = h * 0.07;
        const gap = h * 0.01;
        
        const unlocked = gameState.data.achievements;
        this.contentContainer.add(this.add.text(w / 2, y, `已解锁 ${unlocked.length}/${Object.keys(Achievements).length}`, {
            fontSize: '16px', color: '#FFD700'
        }).setOrigin(0.5));
        y += h * 0.04;
        
        for (const [id, achievement] of Object.entries(Achievements)) {
            const isUnlocked = unlocked.includes(id);
            const card = this.add.rectangle(w / 2, y, w * 0.85, cardH, isUnlocked ? 0x1a2a1a : 0x1a1a1a, 0.9)
                .setStrokeStyle(2, isUnlocked ? 0xFFD700 : 0x444444, isUnlocked ? 0.8 : 0.3);
            this.contentContainer.add(card);
            
            this.contentContainer.add(this.add.text(w * 0.12, y, achievement.icon, {
                fontSize: '24px', alpha: isUnlocked ? 1 : 0.3
            }).setOrigin(0.5));
            this.contentContainer.add(this.add.text(w * 0.22, y - 8, achievement.name, {
                fontSize: '14px', color: isUnlocked ? '#FFD700' : '#888888', fontWeight: 'bold'
            }).setOrigin(0, 0.5));
            this.contentContainer.add(this.add.text(w * 0.22, y + 10, achievement.desc, {
                fontSize: '11px', color: isUnlocked ? '#AAAAAA' : '#666666'
            }).setOrigin(0, 0.5));
            this.contentContainer.add(this.add.text(w * 0.85, y, `💰${achievement.reward}`, {
                fontSize: '13px', color: isUnlocked ? '#FFD700' : '#555555'
            }).setOrigin(0.5));
            
            y += cardH + gap;
        }
    }
    
    renderDailyChallenges(w, h, startY) {
        let y = startY;
        const cardH = h * 0.1;
        const gap = h * 0.02;
        
        this.contentContainer.add(this.add.text(w / 2, y, '每日挑战（每天刷新）', {
            fontSize: '16px', color: '#4FC3F7'
        }).setOrigin(0.5));
        y += h * 0.04;
        
        for (const challenge of gameState.data.dailyChallenges) {
            const progress = Math.min(1, challenge.progress / challenge.target);
            const card = this.add.rectangle(w / 2, y, w * 0.85, cardH, 0x1a1a2a, 0.9)
                .setStrokeStyle(2, challenge.completed ? 0xFFD700 : 0x4FC3F7, challenge.completed ? 0.8 : 0.5);
            this.contentContainer.add(card);
            
            this.contentContainer.add(this.add.text(w * 0.15, y - 15, challenge.name, {
                fontSize: '15px', color: '#FFFFFF', fontWeight: 'bold'
            }).setOrigin(0, 0.5));
            this.contentContainer.add(this.add.text(w * 0.15, y + 8, challenge.desc, {
                fontSize: '11px', color: '#AAAAAA'
            }).setOrigin(0, 0.5));
            
            // 进度条
            this.contentContainer.add(this.add.rectangle(w * 0.5, y + 22, w * 0.4, 8, 0x333333, 0.8));
            this.contentContainer.add(this.add.rectangle(w * 0.5 - w * 0.2, y + 22, w * 0.4 * progress, 8, 0x4FC3F7, 0.9).setOrigin(0, 0.5));
            this.contentContainer.add(this.add.text(w * 0.5, y + 22, `${challenge.progress}/${challenge.target}`, {
                fontSize: '10px', color: '#FFFFFF'
            }).setOrigin(0.5));
            
            // 领取按钮
            if (challenge.completed && !challenge.claimed) {
                const btn = this.add.rectangle(w * 0.85, y, w * 0.12, cardH * 0.6, 0xFFD700, 0.9)
                    .setStrokeStyle(2, 0xFFA000, 0.8).setInteractive({ useHandCursor: true });
                this.contentContainer.add(btn);
                this.contentContainer.add(this.add.text(w * 0.85, y, '领取', {
                    fontSize: '13px', color: '#000000', fontWeight: 'bold'
                }).setOrigin(0.5));
                btn.on('pointerdown', () => {
                    soundManager.play('click');
                    if (gameState.progression.claimDailyChallenge(challenge.id)) {
                        this.refreshContent();
                    }
                });
            } else if (challenge.claimed) {
                this.contentContainer.add(this.add.text(w * 0.85, y, '✓已领', {
                    fontSize: '12px', color: '#666666'
                }).setOrigin(0.5));
            } else {
                this.contentContainer.add(this.add.text(w * 0.85, y, `💰${challenge.reward}`, {
                    fontSize: '12px', color: '#FFD700'
                }).setOrigin(0.5));
            }
            
            y += cardH + gap;
        }
    }
    
    renderMissions(w, h, startY) {
        let y = startY;
        const cardH = h * 0.09;
        const gap = h * 0.015;
        
        this.contentContainer.add(this.add.text(w / 2, y, '任务列表', {
            fontSize: '16px', color: '#9C27B0'
        }).setOrigin(0.5));
        y += h * 0.04;
        
        for (const mission of Missions) {
            const data = gameState.data.missions[mission.id] || { progress: 0, completed: false, claimed: false };
            const progress = Math.min(1, data.progress / mission.target);
            const card = this.add.rectangle(w / 2, y, w * 0.85, cardH, 0x1a1a2a, 0.9)
                .setStrokeStyle(2, data.completed ? 0xFFD700 : 0x9C27B0, data.completed ? 0.8 : 0.5);
            this.contentContainer.add(card);
            
            this.contentContainer.add(this.add.text(w * 0.15, y - 12, mission.name, {
                fontSize: '14px', color: '#FFFFFF', fontWeight: 'bold'
            }).setOrigin(0, 0.5));
            this.contentContainer.add(this.add.text(w * 0.15, y + 10, mission.desc, {
                fontSize: '11px', color: '#AAAAAA'
            }).setOrigin(0, 0.5));
            
            // 进度条
            this.contentContainer.add(this.add.rectangle(w * 0.5, y + 25, w * 0.35, 6, 0x333333, 0.8));
            this.contentContainer.add(this.add.rectangle(w * 0.5 - w * 0.175, y + 25, w * 0.35 * progress, 6, 0x9C27B0, 0.9).setOrigin(0, 0.5));
            this.contentContainer.add(this.add.text(w * 0.5, y + 25, `${Math.floor(data.progress)}/${mission.target}`, {
                fontSize: '9px', color: '#FFFFFF'
            }).setOrigin(0.5));
            
            // 领取按钮
            if (data.completed && !data.claimed) {
                const btn = this.add.rectangle(w * 0.85, y, w * 0.12, cardH * 0.6, 0xFFD700, 0.9)
                    .setStrokeStyle(2, 0xFFA000, 0.8).setInteractive({ useHandCursor: true });
                this.contentContainer.add(btn);
                this.contentContainer.add(this.add.text(w * 0.85, y, '领取', {
                    fontSize: '13px', color: '#000000', fontWeight: 'bold'
                }).setOrigin(0.5));
                btn.on('pointerdown', () => {
                    soundManager.play('click');
                    if (gameState.progression.claimMission(mission.id)) {
                        this.refreshContent();
                    }
                });
            } else if (data.claimed) {
                this.contentContainer.add(this.add.text(w * 0.85, y, '✓已领', {
                    fontSize: '12px', color: '#666666'
                }).setOrigin(0.5));
            } else {
                this.contentContainer.add(this.add.text(w * 0.85, y, `💰${mission.reward}`, {
                    fontSize: '12px', color: '#FFD700'
                }).setOrigin(0.5));
            }
            
            y += cardH + gap;
        }
    }
}
