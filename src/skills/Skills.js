// 技能基类
import { soundManager } from '../audio/SoundManager.js';

export class Skill {
    constructor(name, maxLevel = 8) {
        this.name = name;
        this.level = 0;
        this.maxLevel = maxLevel;
        this.cooldown = 0;
        this.evolved = false; // 是否超武进化
    }
    
    get canUpgrade() {
        return this.level < this.maxLevel;
    }
    
    upgrade() {
        if (this.canUpgrade) {
            this.level++;
            // 满级后检查超武进化（去掉被动要求，满级即可进化）
            if (this.level >= this.maxLevel && !this.evolved) {
                this.evolved = true;
                this.onEvolve && this.onEvolve();
            }
            return true;
        }
        return false;
    }
    
    update(player, scene, dt) {
        if (this.cooldown > 0) this.cooldown -= dt;
    }
    
    getDescription() {
        return `${this.name} Lv.${this.level}`;
    }
    
    getUpgradeDescription() {
        return `${this.name} 升级到 Lv.${this.level + 1}`;
    }
}

// 1. 能量弹（基础攻击）
export class BasicAttackSkill extends Skill {
    constructor() {
        super('能量弹', 8);
        this.baseDamage = 10;
        this.baseCooldown = 1.5; // 从1.0降低到1.5，减少发射频率
        this.bulletSpeed = 400;
    }
    
    get damage() {
        return this.baseDamage + this.level * 5 + (this.evolved ? 20 : 0);
    }
    
    get attackInterval() {
        return Math.max(0.2, this.baseCooldown - this.level * 0.08);
    }
    
    get bulletCount() {
        return this.evolved ? 3 : 1; // 超武：三联能量炮
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        if (this.cooldown <= 0) {
            // 找最近敌人
            let nearest = null;
            let minDist = 500;
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            }
            if (nearest) {
                const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                const count = this.bulletCount;
                const spread = count > 1 ? 0.2 : 0;
                for (let i = 0; i < count; i++) {
                    const angle = baseAngle + (i - (count - 1) / 2) * spread;
                    scene.spawnBullet(player.x, player.y,
                        Math.cos(angle) * this.bulletSpeed,
                        Math.sin(angle) * this.bulletSpeed,
                        this.damage, 'energy');
                }
                scene.playSound && scene.playSound('shoot', 1.0);
                soundManager.playVoice('attack'); // 攻击语音（带冷却）
            }
            this.cooldown = this.attackInterval / player.attackSpeed;
        }
    }
}

// 2. 飞刀（环绕+扇形穿透）
export class KnifeSkill extends Skill {
    constructor() {
        super('飞刀', 8);
        this.orbitingKnives = [];
        this.shootTimer = 0;
        this.baseAngle = 0; // 基础旋转角度，所有飞刀共用
    }
    
    get knifeCount() {
        return Math.min(3 + this.level, 12) + (this.evolved ? 4 : 0);
    }
    
    get damage() {
        return 8 + this.level * 4 + (this.evolved ? 15 : 0);
    }
    
    get orbitRadius() {
        return 80 + this.level * 10;
    }
    
