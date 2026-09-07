package com.grasscut.game.game

import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.hypot
import kotlin.random.Random

enum class GameState { MENU, PLAYING, PAUSED, LEVEL_UP, GAME_OVER, VICTORY }

class GameWorld {
    var state = GameState.MENU
    var gameTime = 0f
    val player = Player(GameConfig.MAP_WIDTH / 2, GameConfig.MAP_HEIGHT / 2)

    val enemies = mutableListOf<Enemy>()
    val bullets = mutableListOf<Bullet>()
    val xpGems = mutableListOf<XpGem>()
    val floatingTexts = mutableListOf<FloatingText>()
    val particles = mutableListOf<Particle>()

    // 输入方向（由 GameView 设置）
    var inputX = 0f
    var inputY = 0f

    // 升级选项
    var levelUpOptions = listOf<Any>()

    // 光环效果
    var auraActive = false
    var auraRadius = 0f

    // 闪电效果（用于渲染）
    val lightningBolts = mutableListOf<LightningBolt>()

    // 音效事件队列（GameView 消费）
    val soundEvents = mutableListOf<String>()
    private var pickupSoundTimer = 0f

    // 受伤红屏闪烁
    var hurtFlashTimer = 0f

    fun playSound(name: String) {
        soundEvents.add(name)
    }

    // 生成计时
    private var spawnTimer = 0f
    private var eliteWaveTimer = 0f
    private var bossSpawned = false

    private val spatialGrid = SpatialGrid(120f)
    private val random = Random(System.currentTimeMillis())

    fun startGame() {
        state = GameState.PLAYING
        gameTime = 0f
        player.x = GameConfig.MAP_WIDTH / 2
        player.y = GameConfig.MAP_HEIGHT / 2
        player.hp = player.effectiveMaxHp
        player.level = 1
        player.xp = 0
        player.xpToNext = GameConfig.xpToNext(1)
        player.kills = 0
        player.skills.clear()
        player.skills.add(BasicAttackSkill())
        // 重置属性加成
        player.atkBonus = 0f; player.atkSpeedBonus = 0f
        player.moveSpeedBonus = 0f; player.pickupRangeBonus = 0f
        player.maxHpBonus = 0f; player.critChance = 0f
        enemies.clear(); bullets.clear(); xpGems.clear()
        floatingTexts.clear(); particles.clear(); lightningBolts.clear(); soundEvents.clear()
        spawnTimer = 0f; eliteWaveTimer = 0f; bossSpawned = false
        auraActive = false
    }

    fun pause() {
        if (state == GameState.PLAYING) state = GameState.PAUSED
    }

    fun resume() {
        if (state == GameState.PAUSED) state = GameState.PLAYING
    }

    fun backToMenu() {
        state = GameState.MENU
    }

    fun update(dt: Float) {
        if (state != GameState.PLAYING) {
            // 非游戏中只更新飘字粒子
            updateEffects(dt)
            return
        }

        gameTime += dt
        if (pickupSoundTimer > 0) pickupSoundTimer -= dt
        if (hurtFlashTimer > 0) hurtFlashTimer -= dt

        // 胜利条件
        if (gameTime >= GameConfig.GAME_DURATION && enemies.isEmpty()) {
            state = GameState.VICTORY
            playSound("victory")
            return
        }

        updatePlayer(dt)
        updateSkills(dt)
        updateBullets(dt)
        updateEnemies(dt)
        updateXpGems(dt)
        updateEffects(dt)
        spawnEnemies(dt)
        cleanup()

        // 玩家死亡
        if (!player.alive) {
            state = GameState.GAME_OVER
            playSound("death")
        }
    }

    private fun updatePlayer(dt: Float) {
        if (player.invincibleTimer > 0) player.invincibleTimer -= dt

        val len = hypot(inputX, inputY)
        if (len > 0.1f) {
            val nx = inputX / len
            val ny = inputY / len
            player.x += nx * player.effectiveMoveSpeed * dt
            player.y += ny * player.effectiveMoveSpeed * dt
        }
        // 地图边界
        player.x = player.x.coerceIn(player.radius, GameConfig.MAP_WIDTH - player.radius)
        player.y = player.y.coerceIn(player.radius, GameConfig.MAP_HEIGHT - player.radius)
    }

    private fun updateSkills(dt: Float) {
        auraActive = false
        for (skill in player.skills) {
            skill.update(player, this, dt)
        }
    }

