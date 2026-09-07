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
    val explosions = mutableListOf<Explosion>()
    val orbitingKnives = mutableListOf<OrbitingKnife>()
    val meteorStrikes = mutableListOf<MeteorStrike>()
    val whirlwindBlades = mutableListOf<WhirlwindBlade>()

    // 光环进化标志（用于渲染3层旋转环）
    var auraEvolved = false

    // 进化提示（名称 + 时间戳）
    var evolutionNotice: Pair<String, Long>? = null

    // 慢动作
    var timeScale = 1f
    var slowMoDuration = 0f

    // 屏幕震动（GameView 消费）
    var shakeAmount = 0f
    var shakeDuration = 0f

    // 全屏闪光（GameView 消费）
    var flashColor = 0
    var flashAlpha = 0
    var flashDuration = 0f

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
    // 语音事件队列（GameView 消费）
    val voiceEvents = mutableListOf<String>()
    private var pickupSoundTimer = 0f
    private var voiceCooldown = 0f  // 语音冷却，避免太频繁

    // 受伤红屏闪烁
    var hurtFlashTimer = 0f

    fun playSound(name: String) {
        soundEvents.add(name)
    }

    fun playVoice(name: String) {
        if (voiceCooldown <= 0) {
            voiceEvents.add(name)
            voiceCooldown = 0.8f  // 语音最小间隔0.8秒
        }
    }

    // 触发爆炸（冲击波环+粒子+震动+闪光）
    fun triggerExplosion(x: Float, y: Float, radius: Float, color: Int, particleCount: Int = 30, withFlash: Boolean = true, withShake: Boolean = true) {
        explosions.add(Explosion(x, y, radius, color))
        // 粒子爆发
        val count = particleCount.coerceAtMost(50)
        for (i in 0 until count) {
            val angle = Random.nextFloat() * Math.PI.toFloat() * 2
            val speed = 100f + Random.nextFloat() * 300f
            particles.add(Particle(
                x, y,
                cos(angle) * speed, sin(angle) * speed,
                color, 4f + Random.nextFloat() * 4f,
                0.4f + Random.nextFloat() * 0.4f,
                gravity = 200f, drag = 0.96f,
                startColor = color, endColor = 0xFFFFFFFF.toInt()
            ))
        }
        if (withShake) triggerShake(radius * 0.03f, 0.2f)
        if (withFlash) triggerFlash(0xFFFFFFFF.toInt(), 0.08f)
    }

    fun triggerShake(amount: Float, duration: Float) {
        shakeAmount = maxOf(shakeAmount, amount)
        shakeDuration = maxOf(shakeDuration, duration)
    }

    fun triggerFlash(color: Int, duration: Float) {
        flashColor = color
        flashAlpha = 180
        flashDuration = duration
    }

    fun triggerSlowMotion(duration: Float) {
        slowMoDuration = duration
        timeScale = 0.2f
    }

    // 生成计时
    private var spawnTimer = 0f
    private var eliteWaveTimer = 0f
    private var bossSpawned = false
    private var finalWaveAnnounced = false

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
        explosions.clear(); orbitingKnives.clear(); meteorStrikes.clear(); whirlwindBlades.clear()
        voiceEvents.clear()
        spawnTimer = 0f; eliteWaveTimer = 0f; bossSpawned = false; finalWaveAnnounced = false
        auraActive = false; auraEvolved = false
        timeScale = 1f; slowMoDuration = 0f
        evolutionNotice = null
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

        // 慢动作处理
        if (slowMoDuration > 0) {
            slowMoDuration -= dt
            if (slowMoDuration <= 0) timeScale = 1f
        }
        val sdt = dt * timeScale  // 缩放后的游戏时间

        gameTime += sdt
        if (pickupSoundTimer > 0) pickupSoundTimer -= sdt
        if (hurtFlashTimer > 0) hurtFlashTimer -= sdt
        if (voiceCooldown > 0) voiceCooldown -= sdt

        // 胜利条件
        if (gameTime >= GameConfig.GAME_DURATION && enemies.isEmpty()) {
            state = GameState.VICTORY
            playSound("victory")
            return
        }

        updatePlayer(sdt)
        updateSkills(sdt)
        updateBullets(sdt)
        updateEnemies(sdt)
        updateXpGems(sdt)
        // 超武：环绕飞刀和陨石
        for (knife in orbitingKnives) knife.update(player, this, sdt)
        val mIter = meteorStrikes.iterator()
        while (mIter.hasNext()) {
            val m = mIter.next()
            m.update(this, dt)
            if (!m.alive) mIter.remove()
        }
        // 旋风斩风刃冷却更新
        for (blade in whirlwindBlades) {
            if (blade.hitCooldown > 0) blade.hitCooldown -= sdt
        }
        updateEffects(dt)  // 特效用真实时间（慢动作时特效正常速度）
        spawnEnemies(sdt)
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
        player.isMoving = len > 0.1f
        if (len > 0.1f) {
            val nx = inputX / len
            val ny = inputY / len
            player.x += nx * player.effectiveMoveSpeed * dt
            player.y += ny * player.effectiveMoveSpeed * dt
            // 朝向：水平移动方向决定翻转
            if (nx > 0.1f) player.facingRight = true
            else if (nx < -0.1f) player.facingRight = false
            // 行走动画：每0.15秒切换一帧
            player.animTimer += dt
            if (player.animTimer >= 0.15f) {
                player.animTimer = 0f
                player.animFrame = (player.animFrame + 1) % 4
            }
        } else {
            // 站立时回到第0帧（呼吸感）
            player.animFrame = 0
            player.animTimer = 0f
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

            // 追踪导弹：每帧调整速度方向指向最近敌人
            if (b.homing) {
                var nearest: Enemy? = null
                var minDist = 600f
                for (e in enemies) {
                    if (!e.alive) continue
                    val d = b.distTo(e)
                    if (d < minDist) { minDist = d; nearest = e }
                }
                if (nearest != null) {
                    val dx = nearest.x - b.x
                    val dy = nearest.y - b.y
                    val dist = hypot(dx, dy)
                    if (dist > 1) {
                        val targetVx = dx / dist
                        val targetVy = dy / dist
                        val curSpeed = hypot(b.vx, b.vy)
                        // 平滑转向
                        val t = (b.homingStrength * dt).coerceAtMost(1f)
                        b.vx = (b.vx / curSpeed * (1 - t) + targetVx * t) * curSpeed
                        b.vy = (b.vy / curSpeed * (1 - t) + targetVy * t) * curSpeed
                    }
                }
            }

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
                        size = if (isCrit) 64f else 48f)
                    if (killed) onEnemyKilled(e)

                    // 冰锥减速效果
                    if (b.slowDuration > 0) {
                        e.slowTimer = b.slowDuration
                        e.slowFactor = b.slowFactor
                    }

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
        // 爆炸冲击波环（暗色，不抢终极大招的风头）
        explosions.add(Explosion(x, y, radius, 0xFFE65100.toInt(), 0.3f))
        // 屏幕震动（小幅）
        triggerShake(radius * 0.02f, 0.12f)
        // 爆炸粒子（减少数量、暗色、无全屏闪光）
        val explosionColors = intArrayOf(0xFFE65100.toInt(), 0xFFEF6C00.toInt(), 0xFFF57F17.toInt())
        for (i in 0..18) {
            val angle = random.nextFloat() * 6.28f
            val speed = 120 + random.nextFloat() * 250
            particles.add(Particle(
                x, y,
                cos(angle) * speed, sin(angle) * speed,
                explosionColors[random.nextInt(explosionColors.size)],
                4 + random.nextFloat() * 5,
                0.3f + random.nextFloat() * 0.2f,
                gravity = 100f, drag = 0.95f
            ))
        }
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
            // 减速效果递减
            if (e.slowTimer > 0) {
                e.slowTimer -= dt
                if (e.slowTimer <= 0) e.slowFactor = 1f
            }

            // 追踪玩家
            val dx = player.x - e.x
            val dy = player.y - e.y
            val dist = hypot(dx, dy)
            if (dist > 1) {
                val effectiveSpeed = e.speed * e.slowFactor
                e.x += (dx / dist) * effectiveSpeed * dt
                e.y += (dy / dist) * effectiveSpeed * dt
                // 朝向
                if (dx > 0) e.facingRight = true else e.facingRight = false
                // 行走动画：速度越快帧切换越快
                val animInterval = when (e.type) {
                    EnemyType.FAST -> 0.1f
                    EnemyType.TANK -> 0.25f
                    EnemyType.BOSS -> 0.22f
                    else -> 0.16f
                }
                e.animTimer += dt
                if (e.animTimer >= animInterval) {
                    e.animTimer = 0f
                    e.animFrame = (e.animFrame + 1) % 4
                }
            }

            // 攻击玩家
            if (dist < e.radius + player.radius + 5 && e.attackCooldown <= 0) {
                if (player.invincibleTimer <= 0) {
                    player.takeDamage(e.damage)
                    playSound("hurt")
                    hurtFlashTimer = 0.3f
                    if (random.nextFloat() < 0.15f) playVoice("hurt")
                    // 低血量语音
                    if (player.hp < player.effectiveMaxHp * 0.3f && random.nextFloat() < 0.2f) {
                        playVoice("lowhp")
                    }
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
                    playVoice("levelup")
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
        // 粒子（使用新的 update 方法，包含重力/阻力/颜色渐变）
        val pIter = particles.iterator()
        while (pIter.hasNext()) {
            val p = pIter.next()
            p.update(dt)
            if (!p.alive) pIter.remove()
        }
        // 爆炸
        val eIter = explosions.iterator()
        while (eIter.hasNext()) {
            val e = eIter.next()
            e.update(dt)
            if (!e.alive) eIter.remove()
        }
        // 闪电
        val lIter = lightningBolts.iterator()
        while (lIter.hasNext()) {
            val l = lIter.next()
            l.update(dt)
            if (!l.alive) lIter.remove()
        }
        // 屏幕震动衰减
        if (shakeDuration > 0) {
            shakeDuration -= dt
            shakeAmount *= 0.92f
            if (shakeDuration <= 0) shakeAmount = 0f
        }
        // 全屏闪光衰减
        if (flashDuration > 0) {
            flashDuration -= dt
            flashAlpha = (180 * (flashDuration / 0.1f)).toInt().coerceIn(0, 255)
            if (flashDuration <= 0) flashAlpha = 0
        }
    }

    private fun spawnEnemies(dt: Float) {
        // 到10分钟停止生成敌人，进入清场阶段
        if (gameTime >= GameConfig.GAME_DURATION) {
            if (!finalWaveAnnounced) {
                finalWaveAnnounced = true
                playSound("warning")
                addFloatingText(player.x, player.y - 100, "最终波次！清场后胜利！", 0xFFFF6D00.toInt(), lifetime = 3f, size = 48f)
            }
            return
        }
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

        // Boss（4分钟）
        if (!bossSpawned && gameTime >= 240f) {
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
        // 战斗语音：普通敌人1%概率（割草杀太多，不能太频繁），精英/Boss 15%概率
        when (e.type) {
            EnemyType.BOSS, EnemyType.ELITE -> {
                if (random.nextFloat() < 0.15f) playVoice("kill")
            }
            else -> {
                if (random.nextFloat() < 0.01f) playVoice("attack")
            }
        }
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
        // 爆炸特效（冲击波环）——精英/坦克低强度无闪光，Boss保留全屏特效突出终极大招
        when (e.type) {
            EnemyType.BOSS -> {
                triggerExplosion(e.x, e.y, 400f, 0xFFFF6D00.toInt(), 50)
                triggerSlowMotion(0.4f)
                playSound("death")
            }
            EnemyType.ELITE -> {
                // 精英怪：无全屏闪光、小震动、少粒子、短慢动作
                triggerExplosion(e.x, e.y, 180f, 0xFFD500F9.toInt(), 18, withFlash = false, withShake = true)
                triggerSlowMotion(0.12f)
            }
            EnemyType.TANK -> {
                // 坦克：无闪光无震动，仅冲击波环
                triggerExplosion(e.x, e.y, 120f, 0xFF9D00FF.toInt(), 10, withFlash = false, withShake = false)
            }
            else -> {
                // 普通敌人：不显示爆炸环（太频繁），仅保留死亡粒子
            }
        }
    }

    fun castLightning(startX: Float, startY: Float, firstTarget: Enemy, jumps: Int, damage: Float, powerful: Boolean = false) {
        var current = firstTarget
        val hit = mutableSetOf<Enemy>()
        var prevX = startX
        var prevY = startY

        for (i in 0 until jumps) {
            if (!current.alive) break
            hit.add(current)
            val boltWidth = if (powerful) 8f else 3f
            val boltColor = if (powerful) 0xFF00E5FF.toInt() else 0xFFFFEB3B.toInt()
            lightningBolts.add(LightningBolt(prevX, prevY, current.x, current.y, width = boltWidth, color = boltColor))

            var dmg = damage
            if (random.nextFloat() < player.critChance) dmg *= player.critDamage
            val killed = current.takeDamage(dmg)
            addFloatingText(current.x, current.y - current.radius - 5,
                dmg.toInt().toString(), if (powerful) 0xFF00E5FF.toInt() else 0xFFFFEB3B.toInt(), size = if (powerful) 64f else 56f)
            if (killed) {
                onEnemyKilled(current)
            } else if (powerful) {
                // 超武：每个命中点触发小爆炸
                triggerExplosion(current.x, current.y, 80f, 0xFF00E5FF.toInt(), 10)
            }

            prevX = current.x
            prevY = current.y

            // 找下一个目标
            var next: Enemy? = null
            var minDist = if (powerful) 350f else 250f
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
        val allSkills = listOf(KnifeSkill(), FireballSkill(), LightningSkill(), AuraSkill(), MissileSkill(), IceSpikeSkill(), WhirlwindSkill())

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
        // 升级后检测超武进化
        checkEvolutions()
        state = GameState.PLAYING
    }

    private fun cleanup() {
        enemies.removeAll { !it.alive }
    }

    // 超武进化检测：每次升级后调用
    fun checkEvolutions() {
        for (skill in player.skills) {
            if (skill.evolved) continue
            if (skill.level < 8) continue
            val canEvolve = when (skill) {
                is BasicAttackSkill -> player.atkSpeedBonus >= 3f
                is KnifeSkill -> player.atkBonus >= 30f
                is FireballSkill -> player.pickupRangeBonus >= 30f
                is LightningSkill -> player.critChance >= 0.15f
                is AuraSkill -> player.maxHpBonus >= 30f
                is MissileSkill -> player.atkBonus >= 25f
                is IceSpikeSkill -> player.pickupRangeBonus >= 25f
                is WhirlwindSkill -> player.moveSpeedBonus >= 60f
                else -> false
            }
            if (canEvolve) {
                skill.evolved = true
                evolutionNotice = skill.evolutionName to System.currentTimeMillis()
                playSound("levelup")
                playVoice("ultimate")
                triggerFlash(0xFF00E5FF.toInt(), 0.2f)
                triggerShake(8f, 0.3f)
            }
        }
    }
}

// ============ 环绕飞刀（万剑归宗超武） ============
class OrbitingKnife(
    var angle: Float,
    var radius: Float,
    var damage: Float
) {
    var x = 0f
    var y = 0f
    private var hitCooldown = 0f

    fun update(player: Player, world: GameWorld, dt: Float) {
        angle += 2.5f * dt  // 旋转速度
        x = player.x + cos(angle) * radius
        y = player.y + sin(angle) * radius
        if (hitCooldown > 0) hitCooldown -= dt
        // 碰撞检测
        if (hitCooldown <= 0) {
            for (e in world.enemies) {
                if (!e.alive) continue
                if (hypot(e.x - x, e.y - y) < e.radius + 18f) {
                    val killed = e.takeDamage(damage)
                    world.addFloatingText(e.x, e.y - 10, damage.toInt().toString(), 0xFFE0E0E0.toInt(), size = 18f)
                    if (killed) world.onEnemyKilled(e)
                    hitCooldown = 0.3f
                    break
                }
            }
        }
    }
}

// ============ 陨石打击（陨石雨超武） ============
class MeteorStrike(
    var targetX: Float,
    var targetY: Float,
    var damage: Float,
    var radius: Float
) {
    var progress = 0f  // 0→1，落下进度
    val fallDuration = 0.6f
    var exploded = false

    fun update(world: GameWorld, dt: Float) {
        progress += dt / fallDuration
        if (progress >= 1f && !exploded) {
            exploded = true
            // 落地大爆炸
            world.triggerExplosion(targetX, targetY, radius, 0xFFFF6D00.toInt(), 45)
            world.triggerShake(12f, 0.25f)
            for (e in world.enemies) {
                if (!e.alive) continue
                if (hypot(e.x - targetX, e.y - targetY) < radius + e.radius) {
                    val killed = e.takeDamage(damage)
                    if (killed) world.onEnemyKilled(e)
                }
            }
        }
    }

    val alive get() = progress < 1.2f  // 爆炸后保留0.2秒用于渲染余波
}