    get rotationSpeed() {
        return 2 + this.level * 0.3;
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        // 维护环绕飞刀数量
        while (this.orbitingKnives.length < this.knifeCount) {
            this.orbitingKnives.push({ hitEnemies: new Set(), trail: [] });
        }
        while (this.orbitingKnives.length > this.knifeCount) {
            const removed = this.orbitingKnives.pop();
            if (removed.graphics) removed.graphics.destroy();
        }
        // 更新基础旋转角度
        this.baseAngle += this.rotationSpeed * dt;
        // 更新飞刀位置（均匀分布，每把飞刀角度相差 2π/knifeCount）
        for (let i = 0; i < this.orbitingKnives.length; i++) {
            const knife = this.orbitingKnives[i];
            const angle = this.baseAngle + (i / this.knifeCount) * Math.PI * 2;
            const kx = player.x + Math.cos(angle) * this.orbitRadius;
            const ky = player.y + Math.sin(angle) * this.orbitRadius;
            // 记录历史位置用于拖尾
            if (!knife.trail) knife.trail = [];
            knife.trail.push({ x: kx, y: ky });
            if (knife.trail.length > 8) knife.trail.shift();
            knife.x = kx; knife.y = ky;
            // 碰撞敌人
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - kx, e.y - ky) < e.radius + 12) {
                    if (!knife.hitEnemies) knife.hitEnemies = new Set();
                    if (!knife.hitEnemies.has(e)) {
                        knife.hitEnemies.add(e);
                        e.takeDamage(this.damage);
                        scene.addFloatingText(e.x, e.y - e.radius, Math.floor(this.damage).toString(), 0xFFFFFF, 16);
                    }
                }
            }
        }
        // 定期清除hitEnemies（允许再次命中）
        this.shootTimer += dt;
        if (this.shootTimer > 1.0) {
            this.shootTimer = 0;
            for (const knife of this.orbitingKnives) {
                knife.hitEnemies = new Set();
            }
        }
    }
}

// 3. 火球（范围爆炸）
export class FireballSkill extends Skill {
    constructor() {
        super('火球', 8);
        this.shootTimer = 0;
    }
    
    get damage() {
        return 15 + this.level * 8 + (this.evolved ? 25 : 0);
    }
    
    get explosionRadius() {
        return 60 + this.level * 10 + (this.evolved ? 40 : 0);
    }
    
    get shootInterval() {
        return Math.max(0.8, 2.5 - this.level * 0.2);
    }
    
    get fireballCount() {
        return this.evolved ? 3 : 1; // 超武：陨石雨（多个火球）
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shootTimer = 0;
            // 找最近敌人方向
            let angle = Math.random() * Math.PI * 2;
            let nearest = null;
            let minDist = 600;
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            }
            if (nearest) angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
            
            const count = this.fireballCount;
            for (let i = 0; i < count; i++) {
                const a = angle + (i - (count - 1) / 2) * 0.4;
                scene.spawnBullet(player.x, player.y,
                    Math.cos(a) * 250, Math.sin(a) * 250,
                    this.damage, 'fireball', this.explosionRadius);
            }
        }
    }
}

// 4. 闪电（跳跃连锁）
export class LightningSkill extends Skill {
    constructor() {
        super('闪电', 8);
        this.shootTimer = 0;
    }
    
    get damage() {
        return 12 + this.level * 6 + (this.evolved ? 20 : 0);
    }
    
    get chainCount() {
        return 2 + this.level + (this.evolved ? 3 : 0);
    }
    
    get chainRange() {
        return 150 + this.level * 20;
    }
    
    get shootInterval() {
        return Math.max(0.6, 2.0 - this.level * 0.15);
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shootTimer = 0;
            // 找最近敌人
            let nearest = null;
            let minDist = 400;
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            }
            if (nearest) {
                soundManager.play('lightning', 0.5);
                // 连锁闪电
                const hit = new Set();
                let current = nearest;
                let prevX = player.x, prevY = player.y;
                for (let i = 0; i < this.chainCount && current; i++) {
                    hit.add(current);
                    current.takeDamage(this.damage);
                    scene.addFloatingText(current.x, current.y - current.radius,
                        Math.floor(this.damage).toString(), 0xFFFF00, 18);
                    // 绘制闪电路径（使用 FXManager 分支闪电）
                    if (scene.spawnLightning) {
                        scene.spawnLightning(prevX, prevY, current.x, current.y, 0xFFFF00, { width: 4, life: 0.2, branches: 2, glowSize: 25 });
                    } else {
                        scene.lightningBolts = scene.lightningBolts || [];
                        scene.lightningBolts.push({
                            x1: prevX, y1: prevY, x2: current.x, y2: current.y,
                            life: 0.15, maxLife: 0.15, color: 0xFFFF00
                        });
                    }
                    prevX = current.x; prevY = current.y;
                    // 找下一个目标
                    let next = null;
                    let nextMin = this.chainRange;
                    for (const e of scene.enemies) {
                        if (!e.alive || hit.has(e)) continue;
                        const d = Math.hypot(e.x - current.x, e.y - current.y);
                        if (d < nextMin) { nextMin = d; next = e; }
                    }
                    current = next;
                }
            }
        }
    }
}

