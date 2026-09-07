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

    // 帧动画
    var animFrame = 0
    var animTimer = 0f
    var isMoving = false
    var facingRight = true

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

    // 帧动画
    var animFrame = 0
    var animTimer = 0f
    var facingRight = true

    init {
        // 随时间增强（进一步放缓，避免血量膨胀过快）
        val timeScale = 1f + gameTime / 320f
        when (type) {
            EnemyType.NORMAL -> {
                radius = 44f; hp = 12f * timeScale; damage = 5f; speed = 70f; xpValue = 1
            }
            EnemyType.FAST -> {
                radius = 36f; hp = 7f * timeScale; damage = 3f; speed = 140f; xpValue = 1
            }
            EnemyType.TANK -> {
                radius = 64f; hp = 45f * timeScale; damage = 12f; speed = 45f; xpValue = 3
            }
            EnemyType.ELITE -> {
                radius = 76f; hp = 120f * timeScale; damage = 18f; speed = 60f; xpValue = 10
            }
            EnemyType.BOSS -> {
                radius = 140f; hp = 900f * timeScale; damage = 30f; speed = 50f; xpValue = 100
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
class XpGem(x: Float, y: Float, var value: Int) : Entity(x, y, 14f) {
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
    var lifetime: Float = 0.4f,
    var gravity: Float = 0f,
    var drag: Float = 0.98f,
    var startColor: Int = color,
    var endColor: Int = color
) {
    var age = 0f
    var alive = true

    fun update(dt: Float) {
        age += dt
        if (age >= lifetime) { alive = false; return }
        vx *= drag
        vy = vy * drag + gravity * dt
        x += vx * dt
        y += vy * dt
    }

    val currentColor: Int
        get() {
            val t = (age / lifetime).coerceIn(0f, 1f)
            return lerpColor(startColor, endColor, t)
        }

    val currentSize: Float
        get() = size * (1f - age / lifetime * 0.5f)
}

// 颜色插值工具
fun lerpColor(c1: Int, c2: Int, t: Float): Int {
    val r1 = (c1 shr 16) and 0xFF
    val g1 = (c1 shr 8) and 0xFF
    val b1 = c1 and 0xFF
    val a1 = (c1 shr 24) and 0xFF
    val r2 = (c2 shr 16) and 0xFF
    val g2 = (c2 shr 8) and 0xFF
    val b2 = c2 and 0xFF
    val a2 = (c2 shr 24) and 0xFF
    val r = (r1 + (r2 - r1) * t).toInt()
    val g = (g1 + (g2 - g1) * t).toInt()
    val b = (b1 + (b2 - b1) * t).toInt()
    val a = (a1 + (a2 - a1) * t).toInt()
    return (a shl 24) or (r shl 16) or (g shl 8) or b
}

// ============ 爆炸特效 ============
class Explosion(
    var x: Float, var y: Float,
    var maxRadius: Float,
    var color: Int,
    var lifetime: Float = 0.3f
) {
    var age = 0f
    val alive get() = age < lifetime
    val radius get() = maxRadius * (age / lifetime)
    val alpha get() = (255 * (1 - age / lifetime)).toInt().coerceIn(0, 255)
    val lineWidth get() = 8f * (1 - age / lifetime) + 1f
    fun update(dt: Float) { age += dt }
}

// ============ 闪电特效 ============
class LightningBolt(
    var startX: Float, var startY: Float,
    var endX: Float, var endY: Float,
    var lifetime: Float = 0.2f,
    var width: Float = 3f,
    var color: Int = 0xFFEB3BFF.toInt()
) {
    var age = 0f
    var points: List<Pair<Float, Float>> = generatePath()
    val alive get() = age < lifetime

    private fun generatePath(): List<Pair<Float, Float>> {
        var pts = mutableListOf(startX to startY, endX to endY)
        val dist = hypot(endX - startX, endY - startY)
        val offset = (dist * 0.08f).coerceAtLeast(15f)
        repeat(4) {
            val newPts = mutableListOf<Pair<Float, Float>>()
            for (i in 0 until pts.size - 1) {
                val (x1, y1) = pts[i]
                val (x2, y2) = pts[i + 1]
                val mx = (x1 + x2) / 2 + (Math.random().toFloat() - 0.5f) * offset
                val my = (y1 + y2) / 2 + (Math.random().toFloat() - 0.5f) * offset
                newPts.add(pts[i])
                newPts.add(mx to my)
            }
            newPts.add(pts.last())
            pts = newPts
        }
        return pts
    }

    fun update(dt: Float) {
        age += dt
        if (Math.random() < 0.5f) points = generatePath()
    }
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
