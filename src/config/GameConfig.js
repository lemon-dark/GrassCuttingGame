// 游戏配置
export const GameConfig = {
    // 难度配置
    DIFFICULTIES: {
        easy: { name: '简单', hpMult: 0.7, dmgMult: 0.7, spawnMult: 0.8, goldMult: 1.5, xpMult: 1.2, color: 0x4CAF50 },
        normal: { name: '普通', hpMult: 1.0, dmgMult: 1.0, spawnMult: 1.0, goldMult: 1.0, xpMult: 1.0, color: 0x2196F3 },
        hard: { name: '困难', hpMult: 1.5, dmgMult: 1.3, spawnMult: 1.2, goldMult: 2.0, xpMult: 1.5, color: 0xFF9800 },
        hell: { name: '地狱', hpMult: 2.5, dmgMult: 1.8, spawnMult: 1.5, goldMult: 3.0, xpMult: 2.0, color: 0xF44336 }
    },
    
    // 地图
    MAP_WIDTH: 3000,
    MAP_HEIGHT: 3000,
    
    // 玩家
    PLAYER_SPEED: 200,
    PLAYER_RADIUS: 30,
    PLAYER_MAX_HP: 100,
    PLAYER_ATTACK: 10,
    PLAYER_ATTACK_SPEED: 1.0, // 每秒攻击次数
    PLAYER_PICKUP_RANGE: 80,
    PLAYER_CRIT_CHANCE: 0.05,
    PLAYER_CRIT_DAMAGE: 2.0,
    
    // 怪物
    ENEMY_TYPES: {
        NORMAL: { hp: 30, speed: 60, damage: 5, radius: 20, xp: 1, color: 0x66BB6A, name: '普通怪' },
        FAST: { hp: 15, speed: 120, damage: 3, radius: 15, xp: 2, color: 0xFFEE58, name: '快速怪' },
        TANK: { hp: 80, speed: 35, damage: 10, radius: 30, xp: 3, color: 0xEF5350, name: '坦克怪' },
        ELITE: { hp: 200, speed: 50, damage: 15, radius: 35, xp: 10, color: 0xAB47BC, name: '精英怪' },
        BOSS: { hp: 1000, speed: 40, damage: 25, radius: 50, xp: 50, color: 0xFF6D00, name: 'Boss' }
    },
    
    // 波次
    SPAWN_INTERVAL: 2.0, // 初始生成间隔（秒）
    SPAWN_INTERVAL_MIN: 0.3, // 最小生成间隔
    MAX_ENEMIES: 200,
    
    // 升级
    XP_TO_LEVEL: (level) => 5 + level * 3, // 升级所需经验
    
    // 游戏时长
    GAME_DURATION: 600, // 10分钟
    
    // 颜色
    COLORS: {
        PLAYER: 0x4FC3F7,
        XP_GEM: 0xFFD700,
        DAMAGE: 0xFFFFFF,
        DAMAGE_CRIT: 0xFFD700,
        HEALTH_BAR_BG: 0x333333,
        HEALTH_BAR_FG: 0xE53935,
        XP_BAR_BG: 0x333333,
        XP_BAR_FG: 0xFFD700
    }
};
