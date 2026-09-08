// 额外功能系统：手动大招、无尽模式、商店、画质设置、新手教程等
export const UltimateSkills = {
    meteor_storm: {
        name: '陨石风暴', icon: '☄️', desc: '召唤陨石轰炸全屏敌人',
        cooldown: 60, damage: 200, radius: 150
    },
    thunder_god: {
        name: '雷神之怒', icon: '⚡', desc: '全屏闪电链，伤害所有敌人',
        cooldown: 50, damage: 150, radius: 9999
    },
    frost_nova: {
        name: '冰霜新星', icon: '❄️', desc: '冻结全屏敌人5秒并造成伤害',
        cooldown: 45, damage: 100, radius: 9999
    },
    blade_storm: {
        name: '剑刃风暴', icon: '🌀', desc: '周围形成剑刃旋风，持续10秒',
        cooldown: 55, damage: 80, radius: 200
    }
};

export const ShopItems = [
    { id: 'hp_potion', name: '生命药水', icon: '❤️', desc: '恢复50%生命', price: 50, type: 'consumable' },
    { id: 'attack_boost', name: '攻击强化', icon: '⚔️', desc: '本局攻击力+20%', price: 100, type: 'buff' },
    { id: 'speed_boost', name: '疾风药剂', icon: '👟', desc: '本局移速+30%', price: 80, type: 'buff' },
    { id: 'shield', name: '无敌护盾', icon: '🛡️', desc: '5秒无敌', price: 150, type: 'consumable' },
    { id: 'xp_boost', name: '经验加成', icon: '📖', desc: '本局经验获取+50%', price: 120, type: 'buff' },
    { id: 'reroll', name: '刷新卷轴', icon: '🔄', desc: '下次升级额外刷新3次', price: 60, type: 'consumable' }
];

export const QualitySettings = {
    low: { name: '低', particles: false, screenShake: false, glow: false, desc: '流畅优先' },
    medium: { name: '中', particles: true, screenShake: true, glow: false, desc: '平衡' },
    high: { name: '高', particles: true, screenShake: true, glow: true, desc: '画质优先' }
};

export class ExtraFeaturesManager {
    constructor(scene) {
        this.scene = scene;
        this.ultimateCooldown = 0;
        this.ultimateReady = true;
        this.selectedUltimate = 'meteor_storm';
        this.endlessMode = false;
        this.endlessTime = 0;
        this.shopOpen = false;
        this.tutorialStep = 0;
        this.tutorialShowed = false;
    }
    
    // 手动大招
    castUltimate() {
        if (!this.ultimateReady) return false;
        const ult = UltimateSkills[this.selectedUltimate];
        this.ultimateReady = false;
        this.ultimateCooldown = ult.cooldown;
        
        const scene = this.scene;
        const player = scene.player;
        
        // 屏幕震动
        scene.cameras.main.shake(500, 0.02);
        
        if (this.selectedUltimate === 'meteor_storm') {
            // 陨石风暴：随机位置爆炸
            for (let i = 0; i < 15; i++) {
                scene.time.delayedCall(i * 100, () => {
                    const x = player.x + (Math.random() - 0.5) * 800;
                    const y = player.y + (Math.random() - 0.5) * 800;
                    scene.triggerExplosion(x, y, ult.radius, 0xFF5722);
                    for (const enemy of scene.enemies) {
                        if (enemy.alive && Math.hypot(enemy.x - x, enemy.y - y) < ult.radius) {
                            enemy.takeDamage(ult.damage);
                        }
                    }
                });
            }
        } else if (this.selectedUltimate === 'thunder_god') {
            // 雷神之怒：全屏伤害
            for (const enemy of scene.enemies) {
                if (enemy.alive) {
                    scene.time.delayedCall(Math.random() * 500, () => {
                        if (enemy.alive) {
                            scene.lightningBolts.push({ x1: enemy.x, y1: enemy.y - 200, x2: enemy.x, y2: enemy.y, life: 0.3, maxLife: 0.3, color: 0x00BCD4 });
                            enemy.takeDamage(ult.damage);
                        }
                    });
                }
            }
        } else if (this.selectedUltimate === 'frost_nova') {
            // 冰霜新星：冻结+伤害
            for (const enemy of scene.enemies) {
                if (enemy.alive) {
                    enemy.takeDamage(ult.damage);
                    enemy.slowTimer = 5;
                    enemy.slowFactor = 0;
                }
            }
            scene.triggerExplosion(player.x, player.y, 500, 0x00BCD4);
        } else if (this.selectedUltimate === 'blade_storm') {
            // 剑刃风暴：持续10秒
            scene.bladeStormActive = true;
            scene.bladeStormTimer = 10;
        }
        
        return true;
    }
    
