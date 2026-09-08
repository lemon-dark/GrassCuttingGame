// 进度系统：天赋树、成就系统、每日挑战、任务系统
export const TalentTree = {
    attack_branch: {
        name: '攻击系', icon: '⚔️', color: 0xFF5722,
        talents: [
            { id: 'atk1', name: '力量强化', desc: '攻击力+10%', cost: 100, maxLevel: 5, effect: (lv) => ({ attackMult: 1 + lv * 0.1 }) },
            { id: 'atk2', name: '暴击精通', desc: '暴击率+5%', cost: 150, maxLevel: 5, effect: (lv) => ({ critChance: lv * 0.05 }) },
            { id: 'atk3', name: '暴击伤害', desc: '暴击伤害+20%', cost: 200, maxLevel: 3, effect: (lv) => ({ critDamage: lv * 0.2 }) },
            { id: 'atk4', name: '攻速提升', desc: '攻击速度+8%', cost: 180, maxLevel: 5, effect: (lv) => ({ attackSpeedMult: 1 + lv * 0.08 }) }
        ]
    },
    defense_branch: {
        name: '防御系', icon: '🛡️', color: 0x2196F3,
        talents: [
            { id: 'def1', name: '生命强化', desc: '最大生命+15%', cost: 100, maxLevel: 5, effect: (lv) => ({ hpMult: 1 + lv * 0.15 }) },
            { id: 'def2', name: '生命恢复', desc: '每秒恢复1%生命', cost: 200, maxLevel: 3, effect: (lv) => ({ hpRegen: lv * 0.01 }) },
            { id: 'def3', name: '移速提升', desc: '移动速度+10%', cost: 120, maxLevel: 5, effect: (lv) => ({ speedMult: 1 + lv * 0.1 }) },
            { id: 'def4', name: '拾取范围', desc: '拾取范围+20%', cost: 100, maxLevel: 5, effect: (lv) => ({ pickupMult: 1 + lv * 0.2 }) }
        ]
    },
    utility_branch: {
        name: '辅助系', icon: '✨', color: 0x9C27B0,
        talents: [
            { id: 'util1', name: '经验加成', desc: '经验获取+15%', cost: 150, maxLevel: 5, effect: (lv) => ({ xpMult: 1 + lv * 0.15 }) },
            { id: 'util2', name: '金币加成', desc: '金币获取+20%', cost: 150, maxLevel: 5, effect: (lv) => ({ goldMult: 1 + lv * 0.2 }) },
            { id: 'util3', name: '冷却缩减', desc: '技能冷却-10%', cost: 200, maxLevel: 3, effect: (lv) => ({ cooldownReduction: lv * 0.1 }) },
            { id: 'util4', name: '幸运加成', desc: '道具掉落率+10%', cost: 180, maxLevel: 3, effect: (lv) => ({ dropRateMult: 1 + lv * 0.1 }) }
        ]
    }
};

export const Achievements = {
    first_blood: { name: '初次击杀', desc: '击杀第一个敌人', icon: '🩸', reward: 50, condition: (stats) => stats.totalKills >= 1 },
    kill_100: { name: '百人斩', desc: '累计击杀100个敌人', icon: '⚔️', reward: 100, condition: (stats) => stats.totalKills >= 100 },
    kill_1000: { name: '千人斩', desc: '累计击杀1000个敌人', icon: '💀', reward: 500, condition: (stats) => stats.totalKills >= 1000 },
    survive_5min: { name: '幸存者', desc: '单局存活5分钟', icon: '⏰', reward: 100, condition: (stats) => stats.maxSurviveTime >= 300 },
    survive_10min: { name: '坚守者', desc: '单局存活10分钟', icon: '🏆', reward: 300, condition: (stats) => stats.maxSurviveTime >= 600 },
    level_10: { name: '初窥门径', desc: '单局达到10级', icon: '📈', reward: 100, condition: (stats) => stats.maxLevel >= 10 },
    level_30: { name: '登堂入室', desc: '单局达到30级', icon: '🎯', reward: 300, condition: (stats) => stats.maxLevel >= 30 },
    boss_killer: { name: '屠龙勇士', desc: '击杀第一个Boss', icon: '🐉', reward: 200, condition: (stats) => stats.bossKills >= 1 },
    elite_hunter: { name: '精英猎手', desc: '击杀50个精英怪', icon: '👹', reward: 200, condition: (stats) => stats.eliteKills >= 50 },
    all_skills: { name: '全能战士', desc: '单局获得所有8种技能', icon: '🌟', reward: 500, condition: (stats) => stats.maxSkillCount >= 8 },
    first_victory: { name: '初战告捷', desc: '通关第一个关卡', icon: '🎉', reward: 100, condition: (stats) => stats.clearedLevels >= 1 },
    all_levels: { name: '征服者', desc: '通关所有5个关卡', icon: '👑', reward: 1000, condition: (stats) => stats.clearedLevels >= 5 },
    gold_hoarder: { name: '守财奴', desc: '累计获得10000金币', icon: '💰', reward: 300, condition: (stats) => stats.totalGold >= 10000 },
    relic_collector: { name: '收藏家', desc: '单局获得5个遗物', icon: '🏺', reward: 200, condition: (stats) => stats.maxRelicCount >= 5 }
};

