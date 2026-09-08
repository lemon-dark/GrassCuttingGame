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
            this.x += (dx / dist) * speed * dt;
            this.y += (dy / dist) * speed * dt;
        }
        
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
    
    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 0.1;
        if (this.hp <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }
    
    destroy() {
        this.sprite.destroy();
        this.hpBarBg.destroy();
        this.hpBar.destroy();
    }
}
