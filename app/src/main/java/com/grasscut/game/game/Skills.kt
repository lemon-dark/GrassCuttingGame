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
    var evolved = false  // 超武进化标志
    open val evolutionName: String = ""  // 超武名称
    private var soundTimer = 0f

    protected fun playShootSound(world: GameWorld, interval: Float = 0.12f, rate: Float = 1f) {
        if (soundTimer <= 0) {
            world.playSound("shoot", rate)
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
    override val evolutionName = "三联能量炮"

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得基础攻击"
        else -> "弹道+1，伤害+20%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        cooldownTimer -= dt
        tickSound(dt)
        val actualCd = cooldown / player.effectiveAtkSpeed
        if (cooldownTimer <= 0) {
            if (evolved) {
                // 超武：三联能量炮——3发扇形大子弹，穿透5
                val target = findNearestEnemy(player, world, 700f)
                if (target != null) {
                    playShootSound(world, 0.1f, 1.0f)
                    val baseAngle = atan2(target.y - player.y, target.x - player.x)
                    val dmg = player.effectiveAtk * 1.5f
                    for (i in -1..1) {
                        val angle = baseAngle + i * 0.26f  // ±15度
                        world.bullets.add(Bullet(
                            player.x, player.y,
                            cos(angle) * 550f, sin(angle) * 550f,
                            dmg, pierce = 5, lifetime = 2.5f,
                            color = 0xFF00E5FF.toInt(), size = 28f,
                            bulletType = "energy_big"
                        ))
                    }
                    cooldownTimer = actualCd * 0.8f
                } else {
                    cooldownTimer = 0.2f
                }
            } else {
                val targets = findNearestEnemies(player, world, level, 700f)
                if (targets.isNotEmpty()) playShootSound(world, rate = 1.0f)
                for (target in targets) {
                    val dx = target.x - player.x
                    val dy = target.y - player.y
                    val dist = hypot(dx, dy)
                    if (dist > 1) {
                        val speed = 500f
                        world.bullets.add(Bullet(
                            player.x, player.y,
                            dx / dist * speed, dy / dist * speed,
                            player.effectiveAtk * 1.0f,
                            pierce = 0, lifetime = 2f,
                            color = 0xFF81D4FA.toInt(), size = 10f
                        ))
                    }
                }
                cooldownTimer = actualCd
            }
        }
    }
}

// ============ 飞刀 ============
class KnifeSkill : Skill(
    "飞刀", "向最近敌人发射穿透飞刀", 8, 1.2f
) {
    init { iconColor = 0xFFE0E0E0.toInt() }
    override val evolutionName = "万剑归宗"

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得飞刀：发射1把穿透飞刀"
        else -> "飞刀数量+1，伤害+15%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)

        if (evolved) {
            // 超武：万剑归宗——确保8把环绕飞刀存在
            if (world.orbitingKnives.size < 8) {
                for (i in world.orbitingKnives.size until 8) {
                    world.orbitingKnives.add(OrbitingKnife(
                        angle = i * (Math.PI.toFloat() * 2 / 8),
                        radius = 130f,
                        damage = player.effectiveAtk * 2f
                    ))
                }
            }
            // 每1.5秒发射12把扇形穿透飞刀
            if (cooldownTimer <= 0) {
                val target = findNearestEnemy(player, world, 800f)
                if (target != null) {
                    playShootSound(world, 0.15f, 1.5f)
                    val baseAngle = atan2(target.y - player.y, target.x - player.x)
                    val dmg = player.effectiveAtk * (2f + level * 0.3f)
                    for (i in 0 until 12) {
                        val angle = baseAngle + (i - 5.5f) * 0.12f  // 66度扇形
                        world.bullets.add(Bullet(
                            player.x, player.y,
                            cos(angle) * 650f, sin(angle) * 650f,
                            dmg, pierce = 5, lifetime = 3f,
                            color = 0xFFE0E0E0.toInt(), size = 16f,
                            bulletType = "knife"
                        ))
                    }
                    cooldownTimer = 1.5f
                } else {
                    cooldownTimer = 0.3f
                }
            }
        } else {
            if (cooldownTimer <= 0) {
                val targets = findNearestEnemies(player, world, level, 750f)
                if (targets.isNotEmpty()) playShootSound(world, 0.15f, 1.5f)
                val dmg = player.effectiveAtk * (1.5f + level * 0.2f)
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
                            color = 0xFFFAFAFA.toInt(), size = 14f,
                            bulletType = "knife"
                        ))
                    }
                }
                cooldownTimer = cooldown
            }
        }
    }
}