export const DailyChallenges = [
    { id: 'daily_kill', name: '每日击杀', desc: '单局击杀50个敌人', target: 50, type: 'kills', reward: 100 },
    { id: 'daily_survive', name: '每日生存', desc: '单局存活3分钟', target: 180, type: 'survive', reward: 100 },
    { id: 'daily_level', name: '每日升级', desc: '单局达到15级', target: 15, type: 'level', reward: 150 },
    { id: 'daily_gold', name: '每日金币', desc: '单局获得200金币', target: 200, type: 'gold', reward: 100 },
    { id: 'daily_elite', name: '每日精英', desc: '单局击杀10个精英怪', target: 10, type: 'elite', reward: 150 }
];

export const Missions = [
    { id: 'm1', name: '新手起步', desc: '累计击杀50个敌人', target: 50, type: 'totalKills', reward: 100, rewardType: 'gold' },
    { id: 'm2', name: '小有成就', desc: '累计击杀500个敌人', target: 500, type: 'totalKills', reward: 300, rewardType: 'gold' },
    { id: 'm3', name: '身经百战', desc: '进行10局游戏', target: 10, type: 'totalGames', reward: 200, rewardType: 'gold' },
    { id: 'm4', name: '百战不殆', desc: '进行50局游戏', target: 50, type: 'totalGames', reward: 500, rewardType: 'gold' },
    { id: 'm5', name: '财富积累', desc: '累计获得5000金币', target: 5000, type: 'totalGold', reward: 500, rewardType: 'gold' },
    { id: 'm6', name: '技能大师', desc: '累计获得50次技能升级', target: 50, type: 'totalSkillUps', reward: 300, rewardType: 'gold' },
    { id: 'm7', name: '天赋觉醒', desc: '解锁10个天赋点', target: 10, type: 'totalTalents', reward: 500, rewardType: 'gold' },
    { id: 'm8', name: '成就猎人', desc: '解锁5个成就', target: 5, type: 'totalAchievements', reward: 300, rewardType: 'gold' }
];