    private fun updateBullets(dt: Float) {
        val iter = bullets.iterator()
        while (iter.hasNext()) {
            val b = iter.next()
            b.x += b.vx * dt
            b.y += b.vy * dt
            b.lifetime -= dt

            // 记录拖尾
            b.trailTimer -= dt
            if (b.trailTimer <= 0) {
                b.trail.addLast(b.x to b.y)
                if (b.trail.size > 8) b.trail.removeFirst()
                b.trailTimer = 0.02f
            }

            if (b.lifetime <= 0 || b.x < 0 || b.x > GameConfig.MAP_WIDTH ||
                b.y < 0 || b.y > GameConfig.MAP_HEIGHT) {
                iter.remove()
                continue
            }

            // 碰撞检测
            var hit = false
            for (e in enemies) {
                if (!e.alive || b.hitEnemies.contains(e.hashCode())) continue
                if (b.distTo(e) < b.radius + e.radius) {
                    b.hitEnemies.add(e.hashCode())
                    var dmg = b.damage
                    var isCrit = false
                    if (random.nextFloat() < player.critChance) {
                        dmg *= player.critDamage
                        isCrit = true
                    }
                    val killed = e.takeDamage(dmg)
                    addFloatingText(e.x, e.y - e.radius - 5,
                        dmg.toInt().toString(),
                        if (isCrit) GameConfig.COLOR_DAMAGE_CRIT else GameConfig.COLOR_DAMAGE,
                        size = if (isCrit) 32f else 24f)
                    if (killed) onEnemyKilled(e)

                    // 火球爆炸
                    if (b.explosionRadius > 0) {
                        explode(b.x, b.y, b.explosionRadius, b.damage * 0.6f)
                        hit = true
                        break
                    }

                    if (b.pierce <= 0) { hit = true; break }
                    b.pierce--
                }
            }
            if (hit) iter.remove()
        }
    }

    private fun explode(x: Float, y: Float, radius: Float, damage: Float) {
        // 爆炸粒子（增强：更多、更大、更亮、多色）
        val explosionColors = intArrayOf(0xFFFF5722.toInt(), 0xFFFF9800.toInt(), 0xFFFFEB3B.toInt(), 0xFFFFF176.toInt())
        for (i in 0..35) {
            val angle = random.nextFloat() * 6.28f
            val speed = 150 + random.nextFloat() * 350
            particles.add(Particle(
                x, y,
                cos(angle) * speed, sin(angle) * speed,
                explosionColors[random.nextInt(explosionColors.size)],
                5 + random.nextFloat() * 8,
                0.35f + random.nextFloat() * 0.25f
            ))
        }
        // 中心闪光
        particles.add(Particle(x, y, 0f, 0f, 0xFFFFFFFF.toInt(), radius * 0.6f, 0.15f))
        for (e in enemies) {
            if (!e.alive) continue
            if (hypot(e.x - x, e.y - y) < radius + e.radius) {
                val killed = e.takeDamage(damage)
                if (killed) onEnemyKilled(e)
            }
        }
    }

    private fun updateEnemies(dt: Float) {
        // 重建空间分区
        spatialGrid.clear()
        for (e in enemies) if (e.alive) spatialGrid.insert(e)

        for (e in enemies) {
            if (!e.alive) continue
            if (e.hitFlash > 0) e.hitFlash -= dt
            if (e.attackCooldown > 0) e.attackCooldown -= dt

            // 追踪玩家
            val dx = player.x - e.x
            val dy = player.y - e.y
            val dist = hypot(dx, dy)
            if (dist > 1) {
                e.x += (dx / dist) * e.speed * dt
                e.y += (dy / dist) * e.speed * dt
            }

            // 攻击玩家
            if (dist < e.radius + player.radius + 5 && e.attackCooldown <= 0) {
                if (player.invincibleTimer <= 0) {
                    player.takeDamage(e.damage)
                    playSound("hurt")
                    hurtFlashTimer = 0.3f
                }
                e.attackCooldown = 0.8f
                // 击退
                if (dist > 1) {
                    e.x -= (dx / dist) * 20
                    e.y -= (dy / dist) * 20
                }
            }
        }

        // 敌人分离：防止大量敌人重叠推挤
        separateEnemies()
    }

    private fun separateEnemies() {
        for (e1 in enemies) {
            if (!e1.alive) continue
            val nearby = spatialGrid.queryNear(e1, 80f)
            for (obj in nearby) {
                if (obj === e1 || obj !is Enemy || !obj.alive) continue
                val e2 = obj
                val dx = e2.x - e1.x
                val dy = e2.y - e1.y
                val dist = hypot(dx, dy)
                val minDist = (e1.radius + e2.radius) * 0.75f
                if (dist > 0.1f && dist < minDist) {
                    val push = (minDist - dist) * 0.35f
                    val nx = dx / dist
                    val ny = dy / dist
                    e1.x -= nx * push * 0.5f
                    e1.y -= ny * push * 0.5f
                    e2.x += nx * push * 0.5f
                    e2.y += ny * push * 0.5f
                }
            }
        }
    }

