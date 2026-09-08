// 局内道具系统
import { soundManager } from '../audio/SoundManager.js';

export const ItemTypes = {
    HEAL: { 
        name: '回血药', 
        color: 0xF44336, 
        icon: '❤', 
        duration: 0,
        description: '恢复30%生命值'
    },
    INVINCIBLE: { 
        name: '无敌护盾', 
        color: 0xFFD700, 
        icon: '🛡', 
        duration: 5,
        description: '5秒无敌'
    },
    DOUBLE_DAMAGE: { 
        name: '狂暴药剂', 
        color: 0xFF9800, 
        icon: '⚔', 
        duration: 10,
        description: '10秒伤害翻倍'
    },
    MAGNET: { 
        name: '经验磁铁', 
        color: 0x2196F3, 
        icon: '🧲', 
        duration: 10,
        description: '10秒自动吸取经验'
    },
    SPEED_BOOST: { 
        name: '疾风之靴', 
        color: 0x4CAF50, 
        icon: '👟', 
        duration: 8,
        description: '8秒移速+50%'
    },
    ATTACK_SPEED: { 
        name: '急速药水', 
        color: 0x9C27B0, 
        icon: '⚡', 
        duration: 8,
        description: '8秒攻速+50%'
    },
    GOLD: { 
        name: '金币袋', 
        color: 0xFFC107, 
        icon: '💰', 
        duration: 0,
        description: '获得50金币'
    },
    XP_BIG: { 
        name: '经验宝石', 
        color: 0x00BCD4, 
        icon: '💎', 
        duration: 0,
        description: '获得大量经验'
    }
};

export class Item {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = ItemTypes[type];
        this.alive = true;
        this.lifetime = 30; // 30秒后消失
        this.bobOffset = Math.random() * Math.PI * 2;
        
        // 创建道具图标
        this.sprite = scene.add.circle(x, y, 18, this.config.color, 0.9)
            .setDepth(8)
            .setStrokeStyle(2, 0xFFFFFF, 0.8);
        
        this.iconText = scene.add.text(x, y, this.config.icon, {
            fontSize: '18px'
        }).setOrigin(0.5).setDepth(9);
        
        // 发光效果
        this.glow = scene.add.circle(x, y, 25, this.config.color, 0.2)
            .setDepth(7);
    }
    
    update(dt, player) {
        if (!this.alive) return;
        
        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }
        
        // 上下浮动动画
        this.bobOffset += dt * 3;
        const bobY = Math.sin(this.bobOffset) * 3;
        
        this.sprite.setPosition(this.x, this.y + bobY);
        this.iconText.setPosition(this.x, this.y + bobY);
        this.glow.setPosition(this.x, this.y + bobY);
        
        // 发光脉冲
        const glowScale = 1 + Math.sin(this.bobOffset * 2) * 0.2;
        this.glow.setScale(glowScale);
        
        // 快消失时闪烁
        if (this.lifetime < 5) {
            const alpha = Math.sin(this.lifetime * 10) > 0 ? 1 : 0.3;
            this.sprite.setAlpha(alpha);
            this.iconText.setAlpha(alpha);
        }
        
        // 拾取检测
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < player.radius + 20) {
            this.pickup(player);
        }
    }
    
    pickup(player) {
        if (!this.alive) return;
        this.alive = false;
        
        const scene = this.scene;
        
        switch (this.type) {
            case 'HEAL':
                const healAmount = player.maxHp * 0.3;
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
                scene.addFloatingText(player.x, player.y - 30, '+' + Math.floor(healAmount), 0x4CAF50, 18);
                break;
            case 'INVINCIBLE':
                player.invincibleTimer = Math.max(player.invincibleTimer, this.config.duration);
                scene.addBuff('INVINCIBLE', this.config.duration);
                break;
            case 'DOUBLE_DAMAGE':
                scene.addBuff('DOUBLE_DAMAGE', this.config.duration);
                break;
            case 'MAGNET':
                scene.addBuff('MAGNET', this.config.duration);
                break;
            case 'SPEED_BOOST':
                scene.addBuff('SPEED_BOOST', this.config.duration);
                break;
            case 'ATTACK_SPEED':
                scene.addBuff('ATTACK_SPEED', this.config.duration);
                break;
            case 'GOLD':
                scene.addGold(50);
                break;
            case 'XP_BIG':
                const xpGain = 20 + scene.player.level * 5;
                if (scene.player.gainXp(xpGain)) {
                    scene.showLevelUp();
                }
                scene.addFloatingText(player.x, player.y - 30, '+' + xpGain + ' XP', 0x00BCD4, 18);
                break;
        }
        
        soundManager.play('pickup', 0.8);
        this.destroy();
    }
    
    destroy() {
        if (this.destroyed) return; // 防重复销毁
        this.destroyed = true;
        this.alive = false;
        if (this.sprite) this.sprite.destroy();
        if (this.iconText) this.iconText.destroy();
        if (this.glow) this.glow.destroy();
    }
}

// Buff 系统（临时增益）
export class BuffManager {
    constructor() {
        this.buffs = {};
    }
    
    add(type, duration) {
        this.buffs[type] = { remaining: duration, total: duration };
    }
    
    update(dt) {
        for (const type in this.buffs) {
            this.buffs[type].remaining -= dt;
            if (this.buffs[type].remaining <= 0) {
                delete this.buffs[type];
            }
        }
    }
    
    has(type) {
        return this.buffs[type] !== undefined;
    }
    
    getRemaining(type) {
        return this.buffs[type] ? this.buffs[type].remaining : 0;
    }
    
    getAll() {
        return { ...this.buffs };
    }
    
    clear() {
        this.buffs = {};
    }
}