// 5. 灼烧光环（持续范围伤害）
export class AuraSkill extends Skill {
    constructor() {
        super('灼烧光环', 8);
        this.tickTimer = 0;
    }
    
    get damage() {
        return 3 + this.level * 2 + (this.evolved ? 8 : 0);
    }
    
    get radius() {
        return 60 + this.level * 15 + (this.evolved ? 50 : 0);
    }
    
    get tickInterval() {
        return Math.max(0.2, 0.5 - this.level * 0.03);
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        this.tickTimer += dt;
        if (this.tickTimer >= this.tickInterval) {
            this.tickTimer = 0;
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - player.x, e.y - player.y) < this.radius + e.radius) {
                    e.takeDamage(this.damage);
                }
            }
        }
        // 存储光环信息用于渲染
        this.playerX = player.x;
        this.playerY = player.y;
    }
}

// 6. 追踪导弹（自动追踪+小爆炸）
export class MissileSkill extends Skill {
    constructor() {
        super('追踪导弹', 8);
        this.shootTimer = 0;
    }
    
    get damage() {
        return 10 + this.level * 5 + (this.evolved ? 15 : 0);
    }
    
    get explosionRadius() {
        return 40 + this.level * 5 + (this.evolved ? 30 : 0);
    }
    
    get shootInterval() {
        return Math.max(0.5, 1.5 - this.level * 0.1);
    }
    
    get missileCount() {
        return 1 + Math.floor(this.level / 2) + (this.evolved ? 2 : 0);
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shootTimer = 0;
            const count = this.missileCount;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
                scene.spawnBullet(player.x, player.y,
                    Math.cos(angle) * 150, Math.sin(angle) * 150,
                    this.damage, 'missile', this.explosionRadius, true);
            }
        }
    }
}

// 7. 冰锥术（命中减速）
export class IceSpikeSkill extends Skill {
    constructor() {
        super('冰锥术', 8);
        this.shootTimer = 0;
    }
    
    get damage() {
        return 8 + this.level * 4 + (this.evolved ? 12 : 0);
    }
    
    get slowDuration() {
        return 1.0 + this.level * 0.2 + (this.evolved ? 1.0 : 0);
    }
    
    get slowFactor() {
        return 0.5 - this.level * 0.03;
    }
    
    get shootInterval() {
        return Math.max(0.4, 1.2 - this.level * 0.08);
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
            this.shootTimer = 0;
            // 向最近敌人发射
            let nearest = null;
            let minDist = 500;
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            }
            if (nearest) {
                const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                scene.spawnBullet(player.x, player.y,
                    Math.cos(angle) * 350, Math.sin(angle) * 350,
                    this.damage, 'ice_spike', 0, false, this.slowDuration, this.slowFactor);
            }
        }
    }
}

// 8. 旋风斩（环绕风刃持续伤害）
export class WhirlwindSkill extends Skill {
    constructor() {
        super('旋风斩', 8);
        this.blades = [];
    }
    
    get bladeCount() {
        return Math.min(2 + this.level, 8) + (this.evolved ? 2 : 0);
    }
    
    get damage() {
        return 5 + this.level * 3 + (this.evolved ? 10 : 0);
    }
    
    get radius() {
        return 50 + this.level * 8 + (this.evolved ? 30 : 0);
    }
    
