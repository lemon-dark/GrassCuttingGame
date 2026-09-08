// 遗物系统（局内永久增益被动技能）
export const RelicTypes = {
    attack_up: {
        name: '攻击宝石', icon: '⚔️', color: 0xFF5722,
        desc: '攻击力+15%',
        apply: (player) => { player.attack *= 1.15; }
    },
    hp_up: {
        name: '生命之心', icon: '❤️', color: 0xE91E63,
        desc: '最大生命+25%，并回满',
        apply: (player) => { player.maxHp *= 1.25; player.hp = player.maxHp; }
    },
    speed_up: {
        name: '疾风之靴', icon: '👟', color: 0x4CAF50,
        desc: '移动速度+20%',
        apply: (player) => { player.speed *= 1.2; }
    },
    attack_speed_up: {
        name: '急速手套', icon: '🧤', color: 0x2196F3,
        desc: '攻击速度+20%',
        apply: (player) => { player.attackSpeed *= 1.2; }
    },
    crit_up: {
        name: '暴击之眼', icon: '👁️', color: 0xFFC107,
        desc: '暴击率+15%，暴击伤害+50%',
        apply: (player) => { player.critChance += 0.15; player.critDamage = (player.critDamage || 1.5) + 0.5; }
    },
    pickup_up: {
        name: '磁力护符', icon: '🧲', color: 0x9C27B0,
        desc: '拾取范围+50%',
        apply: (player) => { player.pickupRange *= 1.5; }
    },
    lifesteal: {
        name: '吸血戒指', icon: '💍', color: 0x880E4F,
        desc: '攻击吸血5%',
        apply: (player) => { player.lifesteal = (player.lifesteal || 0) + 0.05; }
    },
    thorn: {
        name: '荆棘护甲', icon: '🛡️', color: 0x795548,
        desc: '受到伤害时反弹20%给周围敌人',
        apply: (player) => { player.thorn = (player.thorn || 0) + 0.2; }
    },
    xp_boost: {
        name: '智慧卷轴', icon: '📜', color: 0x00BCD4,
        desc: '经验获取+30%',
        apply: (player) => { player.xpMultiplier = (player.xpMultiplier || 1) + 0.3; }
    },
    gold_boost: {
        name: '金币护符', icon: '💰', color: 0xFFD700,
        desc: '金币获取+50%',
        apply: (player) => { player.goldMultiplier = (player.goldMultiplier || 1) + 0.5; }
    },
    cooldown_reduce: {
        name: '时间沙漏', icon: '⏳', color: 0x607D8B,
        desc: '所有技能冷却-15%',
        apply: (player) => { player.cooldownReduction = (player.cooldownReduction || 1) - 0.15; }
    },
    projectile_speed: {
        name: '弹道加速', icon: '🚀', color: 0x03A9F4,
        desc: '子弹速度+30%，伤害+10%',
        apply: (player) => { player.projectileSpeedMult = (player.projectileSpeedMult || 1) + 0.3; player.attack *= 1.1; }
    }
};

export class RelicManager {
    constructor() {
        this.relics = [];
    }
    
    addRelic(scene, player, relicKey) {
        const relic = RelicTypes[relicKey];
        if (!relic) return false;
        relic.apply(player);
        this.relics.push(relicKey);
        console.log('获得遗物:', relic.name);
        return true;
    }
    
    getRandomRelics(count = 3) {
        const keys = Object.keys(RelicTypes).filter(k => !this.relics.includes(k));
        const result = [];
        const available = [...keys];
        for (let i = 0; i < count && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            result.push(available.splice(idx, 1)[0]);
        }
        return result;
    }
    
    hasRelic(key) {
        return this.relics.includes(key);
    }
}
