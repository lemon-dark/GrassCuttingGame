package com.grasscut.game.game

import android.graphics.Color

object GameConfig {
    const val MAP_WIDTH = 3000f
    const val MAP_HEIGHT = 3000f
    const val GAME_DURATION = 600f // 10分钟

    // 玩家初始属性
    const val PLAYER_MAX_HP = 120f
    const val PLAYER_ATK = 12f
    const val PLAYER_ATK_SPEED = 1.2f
    const val PLAYER_MOVE_SPEED = 260f
    const val PLAYER_PICKUP_RANGE = 150f
    const val PLAYER_RADIUS = 84f

    // 视觉缩放（只影响渲染大小，不影响碰撞逻辑）
    const val VISUAL_PLAYER_SCALE = 2.0f   // 玩家再大1倍
    const val VISUAL_ENEMY_SCALE = 1.5f    // 怪物统一大50%

    // 关卡模式
    data class Level(
        val id: Int,
        val name: String,
        val theme: String,        // 主题：cyber_city / neon_forest / space_station / volcano
        val themeColor: Int,      // 主题色（用于背景 tint）
        val enemyHpMult: Float,   // 敌人血量倍率
        val enemyDmgMult: Float,  // 敌人伤害倍率
        val enemySpdMult: Float,  // 敌人速度倍率
        val spawnRateMult: Float, // 生成速率倍率
        val duration: Float,      // 关卡时长（秒）
        val rewardCoins: Int      // 通关奖励金币
    )

    val LEVELS = listOf(
        Level(1, "霓虹都市", "cyber_city", 0xFF1A237E.toInt(), 1.0f, 1.0f, 1.0f, 1.0f, 600f, 100),
        Level(2, "数据森林", "neon_forest", 0xFF1B5E20.toInt(), 1.3f, 1.2f, 1.1f, 1.15f, 600f, 150),
        Level(3, "太空站", "space_station", 0xFF0D47A1.toInt(), 1.6f, 1.4f, 1.2f, 1.3f, 600f, 200),
        Level(4, "熔岩核心", "volcano", 0xFFBF360C.toInt(), 2.0f, 1.6f, 1.3f, 1.5f, 600f, 300),
        Level(5, "量子深渊", "quantum", 0xFF4A148C.toInt(), 2.5f, 2.0f, 1.5f, 1.8f, 600f, 500)
    )
    var currentLevel: Level = LEVELS[0]

    // 经验曲线（降低升级所需经验，加快成长）
    fun xpToNext(level: Int): Int = (4 + level * level * 2).toInt()

    // 颜色 —— 深色地图 + 高区分度元素
    const val COLOR_BG = 0xFF0D0D1A.toInt()          // 深蓝黑背景
    const val COLOR_GRASS = 0xFF1A1A2E.toInt()         // 地图格子亮
    const val COLOR_GRASS_DARK = 0xFF12121F.toInt()    // 地图格子暗
    const val COLOR_PLAYER = 0xFF4FC3F7.toInt()         // 玩家亮蓝
    const val COLOR_PLAYER_DARK = 0xFF0288D1.toInt()    // 玩家外圈深蓝
    const val COLOR_XP = 0xFFFFD700.toInt()             // 经验宝石金色
    const val COLOR_XP_GLOW = 0xFFFFECB3.toInt()        // 经验宝石光晕浅金
    const val COLOR_HP_BG = 0xFF424242.toInt()
    const val COLOR_HP_FG = 0xFFEF5350.toInt()
    const val COLOR_XP_BAR_BG = 0xFF333333.toInt()
    const val COLOR_XP_BAR_FG = 0xFFFFD700.toInt()      // 经验条金色
    const val COLOR_DAMAGE = 0xFFFFAB40.toInt()
    const val COLOR_DAMAGE_CRIT = 0xFFFF5252.toInt()
    const val COLOR_HEAL = 0xFF69F0AE.toInt()

    // 敌人类型颜色 —— 高区分度
    val ENEMY_COLORS = mapOf(
        "normal" to 0xFFB0BEC5.toInt(),   // 普通：蓝灰白
        "fast" to 0xFFFFEB3B.toInt(),      // 快速：亮黄
        "tank" to 0xFFEF5350.toInt(),      // 坦克：红
        "elite" to 0xFFAB47BC.toInt(),     // 精英：紫
        "boss" to 0xFFFF6E40.toInt()       // Boss：橙红
    )
}
