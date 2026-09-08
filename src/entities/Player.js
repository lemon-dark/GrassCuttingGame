import { GameConfig } from '../config/GameConfig.js';
import { BasicAttackSkill } from '../skills/Skills.js';
import { SpriteLoader } from '../utils/SpriteLoader.js';

export class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        
        // 属性
        this.maxHp = GameConfig.PLAYER_MAX_HP;
        this.hp = this.maxHp;
        this.speed = GameConfig.PLAYER_SPEED;
        this.attack = GameConfig.PLAYER_ATTACK;
        this.attackSpeed = GameConfig.PLAYER_ATTACK_SPEED;
        this.pickupRange = GameConfig.PLAYER_PICKUP_RANGE;
        this.critChance = GameConfig.PLAYER_CRIT_CHANCE;
        this.critDamage = GameConfig.PLAYER_CRIT_DAMAGE;
        this.radius = GameConfig.PLAYER_RADIUS;
        
        // 经验和等级
        this.level = 1;
        this.xp = 0;
        this.xpToNext = GameConfig.XP_TO_LEVEL(1);
        
        // 移动
        this.moveX = 0;
        this.moveY = 0;
        this.facingRight = true;
        this.isMoving = false;
        
        // 无敌时间
        this.invincibleTimer = 0;
        
        // 技能列表（初始只有能量弹）
        this.skills = [new BasicAttackSkill()];
        
        // 创建带动画的角色 sprite（动画已在 SpriteLoader.loadAll 中创建好，12fps）
        this.sprite = SpriteLoader.createAnimatedSprite(scene, x, y, 'player');
        this.sprite.setDisplaySize(this.radius * 3, this.radius * 3 * (170/212));
        this.sprite.setDepth(10);
        // 初始停止在第一帧
        this.sprite.stop();
        this.sprite.setFrame(0);
        
        // 发光效果
        this.glow = scene.add.circle(x, y, this.radius * 1.8, 0x4FC3F7, 0.12);
        this.glow.setDepth(9);
    }
    
    update(dt) {
        // 移动
        const len = Math.sqrt(this.moveX * this.moveX + this.moveY * this.moveY);
        this.isMoving = len > 0.1;
        
        if (this.isMoving) {
            const nx = this.moveX / len;
            const ny = this.moveY / len;
            const speedMult = this.speedMultiplier || 1;
            this.x += nx * this.speed * speedMult * dt;
            this.y += ny * this.speed * speedMult * dt;
            if (nx > 0.1) this.facingRight = true;
            else if (nx < -0.1) this.facingRight = false;
            // 播放行走动画
            if (!this.sprite.anims.isPlaying) {
                this.sprite.play('player_walk');
            }
        } else {
            // 静止时停止在第一帧
            if (this.sprite.anims.isPlaying) {
                this.sprite.stop();
                this.sprite.setFrame(0);
            }
        }
        
        // 地图边界
        this.x = Math.max(this.radius, Math.min(GameConfig.MAP_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GameConfig.MAP_HEIGHT - this.radius, this.y));
        
        // 无敌时间
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }
        
        // 更新所有技能
        for (const skill of this.skills) {
            skill.update(this, this.scene, dt);
        }
        
        // 更新显示
        this.sprite.setPosition(this.x, this.y);
        this.sprite.setFlipX(!this.facingRight);
        // 受伤闪烁
        if (this.invincibleTimer > 0) {
            this.sprite.setAlpha(0.5 + Math.sin(Date.now() / 50) * 0.3);
        } else {
            this.sprite.setAlpha(1);
        }
        this.glow.setPosition(this.x, this.y);
        this.glow.setAlpha(this.invincibleTimer > 0 ? 0.35 : 0.12);
    }
    
    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = GameConfig.XP_TO_LEVEL(this.level);
            return true;
        }
        return false;
    }
    
    takeDamage(amount) {
        if (this.invincibleTimer > 0) return false;
        this.hp -= amount;
        this.invincibleTimer = 0.5;
        this.scene.cameras.main.shake(100, 0.01);
        return this.hp <= 0;
    }
    
    addSkill(skill) {
        const existing = this.skills.find(s => s.name === skill.name);
        if (existing) {
            existing.upgrade();
        } else {
            this.skills.push(skill);
        }
    }
    
    getSkill(name) {
        return this.skills.find(s => s.name === name);
    }
    
    destroy() {
        this.sprite.destroy();
        this.glow.destroy();
    }
}