// ============ 火球 ============
class FireballSkill : Skill(
    "火球术", "发射爆炸火球，范围伤害", 8, 2.5f
) {
    init { iconColor = 0xFFFF7043.toInt() }
    override val evolutionName = "陨石雨"

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得火球术：爆炸范围伤害"
        else -> "伤害+25%，爆炸范围+15%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)

        if (evolved) {
            // 超武：陨石雨——每1.2秒在3个随机敌人位置召唤陨石
            if (cooldownTimer <= 0) {
                val targets = findNearestEnemies(player, world, 3, 900f)
                if (targets.isNotEmpty()) {
                    playShootSound(world, 0.2f, 0.7f)
                    val dmg = player.effectiveAtk * (3f + level * 0.4f)
                    val radius = 200f + level * 25f
                    for (target in targets) {
                        world.meteorStrikes.add(MeteorStrike(
                            targetX = target.x + (Math.random().toFloat() - 0.5f) * 60,
                            targetY = target.y + (Math.random().toFloat() - 0.5f) * 60,
                            damage = dmg,
                            radius = radius
                        ))
                    }
                    cooldownTimer = 1.2f
                } else {
                    cooldownTimer = 0.3f
                }
            }
        } else {
            if (cooldownTimer <= 0) {
                val target = findNearestEnemy(player, world, 800f)
                if (target != null) {
                    playShootSound(world, 0.2f, 0.7f)
                    val dx = target.x - player.x
                    val dy = target.y - player.y
                    val dist = hypot(dx, dy)
                    if (dist > 1) {
                        val speed = 350f
                        val dmg = player.effectiveAtk * (2.5f + level * 0.3f)
                        val radius = 140f + level * 20f
                        val fb = Bullet(
                            player.x, player.y,
                            dx / dist * speed, dy / dist * speed,
                            dmg, pierce = 0, lifetime = 3f,
                            color = 0xFFFF5722.toInt(), size = 24f,
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
}

// ============ 闪电链 ============
class LightningSkill : Skill(
    "闪电链", "闪电在敌人间跳跃", 8, 3f
) {
    init { iconColor = 0xFFFFEB3B.toInt() }
    override val evolutionName = "雷神之怒"

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
                playShootSound(world, 0.2f, 1.8f)
                if (evolved) {
                    // 超武：雷神之怒——跳跃×2，宽度×3，每个命中点小爆炸
                    val jumps = (2 + level) * 2
                    val dmg = player.effectiveAtk * (2.5f + level * 0.3f)
                    world.castLightning(player.x, player.y, firstTarget, jumps, dmg, powerful = true)
                    cooldownTimer = cooldown * 0.8f
                } else {
                    val jumps = 2 + level
                    val dmg = player.effectiveAtk * (2.0f + level * 0.25f)
                    world.castLightning(player.x, player.y, firstTarget, jumps, dmg)
                    cooldownTimer = cooldown
                }
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
    override val evolutionName = "太阳风暴"
    private var tickTimer = 0f
    private var novaTimer = 0f

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得灼烧光环：持续范围伤害"
        else -> "范围+15%，伤害+20%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        // 每帧都显示光环（不再闪烁）
        val range = if (evolved) (200f + level * 30f) * 1.8f else 200f + level * 30f
        world.auraRadius = range
        world.auraActive = true
        world.auraEvolved = evolved

        tickTimer -= dt
        if (tickTimer <= 0) {
            val dmg = if (evolved) player.effectiveAtk * (1.0f + level * 0.2f) else player.effectiveAtk * (0.7f + level * 0.15f)
            for (e in world.enemies) {
                if (!e.alive) continue
                if (player.distTo(e) < range + e.radius) {
                    val killed = e.takeDamage(dmg)
                    world.addFloatingText(e.x, e.y - 20, dmg.toInt().toString(), 0xFFFFAB40.toInt(), size = 20f)
                    if (killed) world.onEnemyKilled(e)
                }
            }
            tickTimer = if (evolved) 0.4f else 0.5f
        }

        // 超武：太阳风暴——每3秒触发全屏新星爆炸+击退
        if (evolved) {
            novaTimer -= dt
            if (novaTimer <= 0) {
                val novaDmg = player.effectiveAtk * (3f + level * 0.4f)
                val novaRadius = range * 1.5f
                world.triggerExplosion(player.x, player.y, novaRadius, 0xFFFF6D00.toInt(), 40)
                world.triggerShake(15f, 0.3f)
                for (e in world.enemies) {
                    if (!e.alive) continue
                    val d = player.distTo(e)
                    if (d < novaRadius + e.radius) {
                        val killed = e.takeDamage(novaDmg)
                        // 击退
                        if (d > 1) {
                            val knockback = 150f
                            e.x += (e.x - player.x) / d * knockback
                            e.y += (e.y - player.y) / d * knockback
                        }
                        if (killed) world.onEnemyKilled(e)
                    }
                }
                novaTimer = 3f
            }
        }
    }
}

// ============ 追踪导弹 ============
class MissileSkill : Skill(
    "追踪导弹", "发射自动追踪敌人的导弹，命中爆炸", 8, 1.8f
) {
    init { iconColor = 0xFFFF5722.toInt() }
    override val evolutionName = "全屏导弹雨"

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得追踪导弹：自动锁定敌人"
        else -> "导弹数量+1，伤害+20%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)
        if (cooldownTimer <= 0) {
            val count = if (evolved) 8 else level
            val targets = findNearestEnemies(player, world, count, 900f)
            if (targets.isNotEmpty()) {
                playShootSound(world, 0.18f, 0.8f)
                val dmg = player.effectiveAtk * (1.8f + level * 0.25f)
                val expRadius = if (evolved) 120f else 80f
                for (i in targets.indices) {
                    val angle = (i.toFloat() / targets.size) * 6.28f + randomAngle()
                    val speed = 350f
                    val missile = Bullet(
                        player.x + cos(angle) * 40, player.y + sin(angle) * 40,
                        cos(angle) * speed, sin(angle) * speed,
                        dmg, pierce = 0, lifetime = 4f,
                        color = 0xFFFF6D00.toInt(), size = 14f,
                        bulletType = "missile"
                    )
                    missile.homing = true
                    missile.homingStrength = if (evolved) 5f else 3.5f
                    missile.explosionRadius = expRadius
                    world.bullets.add(missile)
                }
                cooldownTimer = if (evolved) cooldown * 0.7f else cooldown
            } else {
                cooldownTimer = 0.3f
            }
        }
    }

    private fun randomAngle(): Float = (Math.random() * 6.28).toFloat()
}

// ============ 冰锥术 ============
class IceSpikeSkill : Skill(
    "冰锥术", "发射冰锥，命中后减速敌人", 8, 1.5f
) {
    init { iconColor = 0xFF4FC3F7.toInt() }
    override val evolutionName = "绝对零度"

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得冰锥术：减速敌人50%"
        else -> "冰锥数量+1，伤害+15%，减速效果增强"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        cooldownTimer -= dt
        tickSound(dt)
        if (cooldownTimer <= 0) {
            if (evolved) {
                // 超武：绝对零度——大范围冰冻光环+持续伤害
                val range = 250f + level * 25f
                val dmg = player.effectiveAtk * (1.2f + level * 0.2f)
                for (e in world.enemies) {
                    if (!e.alive) continue
                    if (player.distTo(e) < range + e.radius) {
                        val killed = e.takeDamage(dmg)
                        e.slowTimer = 1.5f
                        e.slowFactor = 0.2f  // 减速80%
                        world.addFloatingText(e.x, e.y - 10, "冰冻!", 0xFF4FC3F7.toInt(), size = 20f)
                        if (killed) world.onEnemyKilled(e)
                    }
                }
                // 冰冻光环视觉
                world.triggerExplosion(player.x, player.y, range, 0xFF4FC3F7.toInt(), 15, withFlash = false, withShake = false)
                cooldownTimer = 1.2f
            } else {
                val targets = findNearestEnemies(player, world, level, 800f)
                if (targets.isNotEmpty()) {
                    playShootSound(world, 0.15f, 1.3f)
                    val dmg = player.effectiveAtk * (1.2f + level * 0.2f)
                    val slowFactor = (0.5f - level * 0.03f).coerceAtLeast(0.3f)  // 减速50%→26%
                    for (target in targets) {
                        val dx = target.x - player.x
                        val dy = target.y - player.y
                        val dist = hypot(dx, dy)
                        if (dist > 1) {
                            val speed = 480f
                            val spike = Bullet(
                                player.x, player.y,
                                dx / dist * speed, dy / dist * speed,
                                dmg, pierce = 1, lifetime = 2.5f,
                                color = 0xFF4FC3F7.toInt(), size = 12f,
                                bulletType = "ice_spike"
                            )
                            spike.slowFactor = slowFactor
                            spike.slowDuration = 2f
                            world.bullets.add(spike)
                        }
                    }
                    cooldownTimer = cooldown
                } else {
                    cooldownTimer = 0.3f
                }
            }
        }
    }
}

// ============ 旋风斩 ============
class WhirlwindSkill : Skill(
    "旋风斩", "风刃围绕玩家旋转，持续近战伤害", 8, 0f
) {
    init { iconColor = 0xFFB0BEC5.toInt() }
    override val evolutionName = "风暴领主"

    override fun upgradeDescription(): String = when {
        level == 0 -> "获得旋风斩：3道旋转风刃"
        else -> "风刃数量+1，伤害+20%，范围+10%"
    }

    override fun update(player: Player, world: GameWorld, dt: Float) {
        if (level == 0) return
        // 旋风斩是持续效果，不需要cooldown，直接在world里维护
        val bladeCount = if (evolved) 6 else 2 + level
        val radius = if (evolved) 180f + level * 15f else 120f + level * 12f
        val dmg = player.effectiveAtk * (0.6f + level * 0.12f)

        world.whirlwindBlades.clear()
        for (i in 0 until bladeCount) {
            val angle = world.gameTime * 3f + (i.toFloat() / bladeCount) * 6.28f
            val bx = player.x + cos(angle) * radius
            val by = player.y + sin(angle) * radius
            world.whirlwindBlades.add(WhirlwindBlade(bx, by, angle, radius, dmg, evolved))
        }

        // 风刃碰撞检测
        for (blade in world.whirlwindBlades) {
            for (e in world.enemies) {
                if (!e.alive) continue
                if (hypot(e.x - blade.x, e.y - blade.y) < e.radius + 20f) {
                    if (blade.hitCooldown <= 0) {
                        val killed = e.takeDamage(blade.damage)
                        world.addFloatingText(e.x, e.y - 10, blade.damage.toInt().toString(), 0xFFB0BEC5.toInt(), size = 18f)
                        // 超武：击退
                        if (blade.powerful) {
                            val d = hypot(e.x - player.x, e.y - player.y)
                            if (d > 1) {
                                e.x += (e.x - player.x) / d * 30f
                                e.y += (e.y - player.y) / d * 30f
                            }
                        }
                        if (killed) world.onEnemyKilled(e)
                        blade.hitCooldown = 0.3f
                    }
                }
            }
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