    private fun updateXpGems(dt: Float) {
        val pickupRange = player.effectivePickupRange
        val iter = xpGems.iterator()
        while (iter.hasNext()) {
            val gem = iter.next()
            val dist = gem.distTo(player)

            // 吸引
            if (dist < pickupRange || gem.attracted) {
                gem.attracted = true
                gem.magnetTimer += dt
                val dx = player.x - gem.x
                val dy = player.y - gem.y
                val d = hypot(dx, dy)
                if (d > 1) {
                    gem.speed = minOf(gem.speed + 800f * dt, 600f)
                    gem.x += (dx / d) * gem.speed * dt
                    gem.y += (dy / d) * gem.speed * dt
                }
            }

            // 拾取
            if (dist < player.radius + 10) {
                val leveledUp = player.gainXp(gem.value)
                if (leveledUp) {
                    generateLevelUpOptions()
                    state = GameState.LEVEL_UP
                    playSound("levelup")
                } else if (pickupSoundTimer <= 0) {
                    playSound("pickup")
                    pickupSoundTimer = 0.12f
                }
                iter.remove()
            }
        }
    }

    private fun updateEffects(dt: Float) {
        // 飘字
        val ftIter = floatingTexts.iterator()
        while (ftIter.hasNext()) {
            val ft = ftIter.next()
            ft.y += ft.vy * dt
            ft.lifetime -= dt
            ft.alpha = (ft.lifetime / 0.8f * 255).toInt().coerceIn(0, 255)
            if (ft.lifetime <= 0) ftIter.remove()
        }
        // 粒子
        val pIter = particles.iterator()
        while (pIter.hasNext()) {
            val p = pIter.next()
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vx *= 0.95f
            p.vy *= 0.95f
            p.lifetime -= dt
            if (p.lifetime <= 0) pIter.remove()
        }
        // 闪电
        val lIter = lightningBolts.iterator()
        while (lIter.hasNext()) {
            val l = lIter.next()
            l.lifetime -= dt
            if (l.lifetime <= 0) lIter.remove()
        }
    }

    private fun spawnEnemies(dt: Float) {
        spawnTimer -= dt
        // 生成速率随时间增加
        val spawnInterval = maxOf(0.25f, 1.5f - gameTime * 0.005f)
        if (spawnTimer <= 0 && enemies.size < 600) {
            spawnEnemy()
            spawnTimer = spawnInterval
        }

        // 精英波（每60秒）
        eliteWaveTimer += dt
        if (eliteWaveTimer >= 60f) {
            eliteWaveTimer = 0f
            playSound("warning")
            for (i in 0..4) spawnEnemyAtEdge(EnemyType.ELITE)
        }

        // Boss（5分钟）
        if (!bossSpawned && gameTime >= 300f) {
            bossSpawned = true
            playSound("warning")
            spawnEnemyAtEdge(EnemyType.BOSS)
        }
    }

    private fun spawnEnemy() {
        val type = when {
            gameTime < 30 -> EnemyType.NORMAL
            gameTime < 60 -> if (random.nextFloat() < 0.2f) EnemyType.FAST else EnemyType.NORMAL
            gameTime < 120 -> {
                val r = random.nextFloat()
                when { r < 0.5f -> EnemyType.NORMAL; r < 0.8f -> EnemyType.FAST; else -> EnemyType.TANK }
            }
            else -> {
                val r = random.nextFloat()
                when { r < 0.35f -> EnemyType.NORMAL; r < 0.6f -> EnemyType.FAST; r < 0.85f -> EnemyType.TANK; else -> EnemyType.ELITE }
            }
        }
        spawnEnemyAtEdge(type)
    }

    private fun spawnEnemyAtEdge(type: EnemyType) {
        // 在玩家周围一定距离外生成
        val angle = random.nextFloat() * 6.28f
        val dist = 600 + random.nextFloat() * 200
        var x = player.x + cos(angle) * dist
        var y = player.y + sin(angle) * dist
        x = x.coerceIn(50f, GameConfig.MAP_WIDTH - 50f)
        y = y.coerceIn(50f, GameConfig.MAP_HEIGHT - 50f)
        enemies.add(Enemy(x, y, type, gameTime))
    }

