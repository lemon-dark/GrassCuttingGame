import { GameConfig } from '../config/GameConfig.js';
import { SpriteLoader } from '../utils/SpriteLoader.js';

export class Enemy {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        
        const config = GameConfig.ENEMY_TYPES[type];
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.speed = config.speed;
        this.damage = config.damage;
        this.radius = config.radius;
        this.xpValue = config.xp;
        this.color = config.color;
        this.name = config.name;
        
        this.alive = true;
        this.hitFlash = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.slowTimer = 0;
        this.slowFactor = 1;
        this.isMoving = true;
        
        // 特殊能力系统
        this.abilities = [];
        this.abilityCooldowns = {};
        this.shieldHp = 0;
        this.exploding = false;
        this.explodeTimer = 0;
        
        // 根据怪物类型分配特殊能力
        if (type === 'FAST') {
            this.abilities.push('explode'); // 自爆
        } else if (type === 'TANK') {
            this.abilities.push('shield'); // 护盾
            this.shieldHp = this.maxHp * 0.3;
        } else if (type === 'ELITE') {
            const eliteAbilities = ['ranged', 'heal', 'split', 'shield'];
            this.abilities.push(eliteAbilities[Math.floor(Math.random() * eliteAbilities.length)]);
            if (this.abilities.includes('shield')) this.shieldHp = this.maxHp * 0.4;
        } else if (type === 'BOSS') {
            this.abilities = ['ranged', 'heal', 'shield', 'summon'];
            this.shieldHp = this.maxHp * 0.5;
        }
        
        // 初始化能力冷却
        for (const ab of this.abilities) {
            this.abilityCooldowns[ab] = Math.random() * 3;
        }
        
        // 纹理类型映射
        const textureMap = {
            'NORMAL': 'enemy_normal',
            'FAST': 'enemy_fast',
            'TANK': 'enemy_tank',
            'ELITE': 'enemy_elite',
            'BOSS': 'enemy_boss'
        };
        this.textureKey = textureMap[type] || 'enemy_normal';
        
        // 创建带动画的怪物 sprite（动画已在 SpriteLoader.loadAll 中创建好，8fps）
        this.sprite = SpriteLoader.createAnimatedSprite(scene, x, y, this.textureKey);
        const sizeMultiplier = type === 'BOSS' ? 3.5 : type === 'ELITE' ? 2.8 : 2.2;
        this.sprite.setDisplaySize(this.radius * sizeMultiplier, this.radius * sizeMultiplier * (170/212));
        this.sprite.setDepth(5);
        
