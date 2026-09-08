// 全局游戏状态管理器（跨场景共享 + localStorage持久化）
export class GameState {
    constructor() {
        this.load();
    }
    
    // 默认值
    get defaults() {
        return {
            // 金币
            coins: 0,
            // 永久升级（6属性，每级消耗递增）
            metaUpgrades: {
                attack: 0,      // 攻击力 +5/级
                maxHp: 0,       // 最大生命 +20/级
                attackSpeed: 0, // 攻击速度 +0.1/级
                moveSpeed: 0,   // 移动速度 +20/级
                pickupRange: 0, // 拾取范围 +30/级
                critChance: 0   // 暴击率 +3%/级
            },
            // 已解锁角色
            unlockedCharacters: ['cyber_ninja'],
            // 当前选择角色
            currentCharacter: 'cyber_ninja',
            // 已解锁装备
            unlockedEquipments: ['none'],
            // 当前选择装备（4个槽位）
            currentEquipments: { weapon: 'none', armor: 'none', accessory: 'none', relic: 'none' },
            // 当前关卡
            currentLevel: 1,
            // 已通关关卡
            clearedLevels: [],
            // 设置
            settings: {
                masterVolume: 0.8,
                sfxVolume: 0.7,
                musicVolume: 0.5,
                pickupVolume: 0.5,
                voiceVolume: 0.6,
                particlesEnabled: true,
                damageNumbersEnabled: true,
                screenShakeEnabled: true,
                joystickFollow: true,
                showFps: false
            },
            // 统计
            stats: {
                totalKills: 0,
                totalGames: 0,
                totalWins: 0,
                bestTime: 0
            }
        };
    }
    
    load() {
        try {
            const saved = localStorage.getItem('grasscutting_save');
            if (saved) {
                const data = JSON.parse(saved);
                // 合并默认值（防止旧存档缺字段）
                this.data = this.deepMerge(this.defaults, data);
            } else {
                this.data = JSON.parse(JSON.stringify(this.defaults));
            }
        } catch (e) {
            console.error('加载存档失败', e);
            this.data = JSON.parse(JSON.stringify(this.defaults));
        }
    }
    
