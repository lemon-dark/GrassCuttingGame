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
        
        // 创建玩家角色卡通sprite（支持三个方向动画）
        this.sprite = SpriteLoader.createPlayerCartoonSprite(scene, x, y);
        this.sprite.setDisplaySize(this.radius * 1.5, this.radius * 1.5 * (68/56));
        this.sprite.setDepth(10);
        // 当前方向
        this.currentDirection = 'side';
        
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
            
            // 根据移动方向选择动画
            let newDirection = 'side';
            if (Math.abs(ny) > Math.abs(nx)) {
                // 上下移动为主
                newDirection = ny > 0 ? 'front' : 'back';
            } else {
                // 左右移动为主
                newDirection = 'side';
            }
            
            // 切换动画方向
            if (newDirection !== this.currentDirection || !this.sprite.anims.isPlaying) {
                this.currentDirection = newDirection;
                const animKey = 'player_cartoon_' + newDirection + '_walk';
                if (this.scene.anims.exists(animKey)) {
                    this.sprite.play(animKey);
                }
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
        // 只有侧面动画需要翻转，正面和背面不需要
        if (this.currentDirection === 'side') {
            this.sprite.setFlipX(!this.facingRight);
        } else {
            this.sprite.setFlipX(false);
        }
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
            // 关键修复：新技能需要先 upgrade() 把 level 从 0 升到 1
            // 否则 renderSkillEffects 中的 level > 0 检查会失败，技能不会渲染
            skill.upgrade();
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
