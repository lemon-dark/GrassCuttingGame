import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Bullet, XpGem } from '../entities/Bullet.js';
import { Item, ItemTypes, BuffManager } from '../entities/Item.js';
import { RelicTypes, RelicManager } from '../entities/Relic.js';
import { ExtraFeaturesManager, UltimateSkills, ShopItems } from '../systems/ExtraFeatures.js';
import { SkillFactory, KnifeSkill, FireballSkill, LightningSkill, AuraSkill, MissileSkill, IceSpikeSkill, WhirlwindSkill } from '../skills/Skills.js';
import { gameState } from '../state/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { BackgroundImages } from '../assets/backgrounds.js';
import { BackgroundGenerator } from '../utils/BackgroundGenerator.js';
import { SpriteLoader } from '../utils/SpriteLoader.js';
import { ParticleTextures } from '../assets/particleTextures.js';

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
        
        // 先加载所有 sprite sheet 和动画，完成后再初始化游戏（确保角色纹理已就绪）
        SpriteLoader.loadAll(this, () => {
            this.initGame();
        });
    }
    
    initGame() {
        // 移除加载中文字
        if (this.loadingText) {
            this.loadingText.destroy();
            this.loadingText = null;
        }
        
        // 加载粒子贴图到纹理系统（Kenney CC0）
        this.particleTexturesLoaded = false;
        let loadedCount = 0;
        const textureKeys = Object.keys(ParticleTextures);
        for (const key of textureKeys) {
            const img = new Image();
            img.onload = () => {
                if (!this.textures.exists(key)) {
                    this.textures.addImage(key, img);
                }
                loadedCount++;
                if (loadedCount >= textureKeys.length) {
                    this.particleTexturesLoaded = true;
                }
            };
            img.src = ParticleTextures[key];
        }
        
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
        this.enemyBullets = [];
        this.xpGems = [];
        this.items = [];
        this.chests = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lightningBolts = [];
        this.explosions = [];
        // 战斗手感系统
        this.hitStop = 0;      // 命中停顿时间（秒）
        this.slowMotion = 0;   // 慢动作时间（秒）
        this.screenShake = 0;  // 屏幕震动强度
        this.buffManager = new BuffManager();
        this.relicManager = new RelicManager();
        this.extraFeatures = new ExtraFeaturesManager(this);
        this.gold = 0;
        this.damageStats = { total: 0, bySkill: {}, startTime: 0 };
        // 波次事件
        this.waveEvents = [];
        this.nextWaveTime = 120; // 2分钟后第一次波次
        
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
        
        // 大招按钮（右下角）
        this.ultimateBtn = this.add.circle(w - 60, this.scale.height - 80, 35, 0x9C27B0, 0.8)
            .setScrollFactor(0).setDepth(999)
            .setStrokeStyle(3, 0xFFD700, 0.8)
            .setInteractive({ useHandCursor: true });
        this.ultimateText = this.add.text(w - 60, this.scale.height - 80, '☄️', { fontSize: '24px' })
            .setScrollFactor(0).setDepth(1000).setOrigin(0.5);
        this.ultimateCooldownText = this.add.text(w - 60, this.scale.height - 80, '', { fontSize: '14px', color: '#FFFFFF', fontWeight: 'bold' })
            .setScrollFactor(0).setDepth(1001).setOrigin(0.5);
        this.ultimateBtn.on('pointerdown', () => {
            if (this.extraFeatures.castUltimate()) {
                soundManager.play('boss');
            }
        });
        
        // 商店按钮（大招按钮上方）
        this.shopBtn = this.add.rectangle(w - 60, this.scale.height - 140, 50, 40, 0xFF9800, 0.8)
            .setScrollFactor(0).setDepth(999)
            .setStrokeStyle(2, 0xFFD700, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(w - 60, this.scale.height - 140, '🛒', { fontSize: '20px' })
            .setScrollFactor(0).setDepth(1000).setOrigin(0.5);
        this.shopBtn.on('pointerdown', () => {
            soundManager.play('click');
            this.showShop();
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
        this.skillBarBg = this.add.rectangle(w/2, h - 28, w * 0.95, 50, 0x000000, 0.5)
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
        let dt = delta / 1000;
        
        if (this.paused) return;
        
        // 更新技能预览动画（仅在升级界面时更新）
        if (this.gameState === 'levelup' && this.skillPreviews && this.skillPreviews.length > 0) {
            try {
                for (const preview of this.skillPreviews) {
                    if (preview.graphics && preview.graphics.active) {
                        preview.time += dt;
                        this.drawSkillPreview(preview);
                    }
                }
            } catch (e) {
                console.error('技能预览动画错误:', e);
            }
        }
        
        if (this.gameState === 'playing') {
            // 命中停顿系统：击杀时短暂冻结游戏，增强打击感
            // 关键修复：用原始delta/1000减少hitStop，否则dt=0时hitStop永远不会减少，导致游戏永久卡死
            if (this.hitStop > 0) {
                this.hitStop -= delta / 1000;
                dt = 0;  // 游戏逻辑完全冻结
            }
            // BOSS击杀慢动作：时间减速到30%
            if (this.slowMotion > 0) {
                this.slowMotion -= delta / 1000;
                dt *= 0.3;
            }
            
            try {
                this.gameTime += dt;
                
                if (this.gameTime >= GameConfig.GAME_DURATION) {
                    this.victory();
                    return;
                }
                
                this.player.update(dt);
            
            // 更新所有技能（关键：之前缺失，导致所有技能都没有实装）
            for (const skill of this.player.skills) {
                skill.update(this.player, this, dt);
            }
            
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
                    // 受击屏幕震动
                    this.cameras.main.shake(100, 0.005);
                    if (dead) { this.gameOver(); return; }
                }
            }
            
            // 更新敌人子弹
            for (const bullet of this.enemyBullets) {
                if (!bullet.alive) continue;
                bullet.x += bullet.vx * dt;
                bullet.y += bullet.vy * dt;
                bullet.graphics.setPosition(bullet.x, bullet.y);
                // 碰撞玩家
                if (Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y) < bullet.radius + this.player.radius) {
                    bullet.alive = false;
                    bullet.graphics.destroy();
                    const dead = this.player.takeDamage(bullet.damage);
                    soundManager.play('hurt', 0.5);
                    // 受击屏幕震动
                    this.cameras.main.shake(80, 0.004);
                    if (dead) { this.gameOver(); return; }
                }
                // 超出地图销毁
                if (bullet.x < 0 || bullet.x > GameConfig.MAP_WIDTH || bullet.y < 0 || bullet.y > GameConfig.MAP_HEIGHT) {
                    bullet.alive = false;
                    bullet.graphics.destroy();
                }
            }
            this.enemyBullets = this.enemyBullets.filter(b => b.alive);
            
            // 波次事件
            this.updateWaveEvents(dt);
            
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
                        
                        this.addFloatingText(enemy.x, enemy.y - enemy.radius, Math.floor(dmg).toString(), isCrit ? 0xFFD700 : 0xFFFFFF, isCrit ? 28 : 18, isCrit);
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
                    if (leveledUp) {
                        this.showLevelUp();
                        break; // 关键修复：升级后立即停止循环，避免多次触发升级UI
                    }
                }
            }
            
            // 更新道具
            for (const item of this.items) {
                item.update(dt, this.player);
                if (this.gameState !== 'playing') break; // 升级后停止循环
            }
            
            // 宝箱拾取检测
            for (const chest of this.chests) {
                if (!chest.alive) continue;
                const dist = Math.hypot(chest.x - this.player.x, chest.y - this.player.y);
                if (dist < 50) {
                    this.openChest(chest);
                    break; // 打开宝箱后停止循环，避免多次触发升级UI
                }
            }
            this.chests = this.chests.filter(c => c.alive);
            
            // 更新 Buff
            this.buffManager.update(dt);
            // 应用 Buff 效果
            this.applyBuffs(dt);
            
            // 更新大招冷却
            this.extraFeatures.updateUltimate(dt);
            
            // 剑刃风暴大招效果（持续伤害周围敌人）
            if (this.bladeStormActive) {
                this.bladeStormTimer -= dt;
                if (this.bladeStormTimer <= 0) {
                    this.bladeStormActive = false;
                } else {
                    // 每0.2秒对周围200px内敌人造成80伤害
                    this.bladeStormTick = (this.bladeStormTick || 0) + dt;
                    if (this.bladeStormTick >= 0.2) {
                        this.bladeStormTick = 0;
                        for (const e of this.enemies) {
                            if (!e.alive) continue;
                            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 200) {
                                e.takeDamage(80);
                                this.addFloatingText(e.x, e.y - e.radius, '80', 0x81C784, 16);
                            }
                        }
                    }
                }
            }
            
            if (this.ultimateCooldownText) {
                if (this.extraFeatures.ultimateReady) {
                    this.ultimateCooldownText.setText('');
                    this.ultimateBtn.setFillStyle(0x9C27B0, 0.8);
                } else {
                    this.ultimateCooldownText.setText(Math.ceil(this.extraFeatures.ultimateCooldown));
                    this.ultimateBtn.setFillStyle(0x555555, 0.6);
                }
            }
            
            // 更新粒子
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
            this.updateLightningBolts(dt);
            this.updateExplosions(dt);
            
            // 渲染技能特效（飞刀/光环/旋风斩）
            this.renderSkillEffects();
            
            this.cleanupEntities();
            this.updateHUD();
            } catch (e) {
                console.error('游戏更新错误:', e);
                // 错误后继续游戏，不完全卡死
                this.gameState = 'playing';
            }
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
    
    // 在指定位置生成怪物（用于召唤、分裂等）
    spawnEnemyAt(x, y, type) {
        const enemy = new Enemy(this, x, y, type);
        const totalMult = this.enemyMultiplier * (this.difficulty ? this.difficulty.hpMult : 1);
        const dmgMult = this.enemyMultiplier * (this.difficulty ? this.difficulty.dmgMult : 1);
        enemy.maxHp = Math.floor(enemy.maxHp * totalMult);
        enemy.hp = enemy.maxHp;
        enemy.damage = Math.floor(enemy.damage * dmgMult);
        this.enemies.push(enemy);
    }
    
    // 敌人远程攻击子弹
    spawnEnemyBullet(x, y, targetX, targetY, damage) {
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 200;
        const bullet = {
            x, y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            damage,
            radius: 8,
            alive: true,
            isEnemy: true,
            graphics: this.add.circle(x, y, 8, 0xFF5722, 0.9).setDepth(4).setStrokeStyle(2, 0xFFC107, 0.8)
        };
        this.enemyBullets = this.enemyBullets || [];
        this.enemyBullets.push(bullet);
    }
    
    // 波次事件
    updateWaveEvents(dt) {
        if (this.gameTime >= this.nextWaveTime) {
            this.nextWaveTime += 120; // 每2分钟一次
            const waveType = Math.random() < 0.6 ? 'elite' : 'boss';
            
            if (waveType === 'elite') {
                // 精英潮：生成5-8个精英怪
                this.addFloatingText(this.player.x, this.player.y - 80, '⚠️ 精英潮来袭!', '#FF9800', 32);
                soundManager.play('boss');
                const count = 5 + Math.floor(Math.random() * 4);
                for (let i = 0; i < count; i++) {
                    this.time.delayedCall(i * 300, () => {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 400 + Math.random() * 200;
                        this.spawnEnemyAt(
                            this.player.x + Math.cos(angle) * dist,
                            this.player.y + Math.sin(angle) * dist,
                            'ELITE'
                        );
                    });
                }
            } else {
                // Boss战
                this.addFloatingText(this.player.x, this.player.y - 80, '👹 BOSS出现!', '#F44336', 36);
                soundManager.play('boss');
                const angle = Math.random() * Math.PI * 2;
                this.spawnEnemyAt(
                    this.player.x + Math.cos(angle) * 500,
                    this.player.y + Math.sin(angle) * 500,
                    'BOSS'
                );
            }
        }
    }
    
    // 宝箱掉落
    spawnChest(x, y) {
        const chest = {
            x, y,
            alive: true,
            opened: false,
            graphics: this.add.rectangle(x, y, 40, 30, 0x8D6E63, 0.95)
                .setDepth(8)
                .setStrokeStyle(3, 0xFFD700, 0.8),
            glow: this.add.circle(x, y, 30, 0xFFD700, 0.15).setDepth(7)
        };
        // 宝箱盖子
        this.add.rectangle(x, y - 8, 40, 12, 0xA1887F, 0.95).setDepth(9);
        this.add.text(x, y, '?', { fontSize: '20px', color: '#FFD700', fontWeight: 'bold' }).setDepth(10).setOrigin(0.5);
        this.chests.push(chest);
    }
    
    // 打开宝箱（三选一）
    openChest(chest) {
        chest.opened = true;
        chest.alive = false;
        chest.graphics.destroy();
        chest.glow.destroy();
        soundManager.play('levelup');
        
        // 生成三选一选项（技能/遗物/属性）
        this.generateLevelUpOptions();
        this.showLevelUpUI();
        this.addFloatingText(chest.x, chest.y - 30, '宝箱已开启!', '#FFD700', 20);
    }
    
    // 商店界面
    showShop() {
        if (this.gameState === 'shop') return;
        this.gameState = 'shop';
        const w = this.scale.width;
        const h = this.scale.height;
        
        this.shopBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8).setScrollFactor(0).setDepth(4000);
        this.add.text(w/2, h*0.1, '🛒 商店', { fontSize: '32px', color: '#FFD700', fontWeight: 'bold' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        this.add.text(w - 80, h*0.1, `💰 ${this.gold}`, { fontSize: '18px', color: '#FFD700' }).setScrollFactor(0).setDepth(4001).setOrigin(0.5);
        
        // 关闭按钮
        const closeBtn = this.add.rectangle(50, 40, 80, 40, 0x333333, 0.8).setScrollFactor(0).setDepth(4001).setStrokeStyle(2, 0xFFFFFF, 0.5).setInteractive({ useHandCursor: true });
        this.add.text(50, 40, '关闭', { fontSize: '16px', color: '#FFFFFF' }).setScrollFactor(0).setDepth(4002).setOrigin(0.5);
        closeBtn.on('pointerdown', () => {
            soundManager.play('click');
            this.closeShop();
        });
        
        // 商品列表
        let y = h * 0.2;
        this.shopItems = [];
        for (const item of ShopItems) {
            const canAfford = this.gold >= item.price;
            const card = this.add.rectangle(w/2, y, w*0.85, h*0.09, 0x1a1a2a, 0.95).setScrollFactor(0).setDepth(4001).setStrokeStyle(2, canAfford ? 0xFFD700 : 0x555555, canAfford ? 0.8 : 0.3);
            this.add.text(w*0.15, y, item.icon, { fontSize: '24px' }).setScrollFactor(0).setDepth(4002).setOrigin(0.5);
            this.add.text(w*0.25, y - 10, item.name, { fontSize: '15px', color: '#FFFFFF', fontWeight: 'bold' }).setScrollFactor(0).setDepth(4002).setOrigin(0, 0.5);
            this.add.text(w*0.25, y + 10, item.desc, { fontSize: '11px', color: '#AAAAAA' }).setScrollFactor(0).setDepth(4002).setOrigin(0, 0.5);
            
            const buyBtn = this.add.rectangle(w*0.82, y, w*0.15, h*0.06, canAfford ? 0x4CAF50 : 0x555555, 0.8).setScrollFactor(0).setDepth(4002).setStrokeStyle(2, canAfford ? 0x81C784 : 0x777777, 0.5).setInteractive({ useHandCursor: canAfford });
            this.add.text(w*0.82, y, `💰${item.price}`, { fontSize: '13px', color: canAfford ? '#FFFFFF' : '#888888' }).setScrollFactor(0).setDepth(4003).setOrigin(0.5);
            
            if (canAfford) {
                buyBtn.on('pointerdown', () => {
                    if (this.extraFeatures.buyItem(item.id)) {
                        soundManager.play('levelup');
                        this.closeShop();
                        this.showShop(); // 刷新商店
                    }
                });
            }
            
            y += h * 0.1;
        }
    }
    
    closeShop() {
        this.gameState = 'playing';
        this.shopBg?.destroy();
        // 清理商店元素
        this.children.list.filter(c => c.depth >= 4000 && c.depth < 5000).forEach(c => c.destroy());
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
        const count = isCrit ? 10 : 5;
        const textures = isCrit ? ['spark_01','spark_02','spark_03','star_01','muzzle_01'] : ['spark_01','spark_02','muzzle_01'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 200;
            const texKey = textures[Math.floor(Math.random() * textures.length)];
            const size = 8 + Math.random() * 12;
            // 优先用贴图，失败则回退到circle
            let graphics;
            if (this.particleTexturesLoaded && this.textures.exists(texKey)) {
                graphics = this.add.image(x, y, texKey).setDepth(1500).setTint(0xFFFF00);
            } else {
                graphics = this.add.circle(x, y, 3, 0xFFFF00, 0.8).setDepth(1500);
            }
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: 0xFFFF00,
                size: size,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                graphics: graphics,
                useTexture: this.particleTexturesLoaded && this.textures.exists(texKey)
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
            // 贴图粒子用 size/20 作为基础缩放，circle 粒子用 size/3
            const scale = p.useTexture ? (p.size / 20) * alpha : (p.size / 3) * alpha;
            p.graphics.setScale(scale);
        }
    }
    
    addFloatingText(x, y, text, color, size, isCrit = false) {
        const txt = this.add.text(x, y, text, { 
            fontSize: `${size}px`, 
            color: `#${color.toString(16).padStart(6, '0')}`, 
            fontWeight: 'bold',
            stroke: isCrit ? '#000000' : null,
            strokeThickness: isCrit ? 3 : 0
        }).setDepth(2000).setOrigin(0.5);
        
        // 暴击数字：更大、带描边、弹出动画
        if (isCrit) {
            txt.setScale(1.5);
            this.tweens.add({
                targets: txt,
                scale: 1.0,
                duration: 200,
                ease: 'Back.Out'
            });
        } else {
            // 普通伤害数字：轻微弹出
            txt.setScale(0.8);
            this.tweens.add({
                targets: txt,
                scale: 1.0,
                duration: 100,
                ease: 'Quad.Out'
            });
        }
        
        this.floatingTexts.push({ 
            text: txt, 
            life: 0.8, 
            maxLife: 0.8, 
            vy: isCrit ? -120 : -80,
            isCrit: isCrit
        });
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
            // 暴击数字：快速上升后减速
            if (ft.isCrit) {
                ft.vy *= 0.95;
            }
            ft.text.setAlpha(ft.life / ft.maxLife);
        }
    }
    
    onEnemyKilled(enemy) {
        this.killCount++;
        soundManager.play('death', 0.5);
        
        // === 战斗手感：命中停顿 ===
        // 小怪：0.04秒短暂停顿；精英：0.08秒；BOSS：1.5秒慢动作
        if (enemy.type === 'BOSS') {
            this.slowMotion = 1.5;
            this.hitStop = 0.15;
            // BOSS击杀：强屏幕震动+镜头缩放
            this.cameras.main.shake(800, 0.015);
            this.cameras.main.zoomTo(1.2, 300, 'Power2');
            this.time.delayedCall(800, () => {
                this.cameras.main.zoomTo(1.0, 500, 'Power2');
            });
        } else if (enemy.type === 'ELITE') {
            this.hitStop = Math.max(this.hitStop, 0.08);
            this.cameras.main.shake(150, 0.008);
        } else {
            // 小怪只在同时击杀多个时才停顿，避免频繁卡顿
            if (this.hitStop < 0.02) {
                this.hitStop = 0.025;
            }
        }
        
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
        
        // 宝箱掉落（精英30%，Boss100%）
        const chestChance = enemy.type === 'BOSS' ? 1.0 : enemy.type === 'ELITE' ? 0.3 : 0;
        if (Math.random() < chestChance) {
            this.spawnChest(enemy.x, enemy.y);
        }
        // === 战斗手感：击杀粒子特效（用Kenney贴图代替代码圆点）===
        const particleCount = enemy.type === 'BOSS' ? 30 : enemy.type === 'ELITE' ? 18 : 10;
        // 不同类型敌人用不同粒子贴图
        let texPool;
        if (enemy.type === 'BOSS') {
            texPool = ['smoke_01','smoke_02','smoke_03','fire_01','flame_01','flame_02','magic_01','star_01','star_02','spark_01'];
        } else if (enemy.type === 'ELITE') {
            texPool = ['smoke_01','smoke_02','fire_01','flame_01','spark_01','spark_02','magic_01'];
        } else {
            texPool = ['smoke_01','smoke_02','spark_01','spark_02','light_01'];
        }
        const tintColors = enemy.type === 'BOSS' ? [0xFFD700, 0xFF6D00, 0xFF5722, 0xFFFFFF] :
                           enemy.type === 'ELITE' ? [0xFFA500, 0xFF6D00, 0xFFFFFF] :
                           [enemy.color, 0xFFFFFF, 0xFFEB3B];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (60 + Math.random() * 180) * (enemy.type === 'BOSS' ? 1.5 : 1);
            const color = tintColors[Math.floor(Math.random() * tintColors.length)];
            const size = (10 + Math.random() * 15) * (enemy.type === 'BOSS' ? 1.3 : 1);
            const texKey = texPool[Math.floor(Math.random() * texPool.length)];
            // 优先用贴图，失败则回退到circle
            let graphics;
            let useTexture = false;
            if (this.particleTexturesLoaded && this.textures.exists(texKey)) {
                graphics = this.add.image(enemy.x, enemy.y, texKey).setDepth(1500).setTint(color);
                useTexture = true;
            } else {
                graphics = this.add.circle(enemy.x, enemy.y, size/3, color, 0.9).setDepth(1500);
            }
            this.particles.push({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: size,
                life: 0.4 + Math.random() * 0.4,
                maxLife: 0.8,
                graphics: graphics,
                useTexture: useTexture
            });
        }
        
        // 精英/BOSS额外：冲击波圆环
        if (enemy.type === 'ELITE' || enemy.type === 'BOSS') {
            const ringRadius = enemy.type === 'BOSS' ? 150 : 80;
            const ringColor = enemy.type === 'BOSS' ? 0xFFD700 : 0xFFA500;
            this.explosions.push({
                x: enemy.x, y: enemy.y,
                radius: ringRadius,
                color: ringColor,
                life: 0.4, maxLife: 0.4,
                graphics: null
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
        
        // 遗物选项（被动技能，30%概率出现）
        let relicOptions = [];
        if (Math.random() < 0.3 && this.relicManager) {
            const relicKeys = this.relicManager.getRandomRelics(2);
            relicOptions = relicKeys.map(key => {
                const relic = RelicTypes[key];
                return {
                    type: 'relic',
                    name: relic.icon + ' ' + relic.name,
                    desc: relic.desc,
                    relicKey: key,
                    apply: () => { this.relicManager.addRelic(this, this.player, key); }
                };
            });
        }
        
        // 合并并随机选3个
        const allOptions = [...skillOptions, ...statOptions, ...relicOptions];
        this.levelUpOptions = Phaser.Utils.Array.Shuffle(allOptions).slice(0, 3);
    }
    
    showLevelUpUI() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        // 关键修复：先清理之前的升级UI，避免重复创建导致内存泄漏和卡死
        this.closeLevelUpUI();
        
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
        const cardH = h * 0.35;  // 稍微加高，给预览动画留空间
        const gap = w * 0.05;
        const startX = w / 2 - cardW - gap / 2;
        
        this.levelUpCards = [];
        this.skillPreviews = [];  // 技能预览动画列表
        
        for (let i = 0; i < this.levelUpOptions.length; i++) {
            const option = this.levelUpOptions[i];
            const x = startX + i * (cardW + gap);
            const y = h * 0.48;
            
            const cardColor = option.type === 'skill' ? 0x1A237E : option.type === 'relic' ? 0x4A148C : 0x1B5E20;
            const borderColor = option.type === 'skill' ? 0x4FC3F7 : option.type === 'relic' ? 0xCE93D8 : 0x66BB6A;
            const textColor = option.type === 'skill' ? '#4FC3F7' : option.type === 'relic' ? '#CE93D8' : '#66BB6A';
            
            const card = this.add.rectangle(x, y, cardW, cardH, cardColor, 0.9).setScrollFactor(0).setDepth(3001).setStrokeStyle(3, borderColor);
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
            
            // 技能名称（顶部）
            this.add.text(x, y - cardH * 0.35, option.name, { fontSize: '18px', color: textColor, fontWeight: 'bold' }).setScrollFactor(0).setDepth(3002).setOrigin(0.5);
            
            // 技能预览动画区域（中间）
            if (option.type === 'skill') {
                const previewGraphics = this.add.graphics().setScrollFactor(0).setDepth(3002);
                const previewData = {
                    graphics: previewGraphics,
                    skillName: option.skill.name,
                    centerX: x,
                    centerY: y - cardH * 0.05,
                    size: Math.min(cardW * 0.35, 50),
                    time: 0
                };
                this.skillPreviews.push(previewData);
            }
            
            // 技能描述（底部）
            this.add.text(x, y + cardH * 0.28, option.desc, { fontSize: '12px', color: '#FFFFFF', align: 'center', wordWrap: { width: cardW * 0.8 } }).setScrollFactor(0).setDepth(3002).setOrigin(0.5);
            
            this.levelUpCards.push(card);
        }
    }
    
    // 绘制技能预览动画
    drawSkillPreview(preview) {
        const g = preview.graphics;
        const cx = preview.centerX;
        const cy = preview.centerY;
        const s = preview.size;
        const t = preview.time;
        
        g.clear();
        
        switch (preview.skillName) {
            case '能量弹': {
                // 3个小球围绕中心旋转并射出
                for (let i = 0; i < 3; i++) {
                    const angle = t * 2 + i * (Math.PI * 2 / 3);
                    const dist = s * (0.3 + (Math.sin(t * 3 + i) + 1) * 0.35);
                    const x = cx + Math.cos(angle) * dist;
                    const y = cy + Math.sin(angle) * dist;
                    g.fillStyle(0x4FC3F7, 0.9);
                    g.fillCircle(x, y, 4);
                    g.fillStyle(0x81D4FA, 0.4);
                    g.fillCircle(x, y, 7);
                }
                break;
            }
            case '飞刀': {
                // 3把飞刀围绕中心旋转（直接计算旋转坐标，不用translate/rotate）
                for (let i = 0; i < 3; i++) {
                    const angle = t * 3 + i * (Math.PI * 2 / 3);
                    const x = cx + Math.cos(angle) * s * 0.7;
                    const y = cy + Math.sin(angle) * s * 0.7;
                    const rot = angle + Math.PI / 2;
                    const cos = Math.cos(rot), sin = Math.sin(rot);
                    // 三角形三个顶点旋转后坐标
                    const p1x = x + (0 * cos - (-8) * sin);
                    const p1y = y + (0 * sin + (-8) * cos);
                    const p2x = x + (4 * cos - 4 * sin);
                    const p2y = y + (4 * sin + 4 * cos);
                    const p3x = x + (-4 * cos - 4 * sin);
                    const p3y = y + (-4 * sin + 4 * cos);
                    g.fillStyle(0xE0E0E0, 1);
                    g.beginPath();
                    g.moveTo(p1x, p1y);
                    g.lineTo(p2x, p2y);
                    g.lineTo(p3x, p3y);
                    g.closePath();
                    g.fillPath();
                }
                break;
            }
            case '火球': {
                // 火球射出+爆炸循环
                const cycle = (t % 2) / 2;
                if (cycle < 0.6) {
                    // 射出阶段
                    const dist = s * 0.2 + cycle * s * 1.2;
                    const x = cx + dist;
                    const y = cy;
                    g.fillStyle(0xFFAB40, 0.5);
                    g.fillCircle(x, y, 10);
                    g.fillStyle(0xFF6D00, 1);
                    g.fillCircle(x, y, 6);
                    g.fillStyle(0xFFFF00, 0.8);
                    g.fillCircle(x, y, 3);
                } else {
                    // 爆炸阶段
                    const exp = (cycle - 0.6) / 0.4;
                    const r = s * 0.3 + exp * s * 0.8;
                    const alpha = 1 - exp;
                    g.lineStyle(3, 0xFF6D00, alpha);
                    g.strokeCircle(cx + s * 0.8, cy, r);
                    g.fillStyle(0xFFAB40, alpha * 0.3);
                    g.fillCircle(cx + s * 0.8, cy, r * 0.8);
                }
                break;
            }
            case '闪电': {
                // 闪电周期性闪烁
                const flash = Math.sin(t * 8) > 0;
                if (flash) {
                    for (let i = 0; i < 3; i++) {
                        const angle = i * (Math.PI * 2 / 3) + t * 0.5;
                        const ex = cx + Math.cos(angle) * s * 0.8;
                        const ey = cy + Math.sin(angle) * s * 0.8;
                        g.lineStyle(2, 0xFFFF00, 0.9);
                        // 锯齿闪电
                        let px = cx, py = cy;
                        for (let j = 1; j <= 4; j++) {
                            const tt = j / 4;
                            const nx = cx + (ex - cx) * tt + (Math.random() - 0.5) * 8;
                            const ny = cy + (ey - cy) * tt + (Math.random() - 0.5) * 8;
                            g.lineBetween(px, py, nx, ny);
                            px = nx; py = ny;
                        }
                    }
                }
                break;
            }
            case '灼烧光环': {
                // 光环脉动
                const pulse = 0.7 + Math.sin(t * 3) * 0.3;
                g.lineStyle(3, 0xFF6D00, 0.6 * pulse);
                g.strokeCircle(cx, cy, s * 0.6 * pulse);
                g.fillStyle(0xFF6D00, 0.15 * pulse);
                g.fillCircle(cx, cy, s * 0.6 * pulse);
                // 中心角色点
                g.fillStyle(0x4CAF50, 1);
                g.fillCircle(cx, cy, 5);
                break;
            }
            case '追踪导弹': {
                // 3个导弹围绕中心旋转，带尾迹（直接计算旋转坐标）
                for (let i = 0; i < 3; i++) {
                    const angle = t * 2.5 + i * (Math.PI * 2 / 3);
                    const x = cx + Math.cos(angle) * s * 0.7;
                    const y = cy + Math.sin(angle) * s * 0.7;
                    // 尾迹
                    const tailAngle = angle - Math.PI * 0.3;
                    g.lineStyle(3, 0xFF5722, 0.4);
                    g.lineBetween(x, y, x + Math.cos(tailAngle) * 12, y + Math.sin(tailAngle) * 12);
                    // 导弹（直接计算旋转坐标）
                    const rot = angle + Math.PI / 2;
                    const cos = Math.cos(rot), sin = Math.sin(rot);
                    const rotatePoint = (px, py) => ({
                        x: x + (px * cos - py * sin),
                        y: y + (px * sin + py * cos)
                    });
                    // 弹身矩形（4个顶点）
                    const r1 = rotatePoint(-3, -6);
                    const r2 = rotatePoint(3, -6);
                    const r3 = rotatePoint(3, 4);
                    const r4 = rotatePoint(-3, 4);
                    g.fillStyle(0x9E9E9E, 1);
                    g.beginPath();
                    g.moveTo(r1.x, r1.y);
                    g.lineTo(r2.x, r2.y);
                    g.lineTo(r3.x, r3.y);
                    g.lineTo(r4.x, r4.y);
                    g.closePath();
                    g.fillPath();
                    // 弹头三角形
                    const t1 = rotatePoint(0, -10);
                    const t2 = rotatePoint(3, -6);
                    const t3 = rotatePoint(-3, -6);
                    g.fillStyle(0xFF5722, 1);
                    g.beginPath();
                    g.moveTo(t1.x, t1.y);
                    g.lineTo(t2.x, t2.y);
                    g.lineTo(t3.x, t3.y);
                    g.closePath();
                    g.fillPath();
                }
                break;
            }
            case '冰锥术': {
                // 3个冰锥从中心射出，循环（直接计算旋转坐标）
                const cycle = (t % 1.5) / 1.5;
                for (let i = 0; i < 3; i++) {
                    const angle = i * (Math.PI * 2 / 3) + cycle * Math.PI;
                    const dist = s * 0.2 + cycle * s * 0.7;
                    const x = cx + Math.cos(angle) * dist;
                    const y = cy + Math.sin(angle) * dist;
                    const alpha = 1 - cycle * 0.5;
                    const rot = angle + Math.PI / 2;
                    const cos = Math.cos(rot), sin = Math.sin(rot);
                    const rotatePoint = (px, py) => ({
                        x: x + (px * cos - py * sin),
                        y: y + (px * sin + py * cos)
                    });
                    // 外冰锥
                    const o1 = rotatePoint(0, -10);
                    const o2 = rotatePoint(5, 6);
                    const o3 = rotatePoint(-5, 6);
                    g.fillStyle(0x80DEEA, alpha);
                    g.beginPath();
                    g.moveTo(o1.x, o1.y);
                    g.lineTo(o2.x, o2.y);
                    g.lineTo(o3.x, o3.y);
                    g.closePath();
                    g.fillPath();
                    // 内冰锥
                    const i1 = rotatePoint(0, -6);
                    const i2 = rotatePoint(2, 2);
                    const i3 = rotatePoint(-2, 2);
                    g.fillStyle(0xB2EBF2, alpha * 0.6);
                    g.beginPath();
                    g.moveTo(i1.x, i1.y);
                    g.lineTo(i2.x, i2.y);
                    g.lineTo(i3.x, i3.y);
                    g.closePath();
                    g.fillPath();
                }
                break;
            }
            case '旋风斩': {
                // 3个风刃围绕中心快速旋转（直接计算旋转坐标）
                for (let i = 0; i < 3; i++) {
                    const angle = t * 5 + i * (Math.PI * 2 / 3);
                    const x = cx + Math.cos(angle) * s * 0.7;
                    const y = cy + Math.sin(angle) * s * 0.7;
                    const rot = angle + Math.PI / 2;
                    const cos = Math.cos(rot), sin = Math.sin(rot);
                    const rotatePoint = (px, py) => ({
                        x: x + (px * cos - py * sin),
                        y: y + (px * sin + py * cos)
                    });
                    // 外风刃
                    const o1 = rotatePoint(0, -12);
                    const o2 = rotatePoint(6, 8);
                    const o3 = rotatePoint(-6, 8);
                    g.fillStyle(0x81C784, 0.8);
                    g.beginPath();
                    g.moveTo(o1.x, o1.y);
                    g.lineTo(o2.x, o2.y);
                    g.lineTo(o3.x, o3.y);
                    g.closePath();
                    g.fillPath();
                    // 内风刃
                    const i1 = rotatePoint(0, -8);
                    const i2 = rotatePoint(3, 4);
                    const i3 = rotatePoint(-3, 4);
                    g.fillStyle(0xA5D6A7, 0.5);
                    g.beginPath();
                    g.moveTo(i1.x, i1.y);
                    g.lineTo(i2.x, i2.y);
                    g.lineTo(i3.x, i3.y);
                    g.closePath();
                    g.fillPath();
                }
                // 中心旋转气流
                g.lineStyle(2, 0x81C784, 0.3);
                g.strokeCircle(cx, cy, s * 0.3 + Math.sin(t * 8) * 3);
                break;
            }
            default: {
                // 默认：显示技能名称首字
                g.fillStyle(0xFFFFFF, 0.5);
                g.fillCircle(cx, cy, s * 0.4);
            }
        }
    }
    
    clearLevelUpCards() {
        if (this.levelUpCards) {
            for (const card of this.levelUpCards) {
                card.destroy();
            }
        }
        // 销毁技能预览动画
        if (this.skillPreviews) {
            for (const preview of this.skillPreviews) {
                if (preview.graphics) preview.graphics.destroy();
            }
            this.skillPreviews = [];
        }
        // 清除卡片文字（depth 3002的非按钮文字）
        this.children.list.filter(c => c.depth === 3002 && c !== this.rerollText).forEach(c => c.destroy());
    }
    
    closeLevelUpUI() {
        // 先清除卡片（会清除卡片和卡片文字）
        this.clearLevelUpCards();
        // 再清除所有 depth >= 3000 的剩余对象（背景、按钮等）
        // 注意：clearLevelUpCards 已经清除了卡片，这里不会重复销毁
        this.children.list.filter(c => c.depth >= 3000 && c.active).forEach(c => c.destroy());
        // 清空引用
        this.levelUpBg = null;
        this.rerollBtn = null;
        this.rerollText = null;
        this.levelUpCards = [];
        // 关键修复：清空技能预览动画数组，否则update会继续尝试使用已销毁的graphics对象导致卡死
        this.skillPreviews = [];
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
        const slotWidth = 70;
        const slotHeight = 40;
        const gap = 6;
        const totalWidth = Math.min(skills.length, maxShow) * (slotWidth + gap) - gap;
        const startX = w/2 - totalWidth/2 + slotWidth/2;
        const barY = h - 28;
        
        // 只在技能数量变化时重建
        const skillCount = Math.min(skills.length, maxShow);
        if (!this.skillBarElements || this.skillBarElements.length !== skillCount) {
            // 清理旧的
            if (this.skillBarElements) {
                for (const el of this.skillBarElements) {
                    el.bg.destroy();
                    el.nameText.destroy();
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
                const x = startX + i * (slotWidth + gap);
                const color = skillColors[skill.name] || 0x666666;
                
                const bg = this.add.rectangle(x, barY, slotWidth, slotHeight, color, 0.6)
                    .setScrollFactor(0).setDepth(999)
                    .setStrokeStyle(1, 0xFFFFFF, 0.4);
                const nameText = this.add.text(x, barY - 8, skill.name, {
                    fontSize: '11px', color: '#FFFFFF', fontWeight: 'bold'
                }).setScrollFactor(0).setDepth(1000).setOrigin(0.5);
                const levelText = this.add.text(x, barY + 8, 'Lv.' + skill.level, {
                    fontSize: '10px', color: '#FFFFFF'
                }).setScrollFactor(0).setDepth(1000).setOrigin(0.5);
                
                this.skillBarElements.push({ bg, nameText, levelText, skillName: skill.name });
            }
        }
        
        // 每帧只更新等级和进化状态（轻量更新）
        for (let i = 0; i < this.skillBarElements.length; i++) {
            const el = this.skillBarElements[i];
            const skill = skills[i];
            if (!skill) continue;
            
            el.levelText.setText('Lv.' + skill.level);
            const skillColors = {
                '能量弹': 0x4FC3F7, '飞刀': 0xBDBDBD, '火球': 0xFF7043,
                '闪电': 0xFFEB3B, '灼烧光环': 0xFF9800, '追踪导弹': 0x9C27B0,
                '冰锥术': 0x00BCD4, '旋风斩': 0x81C784
            };
            if (skill.evolved) {
                el.bg.setFillStyle(skillColors[skill.name] || 0x666666, 0.95);
                el.bg.setStrokeStyle(3, 0xFFD700, 0.9);
                el.levelText.setColor('#FFD700');
                el.nameText.setColor('#FFD700');
            } else {
                el.bg.setFillStyle(skillColors[skill.name] || 0x666666, 0.6);
                el.bg.setStrokeStyle(1, 0xFFFFFF, 0.4);
                el.levelText.setColor('#FFFFFF');
                el.nameText.setColor('#FFFFFF');
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
            this.addFloatingText(this.player.x, this.player.y - 50, config.name + '!', config.color, 18);
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
        this.addFloatingText(this.player.x, this.player.y - 50, '+' + amount + ' 金币', 0xFFC107, 18);
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