    save() {
        try {
            localStorage.setItem('grasscutting_save', JSON.stringify(this.data));
        } catch (e) {
            console.error('保存存档失败', e);
        }
    }
    
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }
    
    // 金币
    addCoins(amount) {
        this.data.coins += amount;
        this.save();
    }
    
    spendCoins(amount) {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.save();
            return true;
        }
        return false;
    }
    
    // 永久升级
    getMetaUpgradeCost(type) {
        const level = this.data.metaUpgrades[type];
        return Math.floor(50 * Math.pow(1.5, level));
    }
    
    upgradeMeta(type) {
        const cost = this.getMetaUpgradeCost(type);
        if (this.spendCoins(cost)) {
            this.data.metaUpgrades[type]++;
            this.save();
            return true;
        }
        return false;
    }
    
    // 获取永久加成数值
    getMetaBonus(type) {
        const level = this.data.metaUpgrades[type];
        const bonuses = {
            attack: level * 5,
            maxHp: level * 20,
            attackSpeed: level * 0.1,
            moveSpeed: level * 20,
            pickupRange: level * 30,
            critChance: level * 0.03
        };
        return bonuses[type] || 0;
    }
    
    // 角色
    getCharacter(id) {
        const characters = {
            cyber_ninja: { id: 'cyber_ninja', name: '赛博忍者', desc: '平衡型角色', color: 0x4FC3F7, unlockCost: 0, bonus: {} },
            flame_warrior: { id: 'flame_warrior', name: '烈焰战士', desc: '高攻击，低生命', color: 0xFF6D00, unlockCost: 500, bonus: { attack: 10, maxHp: -20 } },
            ice_mage: { id: 'ice_mage', name: '冰霜法师', desc: '高攻速，低移速', color: 0x80DEEA, unlockCost: 800, bonus: { attackSpeed: 0.3, moveSpeed: -30 } }
        };
        return characters[id] || characters.cyber_ninja;
    }
    
    unlockCharacter(id) {
        const char = this.getCharacter(id);
        if (this.spendCoins(char.unlockCost)) {
            if (!this.data.unlockedCharacters.includes(id)) {
                this.data.unlockedCharacters.push(id);
                this.save();
            }
            return true;
        }
        return false;
    }
    
    selectCharacter(id) {
        if (this.data.unlockedCharacters.includes(id)) {
            this.data.currentCharacter = id;
            this.save();
            return true;
        }
        return false;
    }
    
    // 装备
    getEquipment(id) {
        const equipments = {
            none: { id: 'none', name: '无', desc: '', slot: 'any', bonus: {} },
            energy_blade: { id: 'energy_blade', name: '能量之刃', desc: '攻击力+15', slot: 'weapon', bonus: { attack: 15 }, unlockCost: 300 },
            plasma_gun: { id: 'plasma_gun', name: '等离子枪', desc: '攻击速度+0.2', slot: 'weapon', bonus: { attackSpeed: 0.2 }, unlockCost: 500 },
            nano_armor: { id: 'nano_armor', name: '纳米护甲', desc: '最大生命+50', slot: 'armor', bonus: { maxHp: 50 }, unlockCost: 400 },
            speed_boots: { id: 'speed_boots', name: '疾行靴', desc: '移动速度+50', slot: 'armor', bonus: { moveSpeed: 50 }, unlockCost: 350 },
            crit_ring: { id: 'crit_ring', name: '暴击戒指', desc: '暴击率+10%', slot: 'accessory', bonus: { critChance: 0.1 }, unlockCost: 600 },
            xp_amulet: { id: 'xp_amulet', name: '经验护符', desc: '拾取范围+60', slot: 'accessory', bonus: { pickupRange: 60 }, unlockCost: 450 },
            phoenix_feather: { id: 'phoenix_feather', name: '凤凰之羽', desc: '攻击力+10，最大生命+30', slot: 'relic', bonus: { attack: 10, maxHp: 30 }, unlockCost: 1000 }
        };
        return equipments[id] || equipments.none;
    }
    
    unlockEquipment(id) {
        const eq = this.getEquipment(id);
        if (eq.unlockCost && this.spendCoins(eq.unlockCost)) {
            if (!this.data.unlockedEquipments.includes(id)) {
                this.data.unlockedEquipments.push(id);
                this.save();
            }
            return true;
        }
        return false;
    }
    
    equipItem(slot, id) {
        if (this.data.unlockedEquipments.includes(id)) {
            this.data.currentEquipments[slot] = id;
            this.save();
            return true;
        }
        return false;
    }
    
    // 获取所有装备加成总和
    getAllEquipmentBonuses() {
        const total = { attack: 0, maxHp: 0, attackSpeed: 0, moveSpeed: 0, pickupRange: 0, critChance: 0 };
        for (const slot in this.data.currentEquipments) {
            const eq = this.getEquipment(this.data.currentEquipments[slot]);
            for (const key in eq.bonus) {
                total[key] = (total[key] || 0) + eq.bonus[key];
            }
        }
        return total;
    }
    
    // 关卡
    getLevel(id) {
        const levels = {
            1: { id: 1, name: '霓虹都市', desc: '入门关卡', enemyMultiplier: 1.0, theme: 'cyber', reward: 100 },
            2: { id: 2, name: '数据森林', desc: '敌人增强30%', enemyMultiplier: 1.3, theme: 'forest', reward: 200 },
            3: { id: 3, name: '太空站', desc: '敌人增强60%', enemyMultiplier: 1.6, theme: 'space', reward: 350 },
            4: { id: 4, name: '熔岩核心', desc: '敌人增强100%', enemyMultiplier: 2.0, theme: 'lava', reward: 500 },
            5: { id: 5, name: '量子深渊', desc: '敌人增强150%', enemyMultiplier: 2.5, theme: 'quantum', reward: 800 }
        };
        return levels[id] || levels[1];
    }
    
    selectLevel(id) {
        this.data.currentLevel = id;
        this.save();
    }
    
    clearLevel(id) {
        if (!this.data.clearedLevels.includes(id)) {
            this.data.clearedLevels.push(id);
            const level = this.getLevel(id);
            this.addCoins(level.reward);
            this.save();
        }
    }
    
    // 设置
    updateSetting(key, value) {
        this.data.settings[key] = value;
        this.save();
    }
    
    // 统计
    addKill(count = 1) {
        this.data.stats.totalKills += count;
        this.save();
    }
    
    recordGame(won, time) {
        this.data.stats.totalGames++;
        if (won) this.data.stats.totalWins++;
        if (time > this.data.stats.bestTime) this.data.stats.bestTime = time;
        this.save();
    }
    
    // 重置存档
    reset() {
        this.data = JSON.parse(JSON.stringify(this.defaults));
        this.save();
    }
}

// 单例
export const gameState = new GameState();
