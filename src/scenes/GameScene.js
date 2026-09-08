import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Bullet, XpGem } from '../entities/Bullet.js';
import { Item, ItemTypes, BuffManager } from '../entities/Item.js';
import { SkillFactory, KnifeSkill, FireballSkill, LightningSkill, AuraSkill, MissileSkill, IceSpikeSkill, WhirlwindSkill } from '../skills/Skills.js';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { BackgroundImages } from '../assets/backgrounds.js';
import { BackgroundGenerator } from '../utils/BackgroundGenerator.js';
import { SpriteLoader } from '../utils/SpriteLoader.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    create() {
        soundManager.init();
        soundManager.updateSettings(gameState.data.settings);
        
        // 显示加载中
        const w = this.scale.width;
        const h = this.scale.height;
        this.loadingText = this.add.text(w / 2, h / 2, '加载中...', {
            fontSize: '32px', color: '#4FC3F7', fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(9999).setScrollFactor(0);
        
        // 先加载所有 sprite sheet 和动画，完成后再初始化游戏
        SpriteLoader.loadAll(this, () => {
            if (this.loadingText) {
                this.loadingText.destroy();
                this.loadingText = null;
            }
            this.initGame();
        });
    }
    
    initGame() {
        this.gameState = 'playing';
        this.gameTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = GameConfig.SPAWN_INTERVAL;
        this.killCount = 0;
        this.rerollCount = 0;
        this.maxReroll = 3;
        this.paused = false;
        
        // 关卡难度倍率
        this.level = gameState.getLevel(gameState.data.currentLevel);
        this.enemyMultiplier = this.level.enemyMultiplier;
        
        // 游戏难度倍率
        this.difficulty = GameConfig.DIFFICULTIES[gameState.data.currentDifficulty] || GameConfig.DIFFICULTIES.normal;
        console.log('游戏难度:', this.difficulty.name, '关卡倍率:', this.enemyMultiplier);
        
        this.enemies = [];
        this.bullets = [];
        this.xpGems = [];
        this.items = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lightningBolts = [];
        this.explosions = [];
        this.buffManager = new BuffManager();
        this.damageStats = { total: 0, bySkill: {}, startTime: 0 };
        
        this.player = new Player(this, GameConfig.MAP_WIDTH / 2, GameConfig.MAP_HEIGHT / 2);
        
        // 应用永久升级
        this.player.attack += gameState.getMetaBonus('attack');
        this.player.maxHp += gameState.getMetaBonus('maxHp');
        this.player.hp = this.player.maxHp;
        this.player.attackSpeed += gameState.getMetaBonus('attackSpeed');
        this.player.speed += gameState.getMetaBonus('moveSpeed');
        this.player.pickupRange += gameState.getMetaBonus('pickupRange');
        this.player.critChance += gameState.getMetaBonus('critChance');
        
        // 应用角色加成
        const char = gameState.getCharacter(gameState.data.currentCharacter);
        for (const key in char.bonus) {
            if (key === 'maxHp') {
                this.player.maxHp += char.bonus[key];
                this.player.hp += char.bonus[key];
            } else {
                this.player[key] += char.bonus[key];
            }
        }
        
        // 应用装备加成
        const eqBonuses = gameState.getAllEquipmentBonuses();
        for (const key in eqBonuses) {
            if (key === 'maxHp') {
                this.player.maxHp += eqBonuses[key];
                this.player.hp += eqBonuses[key];
            } else {
                this.player[key] += eqBonuses[key];
            }
        }
        
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBackgroundColor('#0a0a1a');
        
        this.loadLevelBackground();
        this.drawBackground();
        this.generateBuildings();
        this.setupInput();
        this.createHUD();
        this.createPauseButton();
        
        // 关卡名称显示
        const w = this.scale.width;
        this.add.text(w / 2, 100, this.level.name, {
            fontSize: '14px', color: '#FFD700'
        }).setScrollFactor(0).setDepth(998).setOrigin(0.5);
        
        this.levelUpOptions = [];
        console.log('GameScene created - 关卡:' + this.level.name + ' 难度倍率:' + this.enemyMultiplier);
    }
    
    createPauseButton() {
        const w = this.scale.width;
        this.pauseBtn = this.add.rectangle(w - 40, 100, 50, 40, 0x333333, 0.7)
            .setScrollFactor(0).setDepth(999)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(w - 40, 100, '⏸', { fontSize: '20px', color: '#FFFFFF' })
            .setScrollFactor(0).setDepth(1000).setOrigin(0.5);
        this.pauseBtn.on('pointerdown', () => {
            soundManager.play('click');
            this.togglePause();
        });
    }
    
    togglePause() {
        this.paused = !this.paused;
        if (this.paused) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
        }
    }
    
    showPauseMenu() {
        const w = this.scale.width;
        const h = this.scale.height;
        this.pauseBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setScrollFactor(0).setDepth(5000);
        this.add.text(w / 2, h * 0.3, '游戏暂停', { fontSize: '48px', color: '#FFFFFF', fontWeight: 'bold' }).setScrollFactor(0).setDepth(5001).setOrigin(0.5);
        
        const resumeBtn = this.add.rectangle(w / 2, h * 0.45, w * 0.5, 60, 0x4CAF50, 0.8)
            .setScrollFactor(0).setDepth(5001).setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(w / 2, h * 0.45, '继续游戏', { fontSize: '24px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(5002).setOrigin(0.5);
        resumeBtn.on('pointerdown', () => { soundManager.play('click'); this.togglePause(); });
        
        const menuBtn = this.add.rectangle(w / 2, h * 0.58, w * 0.5, 60, 0xF44336, 0.8)
            .setScrollFactor(0).setDepth(5001).setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(w / 2, h * 0.58, '返回主菜单', { fontSize: '24px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(5002).setOrigin(0.5);
        menuBtn.on('pointerdown', () => { soundManager.play('click'); this.scene.start('MenuScene'); });
    }
    
    hidePauseMenu() {
        this.children.list.filter(c => c.depth >= 5000).forEach(c => c.destroy());
    }
    
    loadLevelBackground() {
        const levelId = gameState.data.currentLevel;
        // 使用代码生成的背景（更清晰、更轻量）
        const bgKey = BackgroundGenerator.generate(this, levelId);
        
        // 用一整张 image 拉伸覆盖整个地图
        if (this.backgroundImage) this.backgroundImage.destroy();
        this.backgroundImage = this.add.image(
            GameConfig.MAP_WIDTH / 2,
            GameConfig.MAP_HEIGHT / 2,
            bgKey
        ).setDisplaySize(GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT)
         .setDepth(-10)
         .setAlpha(0.9);
        console.log('代码背景加载成功:', bgKey);
    }
    
    drawBackground() {
        // 只画地图边界，不画网格线
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x4FC3F7, 0.6);
        graphics.strokeRect(0, 0, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT);
    }
    
    // 生成随机建筑装饰（先用方块替代）
    generateBuildings() {
        this.buildings = [];
        const buildingCount = 50;
        const levelId = gameState.data.currentLevel;
        
        // 不同关卡不同建筑颜色
        const buildingColors = {
            1: [0x1a2a4a, 0x2a3a5a, 0x1a1a3a, 0x3a4a6a, 0x252545], // 霓虹都市：蓝紫色
            2: [0x1a3a1a, 0x2a4a2a, 0x1a2a1a, 0x3a5a3a, 0x253525], // 数据森林：绿色
            3: [0x3a3a4a, 0x4a4a5a, 0x2a2a3a, 0x5a5a6a, 0x454555], // 太空站：银灰色
            4: [0x3a1a1a, 0x4a2a2a, 0x2a1a1a, 0x5a3a3a, 0x452525], // 熔岩核心：暗红色
            5: [0x2a1a4a, 0x3a2a5a, 0x1a1a3a, 0x4a3a6a, 0x252545]  // 量子深渊：紫色
        };
        const colors = buildingColors[levelId] || buildingColors[1];
        const windowColor = levelId === 4 ? 0xFF9800 : levelId === 1 ? 0x00BCD4 : 0x4FC3F7;
        
        for (let i = 0; i < buildingCount; i++) {
            // 随机位置，避开中心出生点
            let x, y;
            do {
                x = Math.random() * (GameConfig.MAP_WIDTH - 300) + 150;
                y = Math.random() * (GameConfig.MAP_HEIGHT - 300) + 150;
            } while (Math.hypot(x - GameConfig.MAP_WIDTH/2, y - GameConfig.MAP_HEIGHT/2) < 400);
            
            const w = 80 + Math.random() * 120;
            const h = 80 + Math.random() * 120;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // 建筑主体（带阴影）
            this.add.rectangle(x + 4, y + 4, w, h, 0x000000, 0.3).setDepth(1);
            const building = this.add.rectangle(x, y, w, h, color, 0.95)
                .setDepth(2)
                .setStrokeStyle(3, windowColor, 0.5);
            
            // 建筑顶部高光
            this.add.rectangle(x, y - h/2 + 5, w - 8, 6, windowColor, 0.5).setDepth(3);
            
            // 窗户（发光）
            const windowRows = Math.floor(h / 30);
            const windowCols = Math.floor(w / 30);
            for (let wr = 0; wr < windowRows; wr++) {
                for (let wc = 0; wc < windowCols; wc++) {
                    if (Math.random() > 0.4) { // 60%窗户亮
                        const wx = x - w/2 + 15 + wc * 30;
                        const wy = y - h/2 + 20 + wr * 30;
                        this.add.rectangle(wx, wy, 12, 12, windowColor, 0.6 + Math.random() * 0.4).setDepth(3);
                    }
                }
            }
            
            this.buildings.push(building);
        }
        console.log('生成建筑:', buildingCount, '个');
    }
    
    setupInput() {
        this.joystickActive = false;
        this.joystickPointer = null;
        this.joystickBaseX = 0;
        this.joystickBaseY = 0;
        this.joystickMaxDist = 60;
        
        // 浮动摇杆（跟随手指，不固定位置）
        this.joystickBase = this.add.circle(0, 0, 55, 0xFFFFFF, 0.08).setScrollFactor(0).setDepth(1000).setVisible(false);
        this.joystickBase.setStrokeStyle(2, 0x4FC3F7, 0.3);
        this.joystickKnob = this.add.circle(0, 0, 28, 0x4FC3F7, 0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
        this.joystickKnob.setStrokeStyle(2, 0xFFFFFF, 0.6);
        
        // 全屏浮动摇杆：手指在哪按下，摇杆就在哪出现（右撇子/左撇子都适用）
        this.input.on('pointerdown', (pointer) => {
            if (this.gameState !== 'playing' || this.paused) return;
            // 排除右上角暂停按钮区域
            const pauseBtnX = this.scale.width - 50;
            const pauseBtnY = 50;
            const distToPause = Math.hypot(pointer.x - pauseBtnX, pointer.y - pauseBtnY);
            if (distToPause < 60) return;
            
            this.joystickActive = true;
            this.joystickPointer = pointer;
            this.joystickBaseX = pointer.x;
            this.joystickBaseY = pointer.y;
            this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
            this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true);
        });
        
        this.input.on('pointermove', (pointer) => {
            if (!this.joystickActive || pointer !== this.joystickPointer) return;
            const dx = pointer.x - this.joystickBaseX;
            const dy = pointer.y - this.joystickBaseY;
            const dist = Math.min(Math.hypot(dx, dy), this.joystickMaxDist);
            const angle = Math.atan2(dy, dx);
            this.joystickKnob.setPosition(
                this.joystickBaseX + Math.cos(angle) * dist,
                this.joystickBaseY + Math.sin(angle) * dist
            );
            if (dist > 8) {
                this.player.moveX = Math.cos(angle);
                this.player.moveY = Math.sin(angle);
            } else {
                this.player.moveX = 0;
                this.player.moveY = 0;
            }
        });
        
        this.input.on('pointerup', (pointer) => {
            if (pointer === this.joystickPointer) {
                this.joystickActive = false;
                this.joystickPointer = null;
                this.player.moveX = 0;
                this.player.moveY = 0;
                this.joystickBase.setVisible(false);
                this.joystickKnob.setVisible(false);
            }
        });
        
        // 手指移出屏幕也停止
        this.input.on('pointerupoutside', (pointer) => {
            if (pointer === this.joystickPointer) {
                this.joystickActive = false;
                this.joystickPointer = null;
                this.player.moveX = 0;
                this.player.moveY = 0;
                this.joystickBase.setVisible(false);
                this.joystickKnob.setVisible(false);
            }
        });
    }
    
    createHUD() {
        const w = this.scale.width;
        this.hpBarBg = this.add.rectangle(w / 2, 30, w * 0.8, 20, 0x333333).setScrollFactor(0).setDepth(999);
        this.hpBar = this.add.rectangle(w / 2 - w * 0.4, 30, w * 0.8, 20, 0xE53935).setScrollFactor(0).setDepth(1000).setOrigin(0, 0.5);
        this.xpBarBg = this.add.rectangle(w / 2, 55, w * 0.8, 8, 0x333333).setScrollFactor(0).setDepth(999);
        this.xpBar = this.add.rectangle(w / 2 - w * 0.4, 55, 0, 8, 0xFFD700).setScrollFactor(0).setDepth(1000).setOrigin(0, 0.5);
        this.hpText = this.add.text(w / 2, 30, '', { fontSize: '14px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(1001).setOrigin(0.5);
        this.levelText = this.add.text(20, 80, 'Lv.1', { fontSize: '20px', color: '#FFD700', fontWeight: 'bold' }).setScrollFactor(0).setDepth(1001);
        this.timeText = this.add.text(w - 20, 80, '10:00', { fontSize: '20px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(1001).setOrigin(1, 0);
        this.killText = this.add.text(20, 110, '击杀: 0', { fontSize: '14px', color: '#BDBDBD' }).setScrollFactor(0).setDepth(1001);
        this.dpsText = this.add.text(120, 110, 'DPS: 0', { fontSize: '14px', color: '#FF9800' }).setScrollFactor(0).setDepth(1001);
        
        // 技能栏（屏幕底部）
        this.skillBar = [];
        const h = this.scale.height;
        this.skillBarBg = this.add.rectangle(w/2, h - 30, w * 0.95, 45, 0x000000, 0.5)
            .setScrollFactor(0).setDepth(998)
            .setStrokeStyle(1, 0x4FC3F7, 0.3);
        
        // 小地图
        this.minimapSize = 90;
        this.minimapX = w - this.minimapSize - 15;
        this.minimapY = 130;
        this.minimapBg = this.add.rectangle(this.minimapX + this.minimapSize/2, this.minimapY + this.minimapSize/2, 
            this.minimapSize, this.minimapSize, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(998)
            .setStrokeStyle(2, 0x4FC3F7, 0.5);
        this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(999);
    }
    
    update(time, delta) {
        const dt = delta / 1000;
        
        if (this.paused) return;
        
        if (this.gameState === 'playing') {
            this.gameTime += dt;
            
            if (this.gameTime >= GameConfig.GAME_DURATION) {
                this.victory();
                return;
            }
            
            this.player.update(dt);
            
            // 低血量语音（血量低于30%时触发，带8秒冷却）
            if (this.player.hp / this.player.maxHp < 0.3) {
                soundManager.playVoice('lowhp');
            }
            
            // 生成怪物
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0 && this.enemies.filter(e => e.alive).length < GameConfig.MAX_ENEMIES) {
                this.spawnEnemy();
                const spawnMult = this.difficulty ? this.difficulty.spawnMult : 1;
                this.spawnInterval = Math.max(GameConfig.SPAWN_INTERVAL_MIN, (GameConfig.SPAWN_INTERVAL - this.gameTime * 0.02) / spawnMult);
                this.spawnTimer = this.spawnInterval;
            }
            
            // 更新怪物
            for (const enemy of this.enemies) {
                enemy.update(dt, this.player);
                if (enemy.alive && Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) < enemy.radius + this.player.radius) {
                    const dead = this.player.takeDamage(enemy.damage);
                    soundManager.play('hurt', 0.6);
                    soundManager.playVoice('hurt');
                    if (dead) { this.gameOver(); return; }
                }
            }
            
            // 更新子弹
            for (const bullet of this.bullets) {
                bullet.update(dt);
                if (!bullet.alive) continue;
                for (const enemy of this.enemies) {
                    if (!enemy.alive || bullet.hitEnemies.has(enemy)) continue;
                    if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.radius + enemy.radius) {
                        bullet.hitEnemies.add(enemy);
                        let dmg = bullet.damage;
                        // 应用 Buff 伤害加成
                        if (this.player.damageMultiplier) dmg *= this.player.damageMultiplier;
                        let isCrit = Math.random() < this.player.critChance;
                        if (isCrit) dmg *= this.player.critDamage;
                        
                        // 命中音效（根据类型）
                        if (bullet.type === 'fireball') soundManager.play('fireball', 0.4);
                        else if (bullet.type === 'missile') soundManager.play('missile', 0.3);
                        else if (bullet.type === 'ice_spike') soundManager.play('ice', 0.4);
                        else soundManager.play('hit', 0.3);
                        
                        const killed = enemy.takeDamage(dmg);
                        
                        // 伤害统计
                        this.damageStats.total += dmg;
                        const skillName = bullet.skillName || '普通攻击';
                        this.damageStats.bySkill[skillName] = (this.damageStats.bySkill[skillName] || 0) + dmg;
                        
                        const angle = Math.atan2(bullet.vy, bullet.vx);
                        enemy.knockbackX += Math.cos(angle) * (isCrit ? 300 : 150);
                        enemy.knockbackY += Math.sin(angle) * (isCrit ? 300 : 150);
                        
                        this.addFloatingText(enemy.x, enemy.y - enemy.radius, Math.floor(dmg).toString(), isCrit ? 0xFFD700 : 0xFFFFFF, isCrit ? 28 : 18);
                        this.spawnHitParticles(enemy.x, enemy.y, isCrit);
                        
                        // 冰锥减速
                        if (bullet.slowDuration > 0) {
                            enemy.slowTimer = bullet.slowDuration;
                            enemy.slowFactor = bullet.slowFactor;
                        }
                        
                        // 爆炸
                        if (bullet.explosionRadius > 0) {
                            this.triggerExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.type === 'fireball' ? 0xFF6D00 : 0xFF5722);
                            for (const e2 of this.enemies) {
                                if (!e2.alive) continue;
                                if (Math.hypot(e2.x - bullet.x, e2.y - bullet.y) < bullet.explosionRadius + e2.radius) {
                                    const k2 = e2.takeDamage(dmg * 0.6);
                                    if (k2) this.onEnemyKilled(e2);
                                }
                            }
                            bullet.alive = false;
                            break;
                        }
                        
                        if (killed) this.onEnemyKilled(enemy);
                        if (bullet.type !== 'energy') { bullet.alive = false; break; }
                    }
                }
            }
            
            // 更新经验宝石
            this.pickupSoundTimer = (this.pickupSoundTimer || 0) - dt;
            for (const gem of this.xpGems) {
                gem.update(dt, this.player);
                if (!gem.alive) {
                    if (this.pickupSoundTimer <= 0) {
                        soundManager.play('pickup', 0.5);
                        this.pickupSoundTimer = 0.08;
                    }
                    const leveledUp = this.player.gainXp(gem.value);
                    if (leveledUp) this.showLevelUp();
                }
            }
            
            // 更新道具
            for (const item of this.items) {
                item.update(dt, this.player);
            }
            
            // 更新 Buff
            this.buffManager.update(dt);
            // 应用 Buff 效果
            this.applyBuffs(dt);
            
            // 更新粒子
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
            this.updateLightningBolts(dt);
            this.updateExplosions(dt);
            
            // 渲染技能特效（飞刀/光环/旋风斩）
            this.renderSkillEffects();
            
            this.cleanupEntities();
            this.updateHUD();
        }
    }
    
    renderSkillEffects() {
        // 飞刀
        const knifeSkill = this.player.getSkill('飞刀');
        if (knifeSkill && knifeSkill.level > 0) {
            for (const knife of knifeSkill.orbitingKnives) {
                if (knife.x !== undefined) {
                    // 用graphics绘制飞刀
                    if (!knife.graphics) {
                        knife.graphics = this.add.graphics();
                    }
                    knife.graphics.clear();
                    const angle = Math.atan2(knife.y - this.player.y, knife.x - this.player.x);
                    knife.graphics.save();
                    knife.graphics.translate(knife.x, knife.y);
                    knife.graphics.rotate(angle);
                    knife.graphics.fillStyle(0xE0E0E0, 1);
                    knife.graphics.beginPath();
                    knife.graphics.moveTo(15, 0);
                    knife.graphics.lineTo(0, 5);
                    knife.graphics.lineTo(-8, 0);
                    knife.graphics.lineTo(0, -5);
                    knife.graphics.closePath();
                    knife.graphics.fillPath();
                    knife.graphics.restore();
                }
            }
        }
        
        // 光环
        const auraSkill = this.player.getSkill('灼烧光环');
        if (auraSkill && auraSkill.level > 0) {
            if (!this.auraGraphics) this.auraGraphics = this.add.graphics();
            this.auraGraphics.clear();
            this.auraGraphics.lineStyle(3, 0xFF6D00, 0.6);
            this.auraGraphics.strokeCircle(this.player.x, this.player.y, auraSkill.radius);
            this.auraGraphics.fillStyle(0xFF6D00, 0.1);
            this.auraGraphics.fillCircle(this.player.x, this.player.y, auraSkill.radius);
        } else if (this.auraGraphics) {
            this.auraGraphics.clear();
        }
        
        // 旋风斩
        const whirlSkill = this.player.getSkill('旋风斩');
        if (whirlSkill && whirlSkill.level > 0) {
            for (const blade of whirlSkill.blades) {
                if (blade.x !== undefined) {
                    if (!blade.graphics) blade.graphics = this.add.graphics();
                    blade.graphics.clear();
                    const angle = Math.atan2(blade.y - this.player.y, blade.x - this.player.x);
                    blade.graphics.save();
                    blade.graphics.translate(blade.x, blade.y);
                    blade.graphics.rotate(angle + Math.PI / 2);
                    blade.graphics.fillStyle(0x80DEEA, 0.8);
                    blade.graphics.beginPath();
                    blade.graphics.moveTo(0, -20);
                    blade.graphics.lineTo(8, 10);
                    blade.graphics.lineTo(-8, 10);
                    blade.graphics.closePath();
                    blade.graphics.fillPath();
                    blade.graphics.restore();
                }
            }
        }
    }
    
    spawnBullet(x, y, vx, vy, damage, type, explosionRadius = 0, homing = false, slowDuration = 0, slowFactor = 1) {
        this.bullets.push(new Bullet(this, x, y, vx, vy, damage, type, explosionRadius, homing, slowDuration, slowFactor));
    }
    
    spawnEnemy() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 500 + Math.random() * 200;
        const x = Math.max(50, Math.min(GameConfig.MAP_WIDTH - 50, this.player.x + Math.cos(angle) * dist));
        const y = Math.max(50, Math.min(GameConfig.MAP_HEIGHT - 50, this.player.y + Math.sin(angle) * dist));
        
        let type = 'NORMAL';
        const rand = Math.random();
        if (this.gameTime > 60 && rand < 0.05) type = 'ELITE';
        else if (this.gameTime > 30 && rand < 0.2) type = 'TANK';
        else if (rand < 0.3) type = 'FAST';
        
        if (this.gameTime > 120 && Math.floor(this.gameTime / 120) > Math.floor((this.gameTime - 0.1) / 120)) {
            type = 'BOSS';
            soundManager.play('boss');
        }
        
        const enemy = new Enemy(this, x, y, type);
        // 应用关卡难度倍率 + 游戏难度倍率
        const totalMult = this.enemyMultiplier * (this.difficulty ? this.difficulty.hpMult : 1);
        const dmgMult = this.enemyMultiplier * (this.difficulty ? this.difficulty.dmgMult : 1);
        enemy.maxHp = Math.floor(enemy.maxHp * totalMult);
        enemy.hp = enemy.maxHp;
        enemy.damage = Math.floor(enemy.damage * dmgMult);
        this.enemies.push(enemy);
    }
    
    triggerExplosion(x, y, radius, color) {
        soundManager.play('explosion', 0.6);
        this.explosions.push({ x, y, radius, color, life: 0.4, maxLife: 0.4 });
        // 爆炸粒子
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: Math.random() < 0.5 ? color : 0xFFFF00,
                size: 4 + Math.random() * 5,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                graphics: this.add.circle(x, y, 4, color, 0.8)
            });
        }
        this.cameras.main.shake(100, 0.008);
    }
    
    updateExplosions(dt) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= dt;
            if (exp.life <= 0) {
                if (exp.graphics) exp.graphics.destroy();
                this.explosions.splice(i, 1);
                continue;
            }
            if (!exp.graphics) {
                exp.graphics = this.add.graphics();
            }
            const progress = 1 - exp.life / exp.maxLife;
            const r = exp.radius * progress;
            const alpha = exp.life / exp.maxLife;
            exp.graphics.clear();
            exp.graphics.lineStyle(4, exp.color, alpha);
            exp.graphics.strokeCircle(exp.x, exp.y, r);
            exp.graphics.fillStyle(exp.color, alpha * 0.3);
            exp.graphics.fillCircle(exp.x, exp.y, r * 0.8);
        }
    }
    
    updateLightningBolts(dt) {
        for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
            const bolt = this.lightningBolts[i];
            bolt.life -= dt;
            if (bolt.life <= 0) {
                if (bolt.graphics) bolt.graphics.destroy();
                this.lightningBolts.splice(i, 1);
                continue;
            }
            if (!bolt.graphics) bolt.graphics = this.add.graphics();
            const alpha = bolt.life / bolt.maxLife;
            bolt.graphics.clear();
            bolt.graphics.lineStyle(3, bolt.color, alpha);
            // 锯齿闪电路径
            const segments = 5;
            let px = bolt.x1, py = bolt.y1;
            for (let s = 1; s <= segments; s++) {
                const t = s / segments;
                const nx = bolt.x1 + (bolt.x2 - bolt.x1) * t + (Math.random() - 0.5) * 20;
                const ny = bolt.y1 + (bolt.y2 - bolt.y1) * t + (Math.random() - 0.5) * 20;
                bolt.graphics.lineBetween(px, py, nx, ny);
                px = nx; py = ny;
            }
            // 内芯
            bolt.graphics.lineStyle(1, 0xFFFFFF, alpha);
            bolt.graphics.lineBetween(bolt.x1, bolt.y1, bolt.x2, bolt.y2);
        }
    }
    
    spawnHitParticles(x, y, isCrit) {
        const count = isCrit ? 8 : 4;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            const color = Math.random() < 0.5 ? 0xFFFF00 : 0xFF6D00;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: 3 + Math.random() * 4,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                graphics: this.add.circle(x, y, 3, color, 0.8)
            });
        }
    }
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                p.graphics.destroy();
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            const alpha = p.life / p.maxLife;
            p.graphics.setPosition(p.x, p.y);
            p.graphics.setAlpha(alpha);
            p.graphics.setScale(p.size / 3 * alpha);
        }
    }
    
    addFloatingText(x, y, text, color, size) {
        const txt = this.add.text(x, y, text, { fontSize: `${size}px`, color: `#${color.toString(16).padStart(6, '0')}`, fontWeight: 'bold' })
            .setDepth(2000).setOrigin(0.5);
        this.floatingTexts.push({ text: txt, life: 0.8, maxLife: 0.8, vy: -80 });
    }
    
    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            if (ft.life <= 0) {
                ft.text.destroy();
                this.floatingTexts.splice(i, 1);
                continue;
            }
            ft.text.y += ft.vy * dt;
            ft.text.setAlpha(ft.life / ft.maxLife);
        }
    }
    
    onEnemyKilled(enemy) {
        this.killCount++;
        soundManager.play('death', 0.5);
        // 击杀语音（低频触发）
        if (enemy.type === 'BOSS') {
            soundManager.playVoice('kill');
        } else if (enemy.type === 'ELITE' && Math.random() < 0.15) {
            soundManager.playVoice('kill');
        } else if (Math.random() < 0.01) {
            soundManager.playVoice('kill');
        }
        const gemCount = enemy.type === 'BOSS' ? 10 : enemy.type === 'ELITE' ? 3 : 1;
        for (let i = 0; i < gemCount; i++) {
            const ox = (Math.random() - 0.5) * 30;
            const oy = (Math.random() - 0.5) * 30;
            this.xpGems.push(new XpGem(this, enemy.x + ox, enemy.y + oy, enemy.xpValue));
        }
        
        // 道具掉落
        const dropChance = enemy.type === 'BOSS' ? 1.0 : 
                          enemy.type === 'ELITE' ? 0.3 : 
                          enemy.type === 'TANK' ? 0.08 : 0.05;
        if (Math.random() < dropChance) {
            const itemTypes = Object.keys(ItemTypes);
            const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            this.items.push(new Item(this, enemy.x, enemy.y, randomType));
        }
        // Boss 额外掉1-2个道具
        if (enemy.type === 'BOSS') {
            for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
                const itemTypes = Object.keys(ItemTypes);
                const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                const ox = (Math.random() - 0.5) * 60;
                const oy = (Math.random() - 0.5) * 60;
                this.items.push(new Item(this, enemy.x + ox, enemy.y + oy, randomType));
            }
        }
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 150;
            this.particles.push({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: enemy.color,
                size: 4 + Math.random() * 5,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                graphics: this.add.circle(enemy.x, enemy.y, 4, enemy.color, 0.8)
            });
        }
    }
    
    showLevelUp() {
        this.gameState = 'levelup';
        this.rerollCount = 0;
        soundManager.play('levelup');
        soundManager.playVoice('levelup');
        this.generateLevelUpOptions();
        this.showLevelUpUI();
    }
    
    generateLevelUpOptions() {
        // 技能选项（未拥有的技能或可升级的技能）
        const skillOptions = [];
        const allSkills = SkillFactory.createAll();
        for (const skill of allSkills) {
            const owned = this.player.getSkill(skill.name);
            if (!owned || owned.canUpgrade) {
                skillOptions.push({
                    type: 'skill',
                    name: skill.name,
                    desc: owned ? `${skill.name} Lv.${owned.level} → Lv.${owned.level + 1}` : `新技能: ${skill.name}`,
                    skill: owned || skill,
                    isNew: !owned
                });
            }
        }
        
        // 属性选项
        const statOptions = [
            { type: 'stat', name: '攻击力', desc: '攻击力 +5', apply: () => { this.player.attack += 5; } },
            { type: 'stat', name: '最大生命', desc: '最大生命 +20', apply: () => { this.player.maxHp += 20; this.player.hp += 20; } },
            { type: 'stat', name: '移动速度', desc: '移动速度 +30', apply: () => { this.player.speed += 30; } },
            { type: 'stat', name: '攻击速度', desc: '攻击速度 +0.2', apply: () => { this.player.attackSpeed += 0.2; } },
            { type: 'stat', name: '拾取范围', desc: '拾取范围 +40', apply: () => { this.player.pickupRange += 40; } },
            { type: 'stat', name: '暴击率', desc: '暴击率 +5%', apply: () => { this.player.critChance += 0.05; } }
        ];
        
        // 合并并随机选3个
        const allOptions = [...skillOptions, ...statOptions];
        this.levelUpOptions = Phaser.Utils.Array.Shuffle(allOptions).slice(0, 3);
    }
    
    showLevelUpUI() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.levelUpBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setScrollFactor(0).setDepth(3000);
        this.add.text(w / 2, h * 0.15, '升级!', { fontSize: '48px', color: '#FFD700', fontWeight: 'bold' }).setScrollFactor(0).setDepth(3001).setOrigin(0.5);
        
        // 刷新按钮
        this.rerollBtn = this.add.rectangle(w - 60, h * 0.15, 80, 40, 0x4FC3F7, 0.8).setScrollFactor(0).setDepth(3001).setInteractive({ useHandCursor: true });
        this.rerollText = this.add.text(w - 60, h * 0.15, `刷新(${this.maxReroll - this.rerollCount})`, { fontSize: '14px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(3002).setOrigin(0.5);
        this.rerollBtn.on('pointerdown', () => {
            if (this.rerollCount < this.maxReroll) {
                this.rerollCount++;
                this.rerollText.setText(`刷新(${this.maxReroll - this.rerollCount})`);
                this.clearLevelUpCards();
                this.generateLevelUpOptions();
                this.renderLevelUpCards();
            }
        });
        
        this.renderLevelUpCards();
    }
    
    renderLevelUpCards() {
        const w = this.scale.width;
        const h = this.scale.height;
        const cardW = w * 0.25;
        const cardH = h * 0.3;
        const gap = w * 0.05;
        const startX = w / 2 - cardW - gap / 2;
        
        this.levelUpCards = [];
        for (let i = 0; i < this.levelUpOptions.length; i++) {
            const option = this.levelUpOptions[i];
            const x = startX + i * (cardW + gap);
            const y = h * 0.45;
            
            const card = this.add.rectangle(x, y, cardW, cardH, option.type === 'skill' ? 0x1A237E : 0x1B5E20, 0.9).setScrollFactor(0).setDepth(3001).setStrokeStyle(3, option.type === 'skill' ? 0x4FC3F7 : 0x66BB6A);
            card.setInteractive({ useHandCursor: true });
            card.on('pointerdown', () => {
                if (option.type === 'skill') {
                    this.player.addSkill(option.skill);
                } else {
                    option.apply();
                }
                this.closeLevelUpUI();
                this.gameState = 'playing';
            });
            
            this.add.text(x, y - cardH * 0.25, option.name, { fontSize: '22px', color: option.type === 'skill' ? '#4FC3F7' : '#66BB6A', fontWeight: 'bold' }).setScrollFactor(0).setDepth(3002).setOrigin(0.5);
            this.add.text(x, y + cardH * 0.1, option.desc, { fontSize: '14px', color: '#FFFFFF', align: 'center', wordWrap: { width: cardW * 0.8 } }).setScrollFactor(0).setDepth(3002).setOrigin(0.5);
            
            this.levelUpCards.push(card);
        }
    }
    
    clearLevelUpCards() {
        if (this.levelUpCards) {
            for (const card of this.levelUpCards) {
                card.destroy();
            }
        }
        // 清除卡片文字（depth 3002的非按钮文字）
        this.children.list.filter(c => c.depth === 3002 && c !== this.rerollText).forEach(c => c.destroy());
    }
    
    closeLevelUpUI() {
        if (this.levelUpBg) this.levelUpBg.destroy();
        if (this.rerollBtn) this.rerollBtn.destroy();
        if (this.rerollText) this.rerollText.destroy();
        this.clearLevelUpCards();
        this.children.list.filter(c => c.depth >= 3000).forEach(c => c.destroy());
    }
    
    updateHUD() {
        const w = this.scale.width;
        const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
        this.hpBar.width = w * 0.8 * hpRatio;
        this.hpText.setText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
        const xpRatio = this.player.xp / this.player.xpToNext;
        this.xpBar.width = w * 0.8 * xpRatio;
        this.levelText.setText(`Lv.${this.player.level}`);
        const remaining = Math.max(0, GameConfig.GAME_DURATION - this.gameTime);
        const min = Math.floor(remaining / 60);
        const sec = Math.floor(remaining % 60);
        this.timeText.setText(`${min}:${sec.toString().padStart(2, '0')}`);
        this.killText.setText(`击杀: ${this.killCount}`);
        // DPS 显示
        const dps = this.gameTime > 0 ? Math.floor(this.damageStats.total / this.gameTime) : 0;
        this.dpsText.setText(`DPS: ${dps}`);
        
        // 更新技能栏
        this.updateSkillBar();
        
        // 更新小地图
        this.updateMinimap();
    }
    
    updateSkillBar() {
        const skills = this.player.skills;
        const w = this.scale.width;
        const h = this.scale.height;
        const maxShow = 8;
        const slotSize = 36;
        const gap = 4;
        const totalWidth = Math.min(skills.length, maxShow) * (slotSize + gap) - gap;
        const startX = w/2 - totalWidth/2 + slotSize/2;
        const barY = h - 30;
        
        // 只在技能数量变化时重建
        const skillCount = Math.min(skills.length, maxShow);
        if (!this.skillBarElements || this.skillBarElements.length !== skillCount) {
            // 清理旧的
            if (this.skillBarElements) {
                for (const el of this.skillBarElements) {
                    el.bg.destroy();
                    el.text.destroy();
                    el.levelText.destroy();
                }
            }
            this.skillBarElements = [];
            
            const skillColors = {
                '能量弹': 0x4FC3F7, '飞刀': 0xBDBDBD, '火球': 0xFF7043,
                '闪电': 0xFFEB3B, '灼烧光环': 0xFF9800, '追踪导弹': 0x9C27B0,
                '冰锥术': 0x00BCD4, '旋风斩': 0x81C784
            };
            
            for (let i = 0; i < skillCount; i++) {
                const skill = skills[i];
                const x = startX + i * (slotSize + gap);
                const color = skillColors[skill.name] || 0x666666;
                
                const bg = this.add.rectangle(x, barY, slotSize, slotSize, color, 0.6)
                    .setScrollFactor(0).setDepth(999);
                const text = this.add.text(x, barY - 2, skill.name.charAt(0), {
                    fontSize: '16px', color: '#FFFFFF', fontWeight: 'bold'
                }).setScrollFactor(0).setDepth(1000).setOrigin(0.5);
                const levelText = this.add.text(x, barY + 12, 'Lv' + skill.level, {
                    fontSize: '9px', color: '#FFFFFF'
                }).setScrollFactor(0).setDepth(1000).setOrigin(0.5);
                
                this.skillBarElements.push({ bg, text, levelText, skillName: skill.name });
            }
        }
        
        // 每帧只更新等级和进化状态（轻量更新）
        for (let i = 0; i < this.skillBarElements.length; i++) {
            const el = this.skillBarElements[i];
            const skill = skills[i];
            if (!skill) continue;
            
            el.levelText.setText('Lv' + skill.level);
            if (skill.evolved) {
                el.bg.setFillStyle(skillColors[skill.name] || 0x666666, 0.9);
                el.bg.setStrokeStyle(3, 0xFFD700, 0.9);
                el.levelText.setColor('#FFD700');
            } else {
                el.bg.setFillStyle(skillColors[skill.name] || 0x666666, 0.6);
                el.bg.setStrokeStyle(1, 0xFFFFFF, 0.4);
                el.levelText.setColor('#FFFFFF');
            }
        }
    }
    
    updateMinimap() {
        if (!this.minimapGraphics) return;
        this.minimapGraphics.clear();
        
        const scale = this.minimapSize / GameConfig.MAP_WIDTH;
        
        // 绘制怪物（红色点）
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const mx = this.minimapX + e.x * scale;
            const my = this.minimapY + e.y * scale;
            const color = e.type === 'BOSS' ? 0xFF00FF : e.type === 'ELITE' ? 0xFFA500 : 0xFF4444;
            const size = e.type === 'BOSS' ? 4 : e.type === 'ELITE' ? 3 : 2;
            this.minimapGraphics.fillStyle(color, 0.8);
            this.minimapGraphics.fillCircle(mx, my, size);
        }
        
        // 绘制道具（黄色点）
        for (const item of this.items) {
            if (!item.alive) continue;
            const mx = this.minimapX + item.x * scale;
            const my = this.minimapY + item.y * scale;
            this.minimapGraphics.fillStyle(0xFFFF00, 0.8);
            this.minimapGraphics.fillCircle(mx, my, 2);
        }
        
        // 绘制玩家（绿色点，带白边）
        const px = this.minimapX + this.player.x * scale;
        const py = this.minimapY + this.player.y * scale;
        this.minimapGraphics.fillStyle(0xFFFFFF, 1);
        this.minimapGraphics.fillCircle(px, py, 4);
        this.minimapGraphics.fillStyle(0x4CAF50, 1);
        this.minimapGraphics.fillCircle(px, py, 3);
    }
    
    cleanupEntities() {
        this.enemies = this.enemies.filter(e => {
            if (!e.alive) { e.destroy(); return false; }
            return true;
        });
        this.bullets = this.bullets.filter(b => {
            if (!b.alive) { b.destroy(); return false; }
            return true;
        });
        this.xpGems = this.xpGems.filter(g => {
            if (!g.alive) { g.destroy(); return false; }
            return true;
        });
        this.items = this.items.filter(i => {
            if (!i.alive) { i.destroy(); return false; }
            return true;
        });
    }
    
    // 添加 Buff
    addBuff(type, duration) {
        this.buffManager.add(type, duration);
        const config = ItemTypes[type];
        if (config) {
            this.showFloatingText(this.player.x, this.player.y - 50, config.name + '!', config.color);
        }
    }
    
    // 应用 Buff 效果
    applyBuffs(dt) {
        // 重置临时加成
        this.player.damageMultiplier = this.buffManager.has('DOUBLE_DAMAGE') ? 2 : 1;
        this.player.speedMultiplier = this.buffManager.has('SPEED_BOOST') ? 1.5 : 1;
        this.player.attackSpeedMultiplier = this.buffManager.has('ATTACK_SPEED') ? 1.5 : 1;
        this.player.magnetActive = this.buffManager.has('MAGNET');
        
        // 磁铁效果：自动吸取经验
        if (this.player.magnetActive) {
            for (const gem of this.xpGems) {
                if (gem.alive) {
                    const dx = this.player.x - gem.x;
                    const dy = this.player.y - gem.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 300 && dist > 0) {
                        gem.x += (dx / dist) * 400 * dt;
                        gem.y += (dy / dist) * 400 * dt;
                    }
                }
            }
        }
    }
    
    // 添加金币
    addGold(amount) {
        gameState.data.gold = (gameState.data.gold || 0) + amount;
        gameState.save();
        this.showFloatingText(this.player.x, this.player.y - 50, '+' + amount + ' 金币', 0xFFC107);
    }
    
    gameOver() {
        this.gameState = 'gameover';
        soundManager.play('hurt');
        // 记录统计和奖励金币
        gameState.recordGame(false, this.gameTime);
        gameState.addKill(this.killCount);
        const coins = Math.floor(this.killCount * 0.5 + this.gameTime * 0.1);
        gameState.addCoins(coins);
        
        const w = this.scale.width;
        const h = this.scale.height;
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.8).setScrollFactor(0).setDepth(4000);
        this.add.text(w / 2, h * 0.25, '游戏结束', { fontSize: '64px', color: '#E53935', fontWeight: 'bold' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.38, `存活时间: ${Math.floor(this.gameTime / 60)}分${Math.floor(this.gameTime % 60)}秒`, { fontSize: '20px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.44, `击杀数: ${this.killCount}`, { fontSize: '20px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.50, `获得金币: +${coins}💰`, { fontSize: '22px', color: '#FFD700' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.65, '点击重新开始', { fontSize: '24px', color: '#4FC3F7' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.73, '返回主菜单', { fontSize: '18px', color: '#888888' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.input.once('pointerdown', (pointer) => {
            if (pointer.y < h * 0.69) {
                this.scene.restart();
            } else {
                this.scene.start('MenuScene');
            }
        });
    }
    
    victory() {
        this.gameState = 'victory';
        soundManager.play('victory');
        soundManager.playVoice('ultimate');
        // 记录统计、通关奖励和金币
        gameState.recordGame(true, this.gameTime);
        gameState.addKill(this.killCount);
        gameState.clearLevel(this.level.id);
        const goldMult = this.difficulty ? this.difficulty.goldMult : 1;
        const coins = Math.floor((this.killCount * 1 + this.gameTime * 0.2 + this.level.reward) * goldMult);
        gameState.addCoins(coins);
        
        const w = this.scale.width;
        const h = this.scale.height;
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.8).setScrollFactor(0).setDepth(4000);
        this.add.text(w / 2, h * 0.25, '胜利!', { fontSize: '72px', color: '#FFD700', fontWeight: 'bold' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.37, `通关: ${this.level.name}`, { fontSize: '22px', color: '#4FC3F7' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.43, `击杀数: ${this.killCount}`, { fontSize: '20px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.49, `等级: ${this.player.level}`, { fontSize: '18px', color: '#BDBDBD' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.56, `获得金币: +${coins}💰`, { fontSize: '24px', color: '#FFD700' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.68, '点击重新开始', { fontSize: '22px', color: '#4FC3F7' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w / 2, h * 0.75, '返回主菜单', { fontSize: '18px', color: '#888888' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.input.once('pointerdown', (pointer) => {
            if (pointer.y < h * 0.71) {
                this.scene.restart();
            } else {
                this.scene.start('MenuScene');
            }
        });
    }
}