    fun onEnemyKilled(e: Enemy) {
        player.kills++
        // 掉经验宝石
        val gemCount = when (e.type) {
            EnemyType.BOSS -> 20
            EnemyType.ELITE -> 5
            else -> 1
        }
        for (i in 0 until gemCount) {
            val offsetX = (random.nextFloat() - 0.5f) * 30
            val offsetY = (random.nextFloat() - 0.5f) * 30
            xpGems.add(XpGem(e.x + offsetX, e.y + offsetY, e.xpValue))
        }
        // 死亡粒子（增强：更多、更大）
        val color = GameConfig.ENEMY_COLORS[e.type.name.lowercase()] ?: 0xFF66BB6A.toInt()
        for (i in 0..14) {
            val angle = random.nextFloat() * 6.28f
            val speed = 80 + random.nextFloat() * 200
            particles.add(Particle(e.x, e.y, cos(angle)*speed, sin(angle)*speed, color, 4+random.nextFloat()*5, 0.35f))
        }
        // 击杀冲击波（环形均匀扩散）
        val shockCount = if (e.type == EnemyType.BOSS) 24 else if (e.type == EnemyType.ELITE) 16 else 10
        val shockSpeed = if (e.type == EnemyType.BOSS) 400f else 250f
        for (i in 0 until shockCount) {
            val angle = (i.toFloat() / shockCount) * 6.28f
            particles.add(Particle(e.x, e.y, cos(angle)*shockSpeed, sin(angle)*shockSpeed, 0xFFFFFFFF.toInt(), 4f, 0.25f))
        }
    }

    fun castLightning(startX: Float, startY: Float, firstTarget: Enemy, jumps: Int, damage: Float) {
        var current = firstTarget
        val hit = mutableSetOf<Enemy>()
        var prevX = startX
        var prevY = startY

        for (i in 0 until jumps) {
            if (!current.alive) break
            hit.add(current)
            lightningBolts.add(LightningBolt(prevX, prevY, current.x, current.y))

            var dmg = damage
            if (random.nextFloat() < player.critChance) dmg *= player.critDamage
            val killed = current.takeDamage(dmg)
            addFloatingText(current.x, current.y - current.radius - 5,
                dmg.toInt().toString(), 0xFFFFEB3B.toInt(), size = 28f)
            if (killed) onEnemyKilled(current)

            prevX = current.x
            prevY = current.y

            // 找下一个目标
            var next: Enemy? = null
            var minDist = 250f
            for (e in enemies) {
                if (!e.alive || hit.contains(e)) continue
                val d = current.distTo(e)
                if (d < minDist) { minDist = d; next = e }
            }
            if (next == null) break
            current = next
        }
    }

    fun addFloatingText(x: Float, y: Float, text: String, color: Int, lifetime: Float = 0.8f, size: Float = 24f) {
        floatingTexts.add(FloatingText(x, y, text, color, lifetime, size))
    }

    private fun generateLevelUpOptions() {
        val options = mutableListOf<Any>()
        val allSkills = listOf(KnifeSkill(), FireballSkill(), LightningSkill(), AuraSkill())

        // 可升级的已有技能
        val upgradableSkills = player.skills.filter { it.canUpgrade() && it !is BasicAttackSkill }
        for (s in upgradableSkills) options.add(s)

        // 未拥有的新技能
        val ownedNames = player.skills.map { it.name }.toSet()
        for (s in allSkills) {
            if (!ownedNames.contains(s.name)) options.add(s)
        }

        // 属性升级
        val statUpgrades = listOf(
            StatUpgrade("攻击力", "攻击力 +5", 0xFFEF5350.toInt()) { it.atkBonus += 5f },
            StatUpgrade("攻击速度", "攻击速度 +0.2", 0xFFFFAB40.toInt()) { it.atkSpeedBonus += 0.2f },
            StatUpgrade("移动速度", "移动速度 +30", 0xFF4FC3F7.toInt()) { it.moveSpeedBonus += 30f },
            StatUpgrade("最大生命", "最大生命 +20 并回满", 0xFF66BB6A.toInt()) { it.maxHpBonus += 20f; it.hp = it.effectiveMaxHp },
            StatUpgrade("拾取范围", "拾取范围 +40", 0xFF00E676.toInt()) { it.pickupRangeBonus += 40f },
            StatUpgrade("暴击率", "暴击率 +10%", 0xFFFFEB3B.toInt()) { it.critChance += 0.1f },
        )
        options.addAll(statUpgrades)

        // 随机选3个
        levelUpOptions = options.shuffled().take(3)
    }

    fun selectLevelUpOption(option: Any) {
        when (option) {
            is Skill -> {
                val existing = player.skills.find { it.name == option.name }
                if (existing != null) {
                    existing.upgrade()
                } else {
                    option.level = 1
                    player.skills.add(option)
                }
            }
            is StatUpgrade -> option.apply(player)
        }
        state = GameState.PLAYING
    }

    private fun cleanup() {
        enemies.removeAll { !it.alive }
    }
}

class LightningBolt(
    val x1: Float, val y1: Float,
    val x2: Float, val y2: Float,
    var lifetime: Float = 0.15f
)