export class ProgressionManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.ensureData();
    }
    
    ensureData() {
        if (!this.gameState.data.talents) this.gameState.data.talents = {};
        if (!this.gameState.data.achievements) this.gameState.data.achievements = [];
        if (!this.gameState.data.dailyChallenges) {
            this.gameState.data.dailyChallenges = this.generateDailyChallenges();
        }
        if (!this.gameState.data.missions) this.gameState.data.missions = {};
        if (!this.gameState.data.stats) {
            this.gameState.data.stats = {
                totalKills: 0, totalGames: 0, totalGold: 0, totalSkillUps: 0,
                maxSurviveTime: 0, maxLevel: 0, maxSkillCount: 0, maxRelicCount: 0,
                bossKills: 0, eliteKills: 0, clearedLevels: 0, totalTalents: 0,
                totalAchievements: 0
            };
        }
        // 检查每日挑战是否需要刷新
        const today = new Date().toDateString();
        if (this.gameState.data.dailyDate !== today) {
            this.gameState.data.dailyDate = today;
            this.gameState.data.dailyChallenges = this.generateDailyChallenges();
        }
    }
    
    generateDailyChallenges() {
        const shuffled = [...DailyChallenges].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3).map(c => ({ ...c, progress: 0, completed: false, claimed: false }));
    }
    
    // 天赋系统
    getTalentLevel(talentId) {
        return this.gameState.data.talents[talentId] || 0;
    }
    
    upgradeTalent(talentId) {
        for (const branch of Object.values(TalentTree)) {
            const talent = branch.talents.find(t => t.id === talentId);
            if (talent) {
                const currentLevel = this.getTalentLevel(talentId);
                if (currentLevel >= talent.maxLevel) return false;
                const cost = talent.cost * (currentLevel + 1);
                if (this.gameState.data.coins < cost) return false;
                this.gameState.data.coins -= cost;
                this.gameState.data.talents[talentId] = currentLevel + 1;
                this.gameState.data.stats.totalTalents++;
                this.gameState.save();
                return true;
            }
        }
        return false;
    }
    
    getTalentBonuses() {
        const bonuses = { attackMult: 1, hpMult: 1, speedMult: 1, attackSpeedMult: 1,
                          critChance: 0, critDamage: 0, xpMult: 1, goldMult: 1,
                          pickupMult: 1, cooldownReduction: 0, dropRateMult: 1, hpRegen: 0 };
        for (const [talentId, level] of Object.entries(this.gameState.data.talents)) {
            if (level <= 0) continue;
            for (const branch of Object.values(TalentTree)) {
                const talent = branch.talents.find(t => t.id === talentId);
                if (talent) {
                    const effect = talent.effect(level);
                    for (const key in effect) {
                        if (key.includes('Mult')) bonuses[key] *= effect[key];
                        else bonuses[key] += effect[key];
                    }
                }
            }
        }
        return bonuses;
    }
    
    // 成就系统
    checkAchievements() {
        const stats = this.gameState.data.stats;
        const newlyUnlocked = [];
        for (const [id, achievement] of Object.entries(Achievements)) {
            if (!this.gameState.data.achievements.includes(id) && achievement.condition(stats)) {
                this.gameState.data.achievements.push(id);
                this.gameState.data.coins += achievement.reward;
                this.gameState.data.stats.totalAchievements++;
                newlyUnlocked.push(achievement);
            }
        }
        if (newlyUnlocked.length > 0) this.gameState.save();
        return newlyUnlocked;
    }
    
    // 每日挑战
    updateDailyChallenge(type, amount) {
        for (const challenge of this.gameState.data.dailyChallenges) {
            if (challenge.type === type && !challenge.completed) {
                challenge.progress = Math.min(challenge.target, challenge.progress + amount);
                if (challenge.progress >= challenge.target) {
                    challenge.completed = true;
                }
            }
        }
        this.gameState.save();
    }
    
    claimDailyChallenge(challengeId) {
        const challenge = this.gameState.data.dailyChallenges.find(c => c.id === challengeId);
        if (challenge && challenge.completed && !challenge.claimed) {
            challenge.claimed = true;
            this.gameState.data.coins += challenge.reward;
            this.gameState.save();
            return true;
        }
        return false;
    }
    
    // 任务系统
    updateMission(type, amount) {
        for (const mission of Missions) {
            if (mission.type === type) {
                if (!this.gameState.data.missions[mission.id]) {
                    this.gameState.data.missions[mission.id] = { progress: 0, completed: false, claimed: false };
                }
                const data = this.gameState.data.missions[mission.id];
                if (!data.completed) {
                    data.progress = Math.min(mission.target, data.progress + amount);
                    if (data.progress >= mission.target) data.completed = true;
                }
            }
        }
        this.gameState.save();
    }
    
    claimMission(missionId) {
        const mission = Missions.find(m => m.id === missionId);
        const data = this.gameState.data.missions[missionId];
        if (mission && data && data.completed && !data.claimed) {
            data.claimed = true;
            this.gameState.data.coins += mission.reward;
            this.gameState.save();
            return true;
        }
        return false;
    }
    
    // 更新统计
    updateStats(gameResult) {
        const stats = this.gameState.data.stats;
        stats.totalKills += gameResult.kills || 0;
        stats.totalGames += 1;
        stats.totalGold += gameResult.gold || 0;
        stats.totalSkillUps += gameResult.skillUps || 0;
        stats.maxSurviveTime = Math.max(stats.maxSurviveTime, gameResult.surviveTime || 0);
        stats.maxLevel = Math.max(stats.maxLevel, gameResult.level || 0);
        stats.maxSkillCount = Math.max(stats.maxSkillCount, gameResult.skillCount || 0);
        stats.maxRelicCount = Math.max(stats.maxRelicCount, gameResult.relicCount || 0);
        stats.bossKills += gameResult.bossKills || 0;
        stats.eliteKills += gameResult.eliteKills || 0;
        if (gameResult.victory) stats.clearedLevels++;
        
        // 更新任务
        this.updateMission('totalKills', gameResult.kills || 0);
        this.updateMission('totalGames', 1);
        this.updateMission('totalGold', gameResult.gold || 0);
        this.updateMission('totalSkillUps', gameResult.skillUps || 0);
        
        // 检查成就
        return this.checkAchievements();
    }
}
