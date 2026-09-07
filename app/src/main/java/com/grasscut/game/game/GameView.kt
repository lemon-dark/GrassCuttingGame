package com.grasscut.game.game

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.PorterDuff
import android.graphics.Rect
import android.graphics.RectF
import android.media.AudioAttributes
import android.media.SoundPool
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.grasscut.game.R
import kotlin.math.hypot
import kotlin.math.min

class GameView(context: Context, attrs: AttributeSet? = null) : SurfaceView(context, attrs),
    SurfaceHolder.Callback, Runnable {

    private val world = GameWorld()
    private var thread: Thread? = null
    private var running = false
    private var canvasWidth = 0
    private var canvasHeight = 0

    // 相机
    private var cameraX = 0f
    private var cameraY = 0f

    // 虚拟摇杆
    private var joystickActive = false
    private var joystickBaseX = 0f
    private var joystickBaseY = 0f
    private var joystickX = 0f
    private var joystickY = 0f
    private var joystickPointerId = -1

    // 画笔
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textAlign = Paint.Align.CENTER
    }

    // 音效
    private lateinit var soundPool: SoundPool
    private val soundIds = HashMap<String, Int>()
    private var soundReady = false

    // 发光贴图
    private var glowBlue: Bitmap? = null
    private var glowOrange: Bitmap? = null
    private var glowGold: Bitmap? = null
    private var glowWhite: Bitmap? = null
    private var glowRed: Bitmap? = null
    private var glowPurple: Bitmap? = null

    // 角色贴图
    private var playerBmp: Bitmap? = null
    private var enemyNormalBmp: Bitmap? = null
    private var enemyFastBmp: Bitmap? = null
    private var enemyTankBmp: Bitmap? = null
    private var enemyEliteBmp: Bitmap? = null
    private var enemyBossBmp: Bitmap? = null

    // 设置界面状态
    private var inSettings = false
    private val settingItems = listOf(
        "sound", "volume", "particles", "damage", "shake", "joystick", "back"
    )

    init {
        holder.addCallback(this)
        setZOrderOnTop(true)
        holder.setFormat(PixelFormat.TRANSLUCENT)
        Settings.init(context)
        loadSounds()
        loadTextures()
    }

    private fun loadTextures() {
        try {
            glowBlue = BitmapFactory.decodeStream(context.assets.open("glow_blue.png"))
            glowOrange = BitmapFactory.decodeStream(context.assets.open("glow_orange.png"))
            glowGold = BitmapFactory.decodeStream(context.assets.open("glow_gold.png"))
            glowWhite = BitmapFactory.decodeStream(context.assets.open("glow_white.png"))
            glowRed = BitmapFactory.decodeStream(context.assets.open("glow_red.png"))
            glowPurple = BitmapFactory.decodeStream(context.assets.open("glow_purple.png"))
            // 角色贴图
            playerBmp = BitmapFactory.decodeStream(context.assets.open("player.png"))
            enemyNormalBmp = BitmapFactory.decodeStream(context.assets.open("enemy_normal.png"))
            enemyFastBmp = BitmapFactory.decodeStream(context.assets.open("enemy_fast.png"))
            enemyTankBmp = BitmapFactory.decodeStream(context.assets.open("enemy_tank.png"))
            enemyEliteBmp = BitmapFactory.decodeStream(context.assets.open("enemy_elite.png"))
            enemyBossBmp = BitmapFactory.decodeStream(context.assets.open("enemy_boss.png"))
        } catch (e: Exception) {
            // 贴图加载失败，回退几何图形
        }
    }

    private fun drawGlow(canvas: Canvas, bmp: Bitmap?, x: Float, y: Float, radius: Float, alpha: Int = 255) {
        if (bmp == null) {
            paint.alpha = alpha
            canvas.drawCircle(x, y, radius, paint)
            paint.alpha = 255
            return
        }
        paint.alpha = alpha
        val src = Rect(0, 0, bmp.width, bmp.height)
        val dst = RectF(x - radius, y - radius, x + radius, y + radius)
        canvas.drawBitmap(bmp, src, dst, paint)
        paint.alpha = 255
    }

    // 角色贴图渲染（保持宽高比，居中）
    private fun drawCharacter(canvas: Canvas, bmp: Bitmap?, x: Float, y: Float, radius: Float, alpha: Int = 255) {
        if (bmp == null) {
            paint.alpha = alpha
            paint.color = 0xFF81C784.toInt()
            canvas.drawCircle(x, y, radius, paint)
            paint.alpha = 255
            return
        }
        val size = radius * 2.3f
        val ratio = bmp.height.toFloat() / bmp.width.toFloat()
        val w = size
        val h = size * ratio
        val src = Rect(0, 0, bmp.width, bmp.height)
        val dst = RectF(x - w / 2, y - h / 2, x + w / 2, y + h / 2)
        paint.alpha = alpha
        canvas.drawBitmap(bmp, src, dst, paint)
        paint.alpha = 255
    }

    private fun loadSounds() {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(8)
            .setAudioAttributes(attrs)
            .build()
        soundPool.setOnLoadCompleteListener { _, _, _ -> soundReady = true }
        val sounds = mapOf(
            "shoot" to R.raw.shoot,
            "hit" to R.raw.hit,
            "levelup" to R.raw.levelup,
            "hurt" to R.raw.hurt,
            "pickup" to R.raw.pickup,
            "death" to R.raw.death,
            "victory" to R.raw.victory,
            "warning" to R.raw.warning
        )
        for ((name, resId) in sounds) {
            soundIds[name] = soundPool.load(context, resId, 1)
        }
    }

    private fun playSound(name: String) {
        if (!soundReady || !Settings.soundEnabled) return
        soundIds[name]?.let { id ->
            val vol = Settings.soundVolume
            soundPool.play(id, vol, vol, 1, 0, 1f)
        }
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        running = true
        thread = Thread(this)
        thread?.start()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        canvasWidth = width
        canvasHeight = height
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        running = false
        thread?.join(1000)
        if (::soundPool.isInitialized) {
            soundPool.release()
        }
    }

    override fun run() {
        var lastTime = System.nanoTime()
        while (running) {
            val now = System.nanoTime()
            val dt = min((now - lastTime) / 1e9f, 0.05f)
            lastTime = now

            world.update(dt)
            // 消费音效事件
            if (world.soundEvents.isNotEmpty()) {
                val events = ArrayList(world.soundEvents)
                world.soundEvents.clear()
                for (e in events) playSound(e)
            }
            updateCamera()
            render()

            try { Thread.sleep(16) } catch (e: InterruptedException) { break }
        }
    }

    private fun updateCamera() {
        cameraX = world.player.x - canvasWidth / 2f
        cameraY = world.player.y - canvasHeight / 2f
        cameraX = cameraX.coerceIn(0f, GameConfig.MAP_WIDTH - canvasWidth)
        cameraY = cameraY.coerceIn(0f, GameConfig.MAP_HEIGHT - canvasHeight)
    }

    private fun render() {
        val canvas = holder.lockCanvas() ?: return
        try {
            canvas.drawColor(0xFF1A2E1A.toInt(), PorterDuff.Mode.CLEAR)
            canvas.drawColor(GameConfig.COLOR_BG)

            if (world.state == GameState.MENU) {
                if (inSettings) {
                    drawSettings(canvas)
                } else {
                    drawMenu(canvas)
                }
                return
            }

            // 世界坐标渲染
            canvas.save()
            canvas.translate(-cameraX, -cameraY)

            drawMap(canvas)
            drawXpGems(canvas)
            drawAura(canvas)
            drawEnemies(canvas)
            drawPlayer(canvas)
            drawBullets(canvas)
            drawLightning(canvas)
            drawParticles(canvas)
            drawFloatingTexts(canvas)

            canvas.restore()

            // UI 渲染（屏幕坐标）
            drawHUD(canvas)
            // 受伤红屏闪烁
            if (world.hurtFlashTimer > 0) {
                val alpha = (world.hurtFlashTimer / 0.3f * 100).toInt().coerceIn(0, 100)
                paint.color = 0xFFD32F2F.toInt()
                paint.alpha = alpha
                canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)
                paint.alpha = 255
            }
            drawJoystick(canvas)

            if (world.state == GameState.PAUSED) {
                drawPaused(canvas)
            } else if (world.state == GameState.LEVEL_UP) {
                drawLevelUp(canvas)
            } else if (world.state == GameState.GAME_OVER) {
                drawGameOver(canvas)
            } else if (world.state == GameState.VICTORY) {
                drawVictory(canvas)
            }
        } finally {
            holder.unlockCanvasAndPost(canvas)
        }
    }

    // ============ 地图 ============
    private fun drawMap(canvas: Canvas) {
        val tileSize = 100f
        val startX = (cameraX / tileSize).toInt() * tileSize
        val startY = (cameraY / tileSize).toInt() * tileSize
        val endX = cameraX + canvasWidth + tileSize
        val endY = cameraY + canvasHeight + tileSize

        var x = startX
        while (x < endX) {
            var y = startY
            while (y < endY) {
                val checker = ((x / tileSize).toInt() + (y / tileSize).toInt()) % 2 == 0
                paint.color = if (checker) GameConfig.COLOR_GRASS else GameConfig.COLOR_GRASS_DARK
                canvas.drawRect(x, y, x + tileSize, y + tileSize, paint)
                y += tileSize
            }
            x += tileSize
        }

        // 地图边界
        paint.color = 0xFF000000.toInt()
        paint.strokeWidth = 8f
        paint.style = Paint.Style.STROKE
        canvas.drawRect(0f, 0f, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT, paint)
        paint.style = Paint.Style.FILL
    }

    // ============ 经验宝石 ============
    private fun drawXpGems(canvas: Canvas) {
        for (gem in world.xpGems) {
            // 金色发光贴图
            drawGlow(canvas, glowGold, gem.x, gem.y, gem.radius * 2.5f, 140)
            paint.color = GameConfig.COLOR_XP
            paint.alpha = 255
            canvas.drawCircle(gem.x, gem.y, gem.radius, paint)
            // 高光
            paint.color = Color.WHITE
            paint.alpha = 180
            canvas.drawCircle(gem.x - gem.radius * 0.3f, gem.y - gem.radius * 0.3f, gem.radius * 0.3f, paint)
        }
        paint.alpha = 255
    }

    // ============ 光环 ============
    private fun drawAura(canvas: Canvas) {
        if (!world.auraActive) return
        paint.color = 0xFFFFAB40.toInt()
        paint.alpha = 25
        canvas.drawCircle(world.player.x, world.player.y, world.auraRadius, paint)
        paint.alpha = 60
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 3f
        canvas.drawCircle(world.player.x, world.player.y, world.auraRadius, paint)
        paint.style = Paint.Style.FILL
        paint.alpha = 255
    }

    // ============ 敌人 ============
    private fun drawEnemies(canvas: Canvas) {
        for (e in world.enemies) {
            if (!e.alive) continue
            val bmp = when (e.type) {
                EnemyType.NORMAL -> enemyNormalBmp
                EnemyType.FAST -> enemyFastBmp
                EnemyType.TANK -> enemyTankBmp
                EnemyType.ELITE -> enemyEliteBmp
                EnemyType.BOSS -> enemyBossBmp
            }
            val alpha = if (e.hitFlash > 0) 180 else 255
            drawCharacter(canvas, bmp, e.x, e.y, e.radius, alpha)

            // 血条
            if (e.hp < e.maxHp) {
                val barW = e.radius * 2
                val barH = 4f
                val barX = e.x - e.radius
                val barY = e.y - e.radius - 10
                paint.color = 0xFF000000.toInt()
                paint.alpha = 150
                canvas.drawRect(barX, barY, barX + barW, barY + barH, paint)
                paint.color = GameConfig.COLOR_HP_FG
                paint.alpha = 255
                canvas.drawRect(barX, barY, barX + barW * (e.hp / e.maxHp), barY + barH, paint)
            }
        }
    }

    // ============ 玩家 ============
    private fun drawPlayer(canvas: Canvas) {
        val p = world.player
        val alpha = if (p.invincibleTimer > 0 && (p.invincibleTimer * 20).toInt() % 2 == 0) 100 else 255
        drawCharacter(canvas, playerBmp, p.x, p.y, p.radius, alpha)
    }

    // ============ 子弹 ============
    private fun drawBullets(canvas: Canvas) {
        for (b in world.bullets) {
            val glowBmp = when (b.bulletType) {
                "fireball" -> glowOrange
                "knife" -> glowWhite
                else -> glowBlue
            }
            // 拖尾（用贴图）
            if (b.trail.size > 1) {
                val trailList = b.trail.toList()
                for (i in trailList.indices) {
                    val alpha = ((i + 1).toFloat() / trailList.size * 100).toInt()
                    val tSize = b.size * 1.5f * (i + 1).toFloat() / trailList.size
                    drawGlow(canvas, glowBmp, trailList[i].first, trailList[i].second, tSize, alpha)
                }
            }

            if (b.bulletType == "knife") {
                // 飞刀：拉长的矩形 + 发光
                drawGlow(canvas, glowBmp, b.x, b.y, b.size * 1.8f, 120)
                val angle = kotlin.math.atan2(b.vy, b.vx)
                canvas.save()
                canvas.rotate(Math.toDegrees(angle.toDouble()).toFloat(), b.x, b.y)
                paint.color = b.color
                paint.alpha = 255
                canvas.drawRect(b.x - b.size * 1.5f, b.y - b.size * 0.4f, b.x + b.size * 1.5f, b.y + b.size * 0.4f, paint)
                canvas.restore()
            } else if (b.bulletType == "fireball") {
                // 火球：大发光 + 亮内核
                drawGlow(canvas, glowOrange, b.x, b.y, b.size * 2.5f, 160)
                drawGlow(canvas, glowGold, b.x, b.y, b.size * 0.8f, 255)
            } else {
                // 普通子弹：发光贴图
                drawGlow(canvas, glowBmp, b.x, b.y, b.size * 2f, 200)
                paint.color = Color.WHITE
                paint.alpha = 255
                canvas.drawCircle(b.x, b.y, b.size * 0.4f, paint)
            }
        }
        paint.alpha = 255
    }

    // ============ 闪电 ============
    private fun drawLightning(canvas: Canvas) {
        for (bolt in world.lightningBolts) {
            val points = mutableListOf<Pair<Float, Float>>()
            points.add(bolt.x1 to bolt.y1)
            val segments = 6
            for (i in 1..segments) {
                val t = i / segments.toFloat()
                val nx = bolt.x1 + (bolt.x2 - bolt.x1) * t + (Math.random().toFloat() - 0.5f) * 25
                val ny = bolt.y1 + (bolt.y2 - bolt.y1) * t + (Math.random().toFloat() - 0.5f) * 25
                points.add(nx to ny)
            }
            // 外发光（粗、半透明）
            paint.color = 0xFFB388FF.toInt()
            paint.strokeWidth = 10f
            paint.alpha = 80
            for (i in 0 until points.size - 1) {
                canvas.drawLine(points[i].first, points[i].second, points[i+1].first, points[i+1].second, paint)
            }
            // 中层
            paint.color = 0xFFFFEB3B.toInt()
            paint.strokeWidth = 5f
            paint.alpha = 180
            for (i in 0 until points.size - 1) {
                canvas.drawLine(points[i].first, points[i].second, points[i+1].first, points[i+1].second, paint)
            }
            // 内芯（亮白）
            paint.color = 0xFFFFFFFF.toInt()
            paint.strokeWidth = 2f
            paint.alpha = 255
            for (i in 0 until points.size - 1) {
                canvas.drawLine(points[i].first, points[i].second, points[i+1].first, points[i+1].second, paint)
            }
        }
        paint.alpha = 255
        paint.strokeWidth = 1f
    }

    // ============ 粒子 ============
    private fun drawParticles(canvas: Canvas) {
        if (!Settings.particlesEnabled) return
        for (p in world.particles) {
            val alpha = (p.lifetime / 0.4f * 220).toInt().coerceIn(0, 220)
            val bmp = pickGlowForColor(p.color)
            drawGlow(canvas, bmp, p.x, p.y, p.size * 3.6f, alpha)
        }
        paint.alpha = 255
    }

    private fun pickGlowForColor(color: Int): Bitmap? {
        val r = Color.red(color); val g = Color.green(color); val b = Color.blue(color)
        return when {
            r > 200 && g < 120 -> glowRed           // 红
            r > 200 && g in 120..200 -> glowOrange  // 橙
            r > 200 && g > 200 -> glowGold           // 金/黄
            b > 180 && r < 150 -> glowBlue           // 蓝
            r > 180 && b > 180 -> glowPurple         // 紫
            else -> glowWhite
        }
    }

    // ============ 飘字 ============
    private fun drawFloatingTexts(canvas: Canvas) {
        if (!Settings.damageNumbers) return
        for (ft in world.floatingTexts) {
            textPaint.color = ft.color
            textPaint.alpha = ft.alpha
            textPaint.textSize = ft.size
            textPaint.isFakeBoldText = true
            canvas.drawText(ft.text, ft.x, ft.y, textPaint)
        }
        textPaint.alpha = 255
        textPaint.isFakeBoldText = false
    }

    // ============ HUD ============
    private fun drawHUD(canvas: Canvas) {
        val p = world.player
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()

        // 左上：血条
        val hpBarW = w * 0.38f
        val hpBarH = h * 0.022f
        val hpX = w * 0.03f
        val hpY = h * 0.025f
        paint.color = 0xCC000000.toInt()
        canvas.drawRoundRect(RectF(hpX - 4, hpY - 4, hpX + hpBarW + 4, hpY + hpBarH + 4), 8f, 8f, paint)
        paint.color = GameConfig.COLOR_HP_BG
        canvas.drawRoundRect(RectF(hpX, hpY, hpX + hpBarW, hpY + hpBarH), 6f, 6f, paint)
        paint.color = GameConfig.COLOR_HP_FG
        canvas.drawRoundRect(RectF(hpX, hpY, hpX + hpBarW * (p.hp / p.effectiveMaxHp), hpY + hpBarH), 6f, 6f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.018f
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("${p.hp.toInt()} / ${p.effectiveMaxHp.toInt()}", hpX + 10, hpY + hpBarH * 0.75f, textPaint)

        // 经验条
        val xpY = hpY + hpBarH + h * 0.012f
        val xpBarH = h * 0.014f
        paint.color = GameConfig.COLOR_XP_BAR_BG
        canvas.drawRoundRect(RectF(hpX, xpY, hpX + hpBarW, xpY + xpBarH), 6f, 6f, paint)
        paint.color = GameConfig.COLOR_XP_BAR_FG
        canvas.drawRoundRect(RectF(hpX, xpY, hpX + hpBarW * (p.xp.toFloat() / p.xpToNext), xpY + xpBarH), 6f, 6f, paint)

        // 等级
        textPaint.color = 0xFFFFEB3B.toInt()
        textPaint.textSize = h * 0.022f
        textPaint.isFakeBoldText = true
        canvas.drawText("Lv.${p.level}", hpX, xpY + xpBarH + h * 0.028f, textPaint)
        textPaint.isFakeBoldText = false

        // 右上：时间和击杀
        textPaint.textAlign = Paint.Align.RIGHT
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.026f
        val minutes = (world.gameTime / 60).toInt()
        val seconds = (world.gameTime % 60).toInt()
        canvas.drawText(String.format("%02d:%02d", minutes, seconds), w - w * 0.03f, h * 0.04f, textPaint)
        textPaint.textSize = h * 0.018f
        textPaint.color = 0xFFBDBDBD.toInt()
        canvas.drawText("击杀: ${p.kills}", w - w * 0.03f, h * 0.068f, textPaint)

        // 技能图标栏（底部中间）
        val skillSize = w * 0.09f
        val skillGap = w * 0.02f
        val skillY = h - skillSize - h * 0.02f
        val totalW = p.skills.size * skillSize + (p.skills.size - 1) * skillGap
        var skillX = (w - totalW) / 2
        for (skill in p.skills) {
            paint.color = 0xCC000000.toInt()
            canvas.drawRoundRect(RectF(skillX, skillY, skillX + skillSize, skillY + skillSize), 10f, 10f, paint)
            paint.color = skill.iconColor
            canvas.drawCircle(skillX + skillSize / 2, skillY + skillSize / 2, skillSize / 2 - 6, paint)
            if (skill.level > 1 || skill !is BasicAttackSkill) {
                textPaint.color = Color.WHITE
                textPaint.textSize = h * 0.016f
                textPaint.textAlign = Paint.Align.CENTER
                canvas.drawText("${skill.level}", skillX + skillSize / 2, skillY + skillSize - h * 0.008f, textPaint)
            }
            skillX += skillSize + skillGap
        }

        // 暂停按钮（右上角）
        val pauseBtnSize = w * 0.11f
        val pauseX = w - pauseBtnSize - w * 0.02f
        val pauseY = h * 0.02f
        paint.color = 0x66000000.toInt()
        canvas.drawRoundRect(RectF(pauseX, pauseY, pauseX + pauseBtnSize, pauseY + pauseBtnSize), 12f, 12f, paint)
        paint.color = Color.WHITE
        val barW = pauseBtnSize * 0.12f
        val barH = pauseBtnSize * 0.45f
        val barY = pauseY + pauseBtnSize * 0.275f
        canvas.drawRect(pauseX + pauseBtnSize * 0.3f, barY, pauseX + pauseBtnSize * 0.3f + barW, barY + barH, paint)
        canvas.drawRect(pauseX + pauseBtnSize * 0.58f, barY, pauseX + pauseBtnSize * 0.58f + barW, barY + barH, paint)
    }

    // ============ 虚拟摇杆 ============
    private fun drawJoystick(canvas: Canvas) {
        if (!joystickActive) return
        val scale = Settings.joystickSize
        val baseR = canvasWidth * 0.13f * scale
        val knobR = canvasWidth * 0.065f * scale
        paint.color = 0x44FFFFFF.toInt()
        canvas.drawCircle(joystickBaseX, joystickBaseY, baseR, paint)
        paint.color = 0x88FFFFFF.toInt()
        canvas.drawCircle(joystickX, joystickY, knobR, paint)
    }

    // ============ 升级界面 ============
    private fun drawLevelUp(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        // 半透明遮罩
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)

        textPaint.color = 0xFFFFEB3B.toInt()
        textPaint.textSize = w * 0.08f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("升级！选择一项", w / 2f, h * 0.12f, textPaint)
        textPaint.isFakeBoldText = false

        val cardW = (w - w * 0.08f) / 3f - w * 0.02f
        val cardH = h * 0.32f
        val cardY = (h - cardH) / 2f
        val totalW = cardW * 3 + w * 0.04f
        var cardX = (w - totalW) / 2f + w * 0.01f

        for ((index, option) in world.levelUpOptions.withIndex()) {
            val rect = RectF(cardX, cardY, cardX + cardW, cardY + cardH)
            paint.color = 0xFF1B5E20.toInt()
            canvas.drawRoundRect(rect, 16f, 16f, paint)
            paint.color = 0xFF4CAF50.toInt()
            paint.strokeWidth = 3f
            paint.style = Paint.Style.STROKE
            canvas.drawRoundRect(rect, 16f, 16f, paint)
            paint.style = Paint.Style.FILL

            val iconR = w * 0.065f
            val iconY = cardY + h * 0.07f
            when (option) {
                is Skill -> {
                    paint.color = option.iconColor
                    canvas.drawCircle(cardX + cardW / 2, iconY, iconR, paint)
                    textPaint.color = Color.WHITE
                    textPaint.textSize = h * 0.024f
                    textPaint.isFakeBoldText = true
                    canvas.drawText(option.name, cardX + cardW / 2, cardY + h * 0.16f, textPaint)
                    textPaint.isFakeBoldText = false
                    textPaint.textSize = h * 0.015f
                    textPaint.color = 0xFFBDBDBD.toInt()
                    val desc = if (option.level == 0) option.description else option.upgradeDescription()
                    drawTextWrapped(canvas, desc, cardX + cardW / 2, cardY + h * 0.19f, cardW - w * 0.04f, h * 0.015f, 3)
                    if (option.level > 0) {
                        textPaint.color = 0xFFFFEB3B.toInt()
                        textPaint.textSize = h * 0.015f
                        canvas.drawText("当前等级: ${option.level}", cardX + cardW / 2, cardY + cardH - h * 0.02f, textPaint)
                    }
                }
                is StatUpgrade -> {
                    paint.color = option.color
                    canvas.drawCircle(cardX + cardW / 2, iconY, iconR, paint)
                    textPaint.color = Color.WHITE
                    textPaint.textSize = h * 0.024f
                    textPaint.isFakeBoldText = true
                    canvas.drawText(option.statName, cardX + cardW / 2, cardY + h * 0.16f, textPaint)
                    textPaint.isFakeBoldText = false
                    textPaint.textSize = h * 0.017f
                    textPaint.color = 0xFFE0E0E0.toInt()
                    canvas.drawText(option.desc, cardX + cardW / 2, cardY + h * 0.21f, textPaint)
                }
            }
            cardX += cardW + w * 0.02f
        }
    }

    private fun drawTextWrapped(canvas: Canvas, text: String, cx: Float, y: Float, maxWidth: Float, textSize: Float, maxLines: Int = 3) {
        textPaint.textSize = textSize
        textPaint.textAlign = Paint.Align.CENTER
        val words = text.split(" ")
        var line = ""
        var cy = y
        var lines = 0
        for (word in words) {
            val test = if (line.isEmpty()) word else "$line $word"
            if (textPaint.measureText(test) > maxWidth && line.isNotEmpty()) {
                if (lines >= maxLines - 1) {
                    // 最后一行，加省略号
                    val ellipsis = "$line…"
                    canvas.drawText(ellipsis, cx, cy, textPaint)
                    return
                }
                canvas.drawText(line, cx, cy, textPaint)
                line = word
                cy += textSize + 4
                lines++
            } else {
                line = test
            }
        }
        if (line.isNotEmpty()) canvas.drawText(line, cx, cy, textPaint)
    }

    // ============ 菜单 ============
    private fun drawMenu(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        paint.color = 0xFF1A2E1A.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)

        textPaint.color = 0xFF00E676.toInt()
        textPaint.textSize = w * 0.12f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("割草传说", w / 2f, h * 0.32f, textPaint)
        textPaint.isFakeBoldText = false

        textPaint.color = 0xFFBDBDBD.toInt()
        textPaint.textSize = h * 0.02f
        canvas.drawText("发育型 Roguelike 割草游戏", w / 2f, h * 0.4f, textPaint)
        canvas.drawText("虚拟摇杆移动，自动攻击，升级选技能", w / 2f, h * 0.44f, textPaint)
        canvas.drawText("坚持 15 分钟击败最终 Boss 即可胜利", w / 2f, h * 0.48f, textPaint)

        // 开始按钮
        val btnW = w * 0.6f
        val btnH = h * 0.08f
        val btnX = (w - btnW) / 2
        val btnY = h * 0.56f
        paint.color = 0xFF4CAF50.toInt()
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 16f, 16f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.03f
        textPaint.isFakeBoldText = true
        canvas.drawText("开始游戏", w / 2f, btnY + btnH * 0.65f, textPaint)

        // 设置按钮
        val setY = btnY + btnH + h * 0.02f
        paint.color = 0xFF546E7A.toInt()
        canvas.drawRoundRect(RectF(btnX, setY, btnX + btnW, setY + btnH), 16f, 16f, paint)
        canvas.drawText("设置", w / 2f, setY + btnH * 0.65f, textPaint)
        textPaint.isFakeBoldText = false
    }

    // ============ 设置界面 ============
    private fun drawSettings(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        paint.color = 0xFF0D0D1A.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)

        textPaint.color = Color.WHITE
        textPaint.textSize = w * 0.09f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("设置", w / 2f, h * 0.1f, textPaint)
        textPaint.isFakeBoldText = false

        val volText = when {
            Settings.soundVolume < 0.5f -> "低"
            Settings.soundVolume < 0.85f -> "中"
            else -> "高"
        }
        val joyText = when {
            Settings.joystickSize < 0.9f -> "小"
            Settings.joystickSize < 1.15f -> "中"
            else -> "大"
        }
        val items = listOf(
            Triple("音效", if (Settings.soundEnabled) "开" else "关", "sound"),
            Triple("音量", volText, "volume"),
            Triple("粒子特效", if (Settings.particlesEnabled) "开" else "关", "particles"),
            Triple("伤害数字", if (Settings.damageNumbers) "开" else "关", "damage"),
            Triple("屏幕震动", if (Settings.screenShake) "开" else "关", "shake"),
            Triple("摇杆大小", joyText, "joystick")
        )

        val rowH = h * 0.085f
        val startY = h * 0.15f
        val rowW = w * 0.9f
        val rowX = w * 0.05f

        for ((i, item) in items.withIndex()) {
            val ry = startY + i * rowH
            paint.color = 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(rowX, ry, rowX + rowW, ry + rowH - h * 0.012f), 14f, 14f, paint)
            textPaint.color = 0xFFB0BEC5.toInt()
            textPaint.textSize = h * 0.025f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(item.first, rowX + w * 0.04f, ry + rowH * 0.6f, textPaint)
            textPaint.color = 0xFF4FC3F7.toInt()
            textPaint.textSize = h * 0.025f
            textPaint.isFakeBoldText = true
            textPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText(item.second, rowX + rowW - w * 0.04f, ry + rowH * 0.6f, textPaint)
            textPaint.isFakeBoldText = false
        }

        // 返回按钮
        val backY = startY + items.size * rowH + h * 0.02f
        paint.color = 0xFF546E7A.toInt()
        canvas.drawRoundRect(RectF(rowX, backY, rowX + rowW, backY + h * 0.075f), 14f, 14f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.028f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("返回", w / 2f, backY + h * 0.05f, textPaint)
        textPaint.isFakeBoldText = false
    }

    private fun handleSettingsTouch(x: Float, y: Float) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        val rowH = h * 0.085f
        val startY = h * 0.15f
        val rowW = w * 0.9f
        val rowX = w * 0.05f
        val keys = listOf("sound", "volume", "particles", "damage", "shake", "joystick")

        for ((i, key) in keys.withIndex()) {
            val ry = startY + i * rowH
            if (x in rowX..(rowX + rowW) && y in ry..(ry + rowH - 12f)) {
                when (key) {
                    "sound" -> Settings.setSoundEnabled(!Settings.soundEnabled)
                    "volume" -> {
                        val next = when {
                            Settings.soundVolume < 0.5f -> 0.6f
                            Settings.soundVolume < 0.85f -> 1.0f
                            else -> 0.3f
                        }
                        Settings.setSoundVolume(next)
                        if (Settings.soundEnabled) playSound("pickup")
                    }
                    "particles" -> Settings.setParticlesEnabled(!Settings.particlesEnabled)
                    "damage" -> Settings.setDamageNumbers(!Settings.damageNumbers)
                    "shake" -> Settings.setScreenShake(!Settings.screenShake)
                    "joystick" -> {
                        val next = when {
                            Settings.joystickSize < 0.9f -> 1.0f
                            Settings.joystickSize < 1.15f -> 1.3f
                            else -> 0.7f
                        }
                        Settings.setJoystickSize(next)
                    }
                }
                return
            }
        }

        // 返回按钮
        val backY = startY + keys.size * rowH + h * 0.02f
        if (x in rowX..(rowX + rowW) && y in backY..(backY + h * 0.075f)) {
            inSettings = false
        }
    }

    // ============ 暂停界面 ============
    private fun drawPaused(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)

        textPaint.color = Color.WHITE
        textPaint.textSize = w * 0.09f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("已暂停", w / 2f, h * 0.28f, textPaint)
        textPaint.isFakeBoldText = false

        val btnW = w * 0.6f
        val btnH = h * 0.075f
        val btnX = (w - btnW) / 2
        var btnY = h * 0.38f

        val buttons = listOf(
            "继续游戏" to 0xFF4CAF50.toInt(),
            "重新开始" to 0xFFFF9800.toInt(),
            "返回主菜单" to 0xFF546E7A.toInt()
        )
        for ((text, color) in buttons) {
            paint.color = color
            canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 14f, 14f, paint)
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.028f
            textPaint.isFakeBoldText = true
            canvas.drawText(text, w / 2f, btnY + btnH * 0.65f, textPaint)
            textPaint.isFakeBoldText = false
            btnY += btnH + h * 0.02f
        }
    }

    private fun drawGameOver(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)

        textPaint.color = 0xFFEF5350.toInt()
        textPaint.textSize = w * 0.11f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("游戏结束", w / 2f, h * 0.28f, textPaint)
        textPaint.isFakeBoldText = false

        drawStats(canvas)
        drawRestartButton(canvas)
    }

    private fun drawVictory(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)

        textPaint.color = 0xFFFFEB3B.toInt()
        textPaint.textSize = w * 0.11f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("胜利！", w / 2f, h * 0.28f, textPaint)
        textPaint.isFakeBoldText = false

        drawStats(canvas)
        drawRestartButton(canvas)
    }

    private fun drawStats(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.03f
        textPaint.textAlign = Paint.Align.CENTER
        val minutes = (world.gameTime / 60).toInt()
        val seconds = (world.gameTime % 60).toInt()
        canvas.drawText("存活时间: ${String.format("%02d:%02d", minutes, seconds)}", w / 2f, h * 0.42f, textPaint)
        canvas.drawText("击杀数: ${world.player.kills}", w / 2f, h * 0.48f, textPaint)
        canvas.drawText("达到等级: ${world.player.level}", w / 2f, h * 0.54f, textPaint)
    }

    private fun drawRestartButton(canvas: Canvas) {
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()
        val btnW = w * 0.6f
        val btnH = h * 0.08f
        val btnX = (w - btnW) / 2
        val btnY = h * 0.64f
        paint.color = 0xFF4CAF50.toInt()
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 16f, 16f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.03f
        textPaint.isFakeBoldText = true
        canvas.drawText("再来一局", w / 2f, btnY + btnH * 0.65f, textPaint)
        textPaint.isFakeBoldText = false
    }

    // ============ 触摸输入 ============
    override fun onTouchEvent(event: MotionEvent): Boolean {
        val action = event.actionMasked
        val pointerIndex = event.actionIndex
        val x = event.getX(pointerIndex)
        val y = event.getY(pointerIndex)
        val pointerId = event.getPointerId(pointerIndex)

        when (world.state) {
            GameState.MENU -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    if (inSettings) {
                        handleSettingsTouch(x, y)
                    } else {
                        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                        val btnW = w * 0.6f; val btnH = h * 0.08f
                        val btnX = (w - btnW) / 2
                        val btnY = h * 0.56f
                        if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                            world.startGame()
                        }
                        val setY = btnY + btnH + h * 0.02f
                        if (x in btnX..(btnX + btnW) && y in setY..(setY + btnH)) {
                            inSettings = true
                        }
                    }
                }
            }
            GameState.LEVEL_UP -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                    val cardW = (w - w * 0.08f) / 3f - w * 0.02f
                    val cardH = h * 0.32f
                    val cardY = (h - cardH) / 2f
                    val totalW = cardW * 3 + w * 0.04f
                    var cardX = (w - totalW) / 2f + w * 0.01f
                    for (option in world.levelUpOptions) {
                        if (x in cardX..(cardX + cardW) && y in cardY..(cardY + cardH)) {
                            world.selectLevelUpOption(option)
                            break
                        }
                        cardX += cardW + w * 0.02f
                    }
                }
            }
            GameState.GAME_OVER, GameState.VICTORY -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                    val btnW = w * 0.6f; val btnH = h * 0.08f
                    val btnX = (w - btnW) / 2
                    val btnY = h * 0.64f
                    if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                        world.startGame()
                    }
                }
            }
            GameState.PAUSED -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                    val btnW = w * 0.6f
                    val btnH = h * 0.075f
                    val btnX = (w - btnW) / 2
                    val baseY = h * 0.38f
                    if (x in btnX..(btnX + btnW) && y in baseY..(baseY + btnH)) {
                        world.resume()
                    }
                    val restartY = baseY + btnH + h * 0.02f
                    if (x in btnX..(btnX + btnW) && y in restartY..(restartY + btnH)) {
                        world.startGame()
                    }
                    val menuY = restartY + btnH + h * 0.02f
                    if (x in btnX..(btnX + btnW) && y in menuY..(menuY + btnH)) {
                        world.backToMenu()
                    }
                }
            }
            GameState.PLAYING -> {
                when (action) {
                    MotionEvent.ACTION_DOWN -> {
                        // 检测暂停按钮
                        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                        val pauseBtnSize = w * 0.11f
                        val pauseX = w - pauseBtnSize - w * 0.02f
                        val pauseY = h * 0.02f
                        if (x in pauseX..(pauseX + pauseBtnSize) && y in pauseY..(pauseY + pauseBtnSize)) {
                            world.pause()
                            return true
                        }
                        // 全屏任意位置触摸都出摇杆，底座跟随手指
                        joystickActive = true
                        joystickPointerId = pointerId
                        joystickBaseX = x
                        joystickBaseY = y
                        joystickX = x
                        joystickY = y
                        updateJoystickInput()
                    }
                    MotionEvent.ACTION_MOVE -> {
                        if (joystickActive && pointerId == joystickPointerId) {
                            val dx = x - joystickBaseX
                            val dy = y - joystickBaseY
                            val dist = hypot(dx, dy)
                            val maxDist = canvasWidth * 0.11f * Settings.joystickSize
                            if (dist > maxDist) {
                                joystickX = joystickBaseX + dx / dist * maxDist
                                joystickY = joystickBaseY + dy / dist * maxDist
                            } else {
                                joystickX = x
                                joystickY = y
                            }
                            updateJoystickInput()
                        }
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        if (pointerId == joystickPointerId) {
                            joystickActive = false
                            joystickPointerId = -1
                            world.inputX = 0f
                            world.inputY = 0f
                        }
                    }
                }
            }
        }
        return true
    }

    private fun updateJoystickInput() {
        val dx = joystickX - joystickBaseX
        val dy = joystickY - joystickBaseY
        val dist = hypot(dx, dy)
        if (dist > 5f) {
            world.inputX = dx / dist
            world.inputY = dy / dist
        } else {
            world.inputX = 0f
            world.inputY = 0f
        }
    }
}