    get rotateSpeed() {
        return 3 + this.level * 0.5;
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        // 维护风刃数量
        while (this.blades.length < this.bladeCount) {
            this.blades.push({ angle: Math.random() * Math.PI * 2 });
        }
        while (this.blades.length > this.bladeCount) {
            this.blades.pop();
        }
        // 更新风刃位置和碰撞
        for (const blade of this.blades) {
            blade.angle += this.rotateSpeed * dt;
            const bx = player.x + Math.cos(blade.angle) * this.radius;
            const by = player.y + Math.sin(blade.angle) * this.radius;
            blade.x = bx; blade.y = by;
            // 碰撞
            for (const e of scene.enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - bx, e.y - by) < e.radius + 15) {
                    if (!blade.hitEnemies) blade.hitEnemies = new Set();
                    if (!blade.hitEnemies.has(e)) {
                        blade.hitEnemies.add(e);
                        e.takeDamage(this.damage);
                        // 击退
                        const a = Math.atan2(e.y - player.y, e.x - player.x);
                        e.knockbackX += Math.cos(a) * 100;
                        e.knockbackY += Math.sin(a) * 100;
                    }
                }
            }
        }
        // 定期清除hitEnemies
        this.clearTimer = (this.clearTimer || 0) + dt;
        if (this.clearTimer > 0.5) {
            this.clearTimer = 0;
            for (const blade of this.blades) {
                blade.hitEnemies = new Set();
            }
        }
    }
}

// 技能工厂
export const SkillFactory = {
    createAll() {
        return [
            new BasicAttackSkill(),
            new KnifeSkill(),
            new FireballSkill(),
            new LightningSkill(),
            new AuraSkill(),
            new MissileSkill(),
            new IceSpikeSkill(),
            new WhirlwindSkill(),
            new KnockbackSkill(),
            new LifestealSkill()
        ];
    },
    
    getSkillByName(name) {
        const map = {
            '能量弹': BasicAttackSkill,
            '飞刀': KnifeSkill,
            '火球': FireballSkill,
            '闪电': LightningSkill,
            '灼烧光环': AuraSkill,
            '追踪导弹': MissileSkill,
            '冰锥术': IceSpikeSkill,
            '旋风斩': WhirlwindSkill,
            '击退强化': KnockbackSkill,
            '生命汲取': LifestealSkill
        };
        return map[name] ? new map[name]() : null;
    }
};

// 9. 击退强化（被动技能，增加所有攻击的击退效果）
export class KnockbackSkill extends Skill {
    constructor() {
        super('击退强化', 5);
    }
    
    get knockbackMultiplier() {
        return 1 + this.level * 0.5; // 每级增加50%击退
    }
    
    // 不同怪物类型的击退系数
    static getEnemyKnockbackFactor(enemyType) {
        const factors = {
            'NORMAL': 1.0,    // 小怪：正常击退
            'FAST': 0.8,      // 快速怪：击退减少20%
            'TANK': 0.4,      // 坦克怪：击退减少60%
            'ELITE': 0.3,     // 精英怪：击退减少70%
            'BOSS': 0.05      // BOSS：几乎不击退
        };
        return factors[enemyType] !== undefined ? factors[enemyType] : 1.0;
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        // 被动技能，不需要主动更新
    }
}

// 10. 生命汲取（被动技能，攻击敌人时回复生命值）
export class LifestealSkill extends Skill {
    constructor() {
        super('生命汲取', 5);
        this.healCooldown = 0;
    }
    
    get lifestealPercent() {
        return 0.05 + this.level * 0.03; // 5% + 每级3%
    }
    
    get maxHealPerHit() {
        return 5 + this.level * 3; // 每次命中最多回复的生命值
    }
    
    // 造成伤害时触发吸血
    onDamageDealt(player, scene, damage) {
        if (this.level <= 0) return;
        const healAmount = Math.min(damage * this.lifestealPercent, this.maxHealPerHit);
        if (healAmount > 0) {
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            scene.addFloatingText(player.x, player.y - 30, '+' + Math.floor(healAmount), 0x4CAF50, 14);
        }
    }
    
    update(player, scene, dt) {
        super.update(player, scene, dt);
        // 被动技能，不需要主动更新
    }
}
