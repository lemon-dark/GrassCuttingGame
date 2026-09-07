package com.grasscut.game.game

import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.hypot

// ============ 基础实体 ============
open class Entity(var x: Float, var y: Float, var radius: Float) {
    var alive = true
    fun distTo(other: Entity): Float = hypot(other.x - x, other.y - y)
    fun distTo(px: Float, py: Float): Float = hypot(px - x, py - y)
}

// ============ 玩家 ============
class Player(x: Float, y: Float) : Entity(x, y, GameConfig.PLAYER_RADIUS) {
    var maxHp = GameConfig.PLAYER_MAX_HP
    var hp = maxHp
    var baseAtk = GameConfig.PLAYER_ATK
    var baseAtkSpeed = GameConfig.PLAYER_ATK_SPEED
    var baseMoveSpeed = GameConfig.PLAYER_MOVE_SPEED
    var basePickupRange = GameConfig.PLAYER_PICKUP_RANGE

    // 属性加成
    var atkBonus = 0f
    var atkSpeedBonus = 0f
    var moveSpeedBonus = 0f
    var pickupRangeBonus = 0f
    var maxHpBonus = 0f
    var critChance = 0f
    var critDamage = 1.5f

    val effectiveAtk: Float get() = baseAtk + atkBonus
    val effectiveAtkSpeed: Float get() = baseAtkSpeed + atkSpeedBonus
    val effectiveMoveSpeed: Float get() = baseMoveSpeed + moveSpeedBonus
    val effectivePickupRange: Float get() = basePickupRange + pickupRangeBonus
    val effectiveMaxHp: Float get() = maxHp + maxHpBonus

    var level = 1
    var xp = 0
    var xpToNext = GameConfig.xpToNext(1)
    var kills = 0
    var invincibleTimer = 0f

    val skills = mutableListOf<Skill>()

    fun gainXp(amount: Int): Boolean {
        xp += amount
        if (xp >= xpToNext) {
            xp -= xpToNext
            level++
            xpToNext = GameConfig.xpToNext(level)
            // 升级回血
            hp = minOf(hp + effectiveMaxHp * 0.2f, effectiveMaxHp)
            return true
        }
        return false
    }

    fun takeDamage(dmg: Float) {
        if (invincibleTimer > 0) return
        hp -= dmg
        invincibleTimer = 0.3f
        if (hp <= 0) {
            hp = 0f
            alive = false
        }
    }

    fun heal(amount: Float) {
        hp = minOf(hp + amount, effectiveMaxHp)
    }
}

// ============ 敌人 ============
enum class EnemyType { NORMAL, FAST, TANK, ELITE, BOSS }

class Enemy(x: Float, y: Float, val type: EnemyType, gameTime: Float) : Entity(x, y, 0f) {
    var hp: Float
    var maxHp: Float
    var damage: Float
    var speed: Float
    var xpValue: Int
    var hitFlash = 0f
    var attackCooldown = 0f

    init {
        // 随时间增强（放缓，避免怪物太强）
        val timeScale = 1f + gameTime / 220f
        when (type) {
            EnemyType.NORMAL -> {
                radius = 22f; hp = 15f * timeScale; damage = 5f; speed = 70f; xpValue = 1
            }
            EnemyType.FAST -> {
                radius = 18f; hp = 8f * timeScale; damage = 3f; speed = 140f; xpValue = 1
            }
            EnemyType.TANK -> {
                radius = 32f; hp = 60f * timeScale; damage = 12f; speed = 45f; xpValue = 3
            }
            EnemyType.ELITE -> {
                radius = 38f; hp = 200f * timeScale; damage = 20f; speed = 60f; xpValue = 10
            }
            EnemyType.BOSS -> {
                radius = 70f; hp = 1500f * timeScale; damage = 35f; speed = 50f; xpValue = 100
            }
        }
        maxHp = hp
    }

    fun takeDamage(dmg: Float): Boolean {
        hp -= dmg
        hitFlash = 0.1f
        if (hp <= 0) {
            alive = false
            return true
        }
        return false
    }
}

// ============ 子弹 ============
class Bullet(
    x: Float, y: Float,
    var vx: Float, var vy: Float,
    var damage: Float,
    var pierce: Int = 0,
    var lifetime: Float = 3f,
    var color: Int = 0xFFFFFFFF.toInt(),
    var size: Float = 6f,
    var bulletType: String = "normal"
) : Entity(x, y, size) {
    val hitEnemies = mutableSetOf<Int>()
    var explosionRadius = 0f // 火球爆炸范围
    val trail = ArrayDeque<Pair<Float, Float>>() // 拖尾位置
    var trailTimer = 0f
}

// ============ 经验宝石 ============
class XpGem(x: Float, y: Float, var value: Int) : Entity(x, y, 7f) {
    var attracted = false
    var speed = 0f
    var magnetTimer = 0f
}

// ============ 飘字 ============
class FloatingText(
    var x: Float, var y: Float,
    var text: String, var color: Int,
    var lifetime: Float = 0.8f,
    var size: Float = 28f
) {
    var vy = -60f
    var alive = true
    var alpha = 255
}

// ============ 粒子 ============
class Particle(
    var x: Float, var y: Float,
    var vx: Float, var vy: Float,
    var color: Int, var size: Float,
    var lifetime: Float = 0.4f
) {
    var alive = true
}

// ============ 空间分区（碰撞优化） ============
class SpatialGrid(private val cellSize: Float = 100f) {
    private val grid = HashMap<Long, MutableList<Entity>>()

    fun clear() { grid.clear() }

    private fun key(cx: Int, cy: Int): Long = (cx.toLong() shl 32) or (cy.toLong() and 0xFFFFFFFFL)

    fun insert(e: Entity) {
        val cx = (e.x / cellSize).toInt()
        val cy = (e.y / cellSize).toInt()
        val k = key(cx, cy)
        grid.getOrPut(k) { mutableListOf() }.add(e)
    }

    fun queryNear(e: Entity, range: Float): List<Entity> {
        val result = mutableListOf<Entity>()
        val minCx = ((e.x - range) / cellSize).toInt()
        val maxCx = ((e.x + range) / cellSize).toInt()
        val minCy = ((e.y - range) / cellSize).toInt()
        val maxCy = ((e.y + range) / cellSize).toInt()
        for (cx in minCx..maxCx) {
            for (cy in minCy..maxCy) {
                grid[key(cx, cy)]?.let { result.addAll(it) }
            }
        }
        return result
    }
}
