package com.grasscut.game.game

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.hypot

// ============ 技能基类 ============
abstract class Skill(
    val name: String,
    val description: String,
    val maxLevel: Int = 8,
    var cooldown: Float = 1f
) {
    var level = 0
    var cooldownTimer = 0f
    var iconColor: Int = 0xFFFFFFFF.toInt()
    private var soundTimer = 0f

    protected fun playShootSound(world: GameWorld, interval: Float = 0.12f) {
        if (soundTimer <= 0) {
            world.playSound("shoot")
            soundTimer = interval
        }
    }

    protected fun tickSound(dt: Float) {
        if (soundTimer > 0) soundTimer -= dt
    }

    open fun canUpgrade(): Boolean = level < maxLevel
    open fun upgrade() { level++ }
    abstract fun upgradeDescription(): String
    abstract fun update(player: Player, world: GameWorld, dt: Float)

    protected fun findNearestEnemy(player: Player, world: GameWorld, maxDist: Float = 800f): Enemy? {
        var nearest: Enemy? = null
        var minDist = maxDist
        for (e in world.enemies) {
            if (!e.alive) continue
            val d = player.distTo(e)
            if (d < minDist) { minDist = d; nearest = e }
        }
        return nearest
    }

    protected fun findNearestEnemies(player: Player, world: GameWorld, count: Int, maxDist: Float = 800f): List<Enemy> {
        return world.enemies.filter { it.alive && player.distTo(it) < maxDist }
            .sortedBy { player.distTo(it) }
            .take(count)
    }
}

// ============ 基础攻击（初始技能） ============
class BasicAttackSkill : Skill(
    "基础攻击", "向最近敌人发射能量弹", 8, 0.6f
) {
    init { iconColor = 0xFF4FC3F7.toInt(); level = 1 }

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得基础攻击"
        else -> "弹道+1，伤害+20%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        cooldownTimer -= dt
        tickSound(dt)
        val actualCd = cooldown / player.effectiveAtkSpeed
        if (cooldownTimer <= 0) {
            val targets = findNearestEnemies(player, world, level, 700f)
            if (targets.isNotEmpty()) playShootSound(world)
            for (target in targets) {
                val dx = target.x - player.x
                val dy = target.y - player.y
                val dist = hypot(dx, dy)
                if (dist > 1) {
                    val speed = 500f
                    world.bullets.add(Bullet(
                        player.x, player.y,
                        dx / dist * speed, dy / dist * speed,
                        player.effectiveAtk * 0.8f,
                        pierce = 0, lifetime = 2f,
                        color = 0xFF81D4FA.toInt(), size = 5f
                    ))
                }
            }
            cooldownTimer = actualCd
        }
    }
}

// ============ 飞刀 ============
class KnifeSkill : Skill(
    "飞刀", "向最近敌人发射穿透飞刀", 8, 1.2f
) {
    init { iconColor = 0xFFE0E0E0.toInt() }

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得飞刀：发射1把穿透飞刀"
        else -> "飞刀数量+1，伤害+15%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)
        if (cooldownTimer <= 0) {
            val targets = findNearestEnemies(player, world, level, 750f)
            if (targets.isNotEmpty()) playShootSound(world, 0.15f)
            val dmg = player.effectiveAtk * (1.2f + level * 0.15f)
            for (target in targets) {
                val dx = target.x - player.x
                val dy = target.y - player.y
                val dist = hypot(dx, dy)
                if (dist > 1) {
                    val speed = 600f
                    world.bullets.add(Bullet(
                        player.x, player.y,
                        dx / dist * speed, dy / dist * speed,
                        dmg, pierce = 3, lifetime = 2.5f,
                        color = 0xFFFAFAFA.toInt(), size = 7f,
                        bulletType = "knife"
                    ))
                }
            }
            cooldownTimer = cooldown
        }
    }
}

// ============ 火球 ============
class FireballSkill : Skill(
    "火球术", "发射爆炸火球，范围伤害", 8, 2.5f
) {
    init { iconColor = 0xFFFF7043.toInt() }

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得火球术：爆炸范围伤害"
        else -> "伤害+25%，爆炸范围+15%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)
        if (cooldownTimer <= 0) {
            val target = findNearestEnemy(player, world, 800f)
            if (target != null) {
                playShootSound(world, 0.2f)
                val dx = target.x - player.x
                val dy = target.y - player.y
                val dist = hypot(dx, dy)
                if (dist > 1) {
                    val speed = 350f
                    val dmg = player.effectiveAtk * (2f + level * 0.25f)
                    val radius = 70f + level * 10f
                    val fb = Bullet(
                        player.x, player.y,
                        dx / dist * speed, dy / dist * speed,
                        dmg, pierce = 0, lifetime = 3f,
                        color = 0xFFFF5722.toInt(), size = 12f,
                        bulletType = "fireball"
                    )
                    fb.explosionRadius = radius
                    world.bullets.add(fb)
                }
                cooldownTimer = cooldown
            } else {
                cooldownTimer = 0.3f // 没敌人时快速重试
            }
        }
    }
}

// ============ 闪电链 ============
class LightningSkill : Skill(
    "闪电链", "闪电在敌人间跳跃", 8, 3f
) {
    init { iconColor = 0xFFFFEB3B.toInt() }

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得闪电链：跳跃3次"
        else -> "跳跃次数+1，伤害+20%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)
        if (cooldownTimer <= 0) {
            val firstTarget = findNearestEnemy(player, world, 700f)
            if (firstTarget != null) {
                playShootSound(world, 0.2f)
                val jumps = 2 + level
                val dmg = player.effectiveAtk * (1.5f + level * 0.2f)
                world.castLightning(player.x, player.y, firstTarget, jumps, dmg)
                cooldownTimer = cooldown
            } else {
                cooldownTimer = 0.3f
            }
        }
    }
}

// ============ 灼烧光环 ============
class AuraSkill : Skill(
    "灼烧光环", "持续对周围敌人造成伤害", 8, 0.5f
) {
    init { iconColor = 0xFFFFAB40.toInt() }
    private var tickTimer = 0f

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得灼烧光环：持续范围伤害"
        else -> "范围+15%，伤害+20%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        tickTimer -= dt
        if (tickTimer <= 0) {
            val range = 100f + level * 15f
            val dmg = player.effectiveAtk * (0.5f + level * 0.1f)
            for (e in world.enemies) {
                if (!e.alive) continue
                if (player.distTo(e) < range + e.radius) {
                    val killed = e.takeDamage(dmg)
                    world.addFloatingText(e.x, e.y - 20, dmg.toInt().toString(), 0xFFFFAB40.toInt(), size = 20f)
                    if (killed) world.onEnemyKilled(e)
                }
            }
            world.auraRadius = range
            world.auraActive = true
            tickTimer = 0.5f
        }
    }
}

// ============ 属性升级选项（非技能） ============
class StatUpgrade(
    val statName: String,
    val desc: String,
    val color: Int,
    val apply: (Player) -> Unit
)