        // 血条
        this.hpBarBg = scene.add.rectangle(x, y - this.radius - 15, this.radius * 2, 6, 0x333333, 0.8);
        this.hpBarBg.setDepth(6);
        this.hpBar = scene.add.rectangle(x - this.radius, y - this.radius - 15, this.radius * 2, 6, 0x4CAF50, 1);
        this.hpBar.setOrigin(0, 0.5);
        this.hpBar.setDepth(7);
    }
    
    update(dt, player) {
        if (!this.alive) return;
        
        // 减速
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowFactor = 1;
        }
        
        // 击退
        this.x += this.knockbackX * dt;
        this.y += this.knockbackY * dt;
        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;
        
        // 向玩家移动
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.isMoving = dist > 5;
        
        if (dist > 0) {
            const speed = this.speed * this.slowFactor;
            // 自爆怪接近玩家时加速
            const speedMult = this.abilities.includes('explode') && dist < 150 ? 1.8 : 1;
            this.x += (dx / dist) * speed * speedMult * dt;
            this.y += (dy / dist) * speed * speedMult * dt;
        }
        
        // 特殊能力处理
        this.updateAbilities(dt, player, dist);
        
        // 受击闪烁
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
        }
        
        // 更新显示
        this.sprite.setPosition(this.x, this.y);
        // 朝向玩家
        this.sprite.setFlipX(dx < 0);
        
        // 播放/停止动画
        if (this.isMoving) {
            if (!this.sprite.anims.isPlaying) {
                this.sprite.play(this.textureKey + '_walk');
            }
        } else {
            if (this.sprite.anims.isPlaying) {
                this.sprite.stop();
                this.sprite.setFrame(0);
            }
        }
        
        // 受击闪白
        if (this.hitFlash > 0) {
            this.sprite.setTint(0xFFFFFF);
        } else if (this.slowFactor < 1) {
            this.sprite.setTint(0x80DEEA);
        } else {
            this.sprite.clearTint();
        }
        
        // 更新血条
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        this.hpBarBg.setPosition(this.x, this.y - this.radius - 15);
        this.hpBar.setPosition(this.x - this.radius, this.y - this.radius - 15);
        this.hpBar.width = this.radius * 2 * hpRatio;
        if (hpRatio > 0.5) this.hpBar.setFillStyle(0x4CAF50);
        else if (hpRatio > 0.25) this.hpBar.setFillStyle(0xFFC107);
        else this.hpBar.setFillStyle(0xF44336);
        
        // Boss/精英血条常显
        if (this.type === 'BOSS' || this.type === 'ELITE') {
            this.hpBarBg.setVisible(true);
            this.hpBar.setVisible(true);
        } else {
            this.hpBarBg.setVisible(hpRatio < 1);
            this.hpBar.setVisible(hpRatio < 1);
        }
    }
    
    updateAbilities(dt, player, dist) {
        // 冷却更新
        for (const ab in this.abilityCooldowns) {
            this.abilityCooldowns[ab] -= dt;
        }
        
        // 远程攻击
        if (this.abilities.includes('ranged') && this.abilityCooldowns.ranged <= 0 && dist < 400 && dist > 80) {
            this.abilityCooldowns.ranged = 2.5;
            if (this.scene.spawnEnemyBullet) {
                this.scene.spawnEnemyBullet(this.x, this.y, player.x, player.y, this.damage * 0.5);
            }
        }
        
        // 治疗
        if (this.abilities.includes('heal') && this.abilityCooldowns.heal <= 0 && this.hp < this.maxHp * 0.7) {
            this.abilityCooldowns.heal = 4;
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15);
            // 治疗特效
            if (this.scene.addFloatingText) {
                this.scene.addFloatingText(this.x, this.y - 30, '+' + Math.floor(this.maxHp * 0.15), '#66BB6A');
            }
        }
        
        // 自爆
        if (this.abilities.includes('explode') && dist < 60 && !this.exploding) {
            this.exploding = true;
            this.explodeTimer = 0.8;
            this.isMoving = false;
        }
        if (this.exploding) {
            this.explodeTimer -= dt;
            // 闪烁警告
            this.sprite.setAlpha(0.5 + Math.sin(Date.now() / 50) * 0.5);
            if (this.explodeTimer <= 0) {
                // 爆炸
                if (this.scene.triggerExplosion && dist < 100) {
                    player.takeDamage(this.damage * 2);
                    this.scene.triggerExplosion(this.x, this.y, 80, 0xFF5722);
                }
                this.hp = 0;
                this.alive = false;
            }
        }
        
        // 召唤（BOSS）
        if (this.abilities.includes('summon') && this.abilityCooldowns.summon <= 0) {
            this.abilityCooldowns.summon = 8;
            if (this.scene.spawnEnemy) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    this.scene.spawnEnemyAt(this.x + Math.cos(angle) * 80, this.y + Math.sin(angle) * 80, 'FAST');
                }
            }
        }
    }
    
    takeDamage(amount) {
        // 护盾先吸收伤害
        if (this.shieldHp > 0) {
            const absorbed = Math.min(this.shieldHp, amount);
            this.shieldHp -= absorbed;
            amount -= absorbed;
            if (this.shieldHp <= 0) {
                this.shieldHp = 0;
            }
        }
        this.hp -= amount;
        this.hitFlash = 0.1;
        if (this.hp <= 0) {
            this.alive = false;
            // 分裂能力：死亡时分裂成小怪物
            if (this.abilities.includes('split') && this.scene.spawnEnemyAt) {
                for (let i = 0; i < 2; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    this.scene.spawnEnemyAt(this.x + Math.cos(angle) * 30, this.y + Math.sin(angle) * 30, 'NORMAL');
                }
            }
            return true;
        }
        return false;
    }
    
    destroy() {
        if (this.destroyed) return; // 防重复销毁
        this.destroyed = true;
        this.sprite.destroy();
        this.hpBarBg.destroy();
        this.hpBar.destroy();
    }
}