    updateUltimate(dt) {
        if (!this.ultimateReady) {
            this.ultimateCooldown -= dt;
            if (this.ultimateCooldown <= 0) {
                this.ultimateReady = true;
                this.ultimateCooldown = 0;
            }
        }
    }
    
    // 无尽模式
    startEndlessMode() {
        this.endlessMode = true;
        this.endlessTime = 0;
    }
    
    updateEndless(dt) {
        if (this.endlessMode) {
            this.endlessTime += dt;
            // 无尽模式难度随时间增加
            const difficultyMult = 1 + this.endlessTime / 60;
            return difficultyMult;
        }
        return 1;
    }
    
    // 商店
    openShop() {
        this.shopOpen = true;
        this.scene.gameState = 'shop';
    }
    
    closeShop() {
        this.shopOpen = false;
        this.scene.gameState = 'playing';
    }
    
    buyItem(itemId) {
        const item = ShopItems.find(i => i.id === itemId);
        if (!item) return false;
        if (this.scene.gold < item.price) return false;
        
        this.scene.gold -= item.price;
        
        if (item.type === 'consumable') {
            if (itemId === 'hp_potion') {
                this.scene.player.hp = Math.min(this.scene.player.maxHp, this.scene.player.hp + this.scene.player.maxHp * 0.5);
            } else if (itemId === 'shield') {
                this.scene.player.invincibleTimer = 5;
            } else if (itemId === 'reroll') {
                this.scene.maxReroll += 3;
            }
        } else if (item.type === 'buff') {
            if (itemId === 'attack_boost') this.scene.player.attack *= 1.2;
            else if (itemId === 'speed_boost') this.scene.player.speed *= 1.3;
            else if (itemId === 'xp_boost') this.scene.player.xpMultiplier = (this.scene.player.xpMultiplier || 1) + 0.5;
        }
        
        return true;
    }
    
    // 新手教程
    startTutorial() {
        this.tutorialStep = 0;
        this.tutorialShowed = true;
        this.showTutorialStep();
    }
    
    showTutorialStep() {
        const steps = [
            { title: '欢迎来到割草传说!', desc: '左半屏拖动控制角色移动\n角色会自动攻击附近的敌人' },
            { title: '升级系统', desc: '击杀敌人获得经验宝石\n升级后可以选择技能或属性强化' },
            { title: '技能进化', desc: '技能升到8级后会自动进化为超级武器\n威力大幅提升!' },
            { title: '终极技能', desc: '点击右下角大招按钮释放终极技能\n冷却结束后可以再次使用' },
            { title: '生存10分钟', desc: '坚持10分钟即可通关\n注意躲避敌人，合理选择技能!' }
        ];
        
        if (this.tutorialStep >= steps.length) {
            this.scene.tutorialOverlay?.destroy();
            return;
        }
        
        const step = steps[this.tutorialStep];
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        
        this.scene.tutorialOverlay?.destroy();
        this.scene.tutorialOverlay = this.scene.add.container(0, 0);
        
        const bg = this.scene.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7).setScrollFactor(0).setDepth(5000);
        const card = this.scene.add.rectangle(w/2, h/2, w*0.8, h*0.3, 0x1a1a2a, 0.95).setScrollFactor(0).setDepth(5001).setStrokeStyle(3, 0x4FC3F7, 0.8);
        const title = this.scene.add.text(w/2, h/2 - h*0.08, step.title, { fontSize: '24px', color: '#FFD700', fontWeight: 'bold' }).setScrollFactor(0).setDepth(5002).setOrigin(0.5);
        const desc = this.scene.add.text(w/2, h/2, step.desc, { fontSize: '16px', color: '#FFFFFF', align: 'center', lineSpacing: 8 }).setScrollFactor(0).setDepth(5002).setOrigin(0.5);
        const btn = this.scene.add.rectangle(w/2, h/2 + h*0.1, w*0.3, h*0.06, 0x4FC3F7, 0.9).setScrollFactor(0).setDepth(5002).setInteractive({ useHandCursor: true });
        const btnText = this.scene.add.text(w/2, h/2 + h*0.1, this.tutorialStep === steps.length - 1 ? '开始游戏!' : '下一步', { fontSize: '16px', color: '#FFFFFF', fontWeight: 'bold' }).setScrollFactor(0).setDepth(5003).setOrigin(0.5);
        
        this.scene.tutorialOverlay.add([bg, card, title, desc, btn, btnText]);
        
        btn.on('pointerdown', () => {
            this.tutorialStep++;
            this.showTutorialStep();
        });
    }
}
