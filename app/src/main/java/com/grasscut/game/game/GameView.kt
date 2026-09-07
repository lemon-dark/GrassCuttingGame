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
            val color = GameConfig.ENEMY_COLORS[e.type.name.lowercase()] ?: 0xFF66BB6A.toInt()

            // 身体
            paint.color = if (e.hitFlash > 0) Color.WHITE else color
            if (e.type == EnemyType.BOSS) {
                canvas.drawCircle(e.x, e.y, e.radius, paint)
                paint.color = 0xFF000000.toInt()
                paint.alpha = 100
                canvas.drawCircle(e.x, e.y, e.radius * 0.6f, paint)
                paint.alpha = 255
            } else {
                val rect = RectF(e.x - e.radius, e.y - e.radius, e.x + e.radius, e.y + e.radius)
                canvas.drawRoundRect(rect, e.radius * 0.3f, e.radius * 0.3f, paint)
            }

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
        // 无敌闪烁
        if (p.invincibleTimer > 0 && (p.invincibleTimer * 20).toInt() % 2 == 0) {
            paint.alpha = 100
        }
        // 外圈
        paint.color = GameConfig.COLOR_PLAYER_DARK
        canvas.drawCircle(p.x, p.y, p.radius + 3, paint)
        // 身体
        paint.color = GameConfig.COLOR_PLAYER
        canvas.drawCircle(p.x, p.y, p.radius, paint)
        // 内圈
        paint.color = 0xFFB3E5FC.toInt()
        canvas.drawCircle(p.x, p.y, p.radius * 0.5f, paint)
        paint.alpha = 255
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
            drawGlow(canvas, bmp, p.x, p.y, p.size * 1.8f, alpha)
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

        // 左上：血条
        val hpBarW = 200f
        val hpBarH = 18f
        val hpX = 20f
        val hpY = 20f
        paint.color = 0xCC000000.toInt()
        canvas.drawRoundRect(RectF(hpX - 3, hpY - 3, hpX + hpBarW + 3, hpY + hpBarH + 3), 6f, 6f, paint)
        paint.color = GameConfig.COLOR_HP_BG
        canvas.drawRoundRect(RectF(hpX, hpY, hpX + hpBarW, hpY + hpBarH), 4f, 4f, paint)
        paint.color = GameConfig.COLOR_HP_FG
        canvas.drawRoundRect(RectF(hpX, hpY, hpX + hpBarW * (p.hp / p.effectiveMaxHp), hpY + hpBarH), 4f, 4f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = 13f
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("${p.hp.toInt()} / ${p.effectiveMaxHp.toInt()}", hpX + 8, hpY + 14f, textPaint)

        // 经验条
        val xpY = hpY + hpBarH + 8
        paint.color = GameConfig.COLOR_XP_BAR_BG
        canvas.drawRoundRect(RectF(hpX, xpY, hpX + hpBarW, xpY + 8), 4f, 4f, paint)
        paint.color = GameConfig.COLOR_XP_BAR_FG
        canvas.drawRoundRect(RectF(hpX, xpY, hpX + hpBarW * (p.xp.toFloat() / p.xpToNext), xpY + 8), 4f, 4f, paint)

        // 等级
        textPaint.color = 0xFFFFEB3B.toInt()
        textPaint.textSize = 16f
        textPaint.isFakeBoldText = true
        canvas.drawText("Lv.${p.level}", hpX, xpY + 28f, textPaint)
        textPaint.isFakeBoldText = false

        // 右上：时间和击杀
        textPaint.textAlign = Paint.Align.RIGHT
        textPaint.color = Color.WHITE
        textPaint.textSize = 18f
        val minutes = (world.gameTime / 60).toInt()
        val seconds = (world.gameTime % 60).toInt()
        canvas.drawText(String.format("%02d:%02d", minutes, seconds), canvasWidth - 20f, 35f, textPaint)
        textPaint.textSize = 14f
        textPaint.color = 0xFFBDBDBD.toInt()
        canvas.drawText("击杀: ${p.kills}", canvasWidth - 20f, 55f, textPaint)

        // 技能图标栏（底部中间）
        val skillY = canvasHeight - 58f
        val skillSize = 44f
        val skillGap = 10f
        val totalW = p.skills.size * skillSize + (p.skills.size - 1) * skillGap
        var skillX = (canvasWidth - totalW) / 2
        for (skill in p.skills) {
            paint.color = 0xCC000000.toInt()
            canvas.drawRoundRect(RectF(skillX, skillY, skillX + skillSize, skillY + skillSize), 8f, 8f, paint)
            paint.color = skill.iconColor
            canvas.drawCircle(skillX + skillSize / 2, skillY + skillSize / 2, skillSize / 2 - 5, paint)
            // 等级
            if (skill.level > 1 || skill !is BasicAttackSkill) {
                textPaint.color = Color.WHITE
                textPaint.textSize = 11f
                textPaint.textAlign = Paint.Align.CENTER
                canvas.drawText("${skill.level}", skillX + skillSize / 2, skillY + skillSize - 6, textPaint)
            }
            skillX += skillSize + skillGap
        }

        // 暂停按钮（右上角）
        val pauseBtnSize = 56f
        val pauseX = canvasWidth - pauseBtnSize - 12f
        val pauseY = 12f
        paint.color = 0x66000000.toInt()
        canvas.drawRoundRect(RectF(pauseX, pauseY, pauseX + pauseBtnSize, pauseY + pauseBtnSize), 12f, 12f, paint)
        paint.color = Color.WHITE
        // 两个竖条表示暂停
        canvas.drawRect(pauseX + 18f, pauseY + 16f, pauseX + 24f, pauseY + 40f, paint)
        canvas.drawRect(pauseX + 32f, pauseY + 16f, pauseX + 38f, pauseY + 40f, paint)
    }

    // ============ 虚拟摇杆 ============
    private fun drawJoystick(canvas: Canvas) {
        if (!joystickActive) return
        val scale = Settings.joystickSize
        val baseR = 70f * scale
        val knobR = 35f * scale
        paint.color = 0x44FFFFFF.toInt()
        canvas.drawCircle(joystickBaseX, joystickBaseY, baseR, paint)
        paint.color = 0x88FFFFFF.toInt()
        canvas.drawCircle(joystickX, joystickY, knobR, paint)
    }

    // ============ 升级界面 ============
    private fun drawLevelUp(canvas: Canvas) {
        // 半透明遮罩
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)

        textPaint.color = 0xFFFFEB3B.toInt()
        textPaint.textSize = 44f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("升级！选择一项", canvasWidth / 2f, 110f, textPaint)
        textPaint.isFakeBoldText = false

        val cardW = min(canvasWidth - 40f, 900f) / 3f - 12f
        val cardH = 280f
        val cardY = (canvasHeight - cardH) / 2f
        val totalW = cardW * 3 + 24f
        var cardX = (canvasWidth - totalW) / 2f + 6f

        for ((index, option) in world.levelUpOptions.withIndex()) {
            val rect = RectF(cardX, cardY, cardX + cardW, cardY + cardH)
            paint.color = 0xFF1B5E20.toInt()
            canvas.drawRoundRect(rect, 16f, 16f, paint)
            paint.color = 0xFF4CAF50.toInt()
            paint.strokeWidth = 3f
            paint.style = Paint.Style.STROKE
            canvas.drawRoundRect(rect, 16f, 16f, paint)
            paint.style = Paint.Style.FILL

            when (option) {
                is Skill -> {
                    paint.color = option.iconColor
                    canvas.drawCircle(cardX + cardW / 2, cardY + 60f, 36f, paint)
                    textPaint.color = Color.WHITE
                    textPaint.textSize = 22f
                    textPaint.isFakeBoldText = true
                    canvas.drawText(option.name, cardX + cardW / 2, cardY + 125f, textPaint)
                    textPaint.isFakeBoldText = false
                    textPaint.textSize = 16f
                    textPaint.color = 0xFFBDBDBD.toInt()
                    val desc = if (option.level == 0) option.description else option.upgradeDescription()
                    drawTextWrapped(canvas, desc, cardX + cardW / 2, cardY + 155f, cardW - 20f, 16f)
                    if (option.level > 0) {
                        textPaint.color = 0xFFFFEB3B.toInt()
                        textPaint.textSize = 14f
                        canvas.drawText("当前等级: ${option.level}", cardX + cardW / 2, cardY + cardH - 20f, textPaint)
                    }
                }
                is StatUpgrade -> {
                    paint.color = option.color
                    canvas.drawCircle(cardX + cardW / 2, cardY + 60f, 36f, paint)
                    textPaint.color = Color.WHITE
                    textPaint.textSize = 22f
                    textPaint.isFakeBoldText = true
                    canvas.drawText(option.statName, cardX + cardW / 2, cardY + 125f, textPaint)
                    textPaint.isFakeBoldText = false
                    textPaint.textSize = 16f
                    textPaint.color = 0xFFE0E0E0.toInt()
                    canvas.drawText(option.desc, cardX + cardW / 2, cardY + 165f, textPaint)
                }
            }
            cardX += cardW + 15f
        }
    }

    private fun drawTextWrapped(canvas: Canvas, text: String, cx: Float, y: Float, maxWidth: Float, textSize: Float) {
        textPaint.textSize = textSize
        textPaint.textAlign = Paint.Align.CENTER
        val words = text.split(" ")
        var line = ""
        var cy = y
        for (word in words) {
            val test = if (line.isEmpty()) word else "$line $word"
            if (textPaint.measureText(test) > maxWidth && line.isNotEmpty()) {
                canvas.drawText(line, cx, cy, textPaint)
                line = word
                cy += textSize + 4
            } else {
                line = test
            }
        }
        if (line.isNotEmpty()) canvas.drawText(line, cx, cy, textPaint)
    }

    // ============ 菜单 ============
    private fun drawMenu(canvas: Canvas) {
        paint.color = 0xFF1A2E1A.toInt()
        canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)

        textPaint.color = 0xFF00E676.toInt()
        textPaint.textSize = 64f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("割草传说", canvasWidth / 2f, canvasHeight / 2f - 80f, textPaint)
        textPaint.isFakeBoldText = false

        textPaint.color = 0xFFBDBDBD.toInt()
        textPaint.textSize = 18f
        canvas.drawText("发育型 Roguelike 割草游戏", canvasWidth / 2f, canvasHeight / 2f - 30f, textPaint)
        canvas.drawText("左下角虚拟摇杆移动，自动攻击，升级选技能", canvasWidth / 2f, canvasHeight / 2f + 5f, textPaint)
        canvas.drawText("坚持 15 分钟击败最终 Boss 即可胜利", canvasWidth / 2f, canvasHeight / 2f + 35f, textPaint)

        // 开始按钮
        val btnW = 320f
        val btnH = 84f
        val btnX = (canvasWidth - btnW) / 2
        val btnY = canvasHeight / 2f + 80f
        paint.color = 0xFF4CAF50.toInt()
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 16f, 16f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = 32f
        textPaint.isFakeBoldText = true
        canvas.drawText("开始游戏", canvasWidth / 2f, btnY + 54f, textPaint)

        // 设置按钮
        val setY = btnY + btnH + 24f
        paint.color = 0xFF546E7A.toInt()
        canvas.drawRoundRect(RectF(btnX, setY, btnX + btnW, setY + btnH), 16f, 16f, paint)
        canvas.drawText("设置", canvasWidth / 2f, setY + 54f, textPaint)
        textPaint.isFakeBoldText = false
    }

    // ============ 设置界面 ============
    private fun drawSettings(canvas: Canvas) {
        paint.color = 0xFF0D0D1A.toInt()
        canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)

        textPaint.color = Color.WHITE
        textPaint.textSize = 48f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("设置", canvasWidth / 2f, 110f, textPaint)
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

        val rowH = 84f
        val startY = 170f
        val rowW = canvasWidth - 60f
        val rowX = 30f

        for ((i, item) in items.withIndex()) {
            val ry = startY + i * rowH
            // 行背景
            paint.color = 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(rowX, ry, rowX + rowW, ry + rowH - 12f), 14f, 14f, paint)
            // 标签
            textPaint.color = 0xFFB0BEC5.toInt()
            textPaint.textSize = 26f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(item.first, rowX + 28f, ry + 50f, textPaint)
            // 值
            textPaint.color = 0xFF4FC3F7.toInt()
            textPaint.textSize = 26f
            textPaint.isFakeBoldText = true
            textPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText(item.second, rowX + rowW - 28f, ry + 50f, textPaint)
            textPaint.isFakeBoldText = false
        }

        // 返回按钮
        val backY = startY + items.size * rowH + 24f
        paint.color = 0xFF546E7A.toInt()
        canvas.drawRoundRect(RectF(rowX, backY, rowX + rowW, backY + 72f), 14f, 14f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = 28f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("返回", canvasWidth / 2f, backY + 48f, textPaint)
        textPaint.isFakeBoldText = false
    }

    private fun handleSettingsTouch(x: Float, y: Float) {
        val rowH = 84f
        val startY = 170f
        val rowW = canvasWidth - 60f
        val rowX = 30f
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
        val backY = startY + keys.size * rowH + 24f
        if (x in rowX..(rowX + rowW) && y in backY..(backY + 72f)) {
            inSettings = false
        }
    }

    // ============ 暂停界面 ============
    private fun drawPaused(canvas: Canvas) {
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)

        textPaint.color = Color.WHITE
        textPaint.textSize = 48f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("已暂停", canvasWidth / 2f, canvasHeight / 2f - 100f, textPaint)
        textPaint.isFakeBoldText = false

        val btnW = min(canvasWidth - 80f, 400f)
        val btnH = 72f
        val btnX = (canvasWidth - btnW) / 2
        var btnY = canvasHeight / 2f - 40f

        val buttons = listOf(
            "继续游戏" to 0xFF4CAF50.toInt(),
            "重新开始" to 0xFFFF9800.toInt(),
            "返回主菜单" to 0xFF546E7A.toInt()
        )
        for ((text, color) in buttons) {
            paint.color = color
            canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 14f, 14f, paint)
            textPaint.color = Color.WHITE
            textPaint.textSize = 26f
            textPaint.isFakeBoldText = true
            canvas.drawText(text, canvasWidth / 2f, btnY + 46f, textPaint)
            textPaint.isFakeBoldText = false
            btnY += btnH + 20f
        }
    }

    private fun drawGameOver(canvas: Canvas) {
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)

        textPaint.color = 0xFFEF5350.toInt()
        textPaint.textSize = 64f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("游戏结束", canvasWidth / 2f, canvasHeight / 2f - 80f, textPaint)
        textPaint.isFakeBoldText = false

        drawStats(canvas)
        drawRestartButton(canvas)
    }

    private fun drawVictory(canvas: Canvas) {
        paint.color = 0xCC000000.toInt()
        canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)

        textPaint.color = 0xFFFFEB3B.toInt()
        textPaint.textSize = 64f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("胜利！", canvasWidth / 2f, canvasHeight / 2f - 80f, textPaint)
        textPaint.isFakeBoldText = false

        drawStats(canvas)
        drawRestartButton(canvas)
    }

    private fun drawStats(canvas: Canvas) {
        textPaint.color = Color.WHITE
        textPaint.textSize = 28f
        textPaint.textAlign = Paint.Align.CENTER
        val minutes = (world.gameTime / 60).toInt()
        val seconds = (world.gameTime % 60).toInt()
        canvas.drawText("存活时间: ${String.format("%02d:%02d", minutes, seconds)}", canvasWidth / 2f, canvasHeight / 2f, textPaint)
        canvas.drawText("击杀数: ${world.player.kills}", canvasWidth / 2f, canvasHeight / 2f + 45f, textPaint)
        canvas.drawText("达到等级: ${world.player.level}", canvasWidth / 2f, canvasHeight / 2f + 90f, textPaint)
    }

    private fun drawRestartButton(canvas: Canvas) {
        val btnW = 320f
        val btnH = 84f
        val btnX = (canvasWidth - btnW) / 2
        val btnY = canvasHeight / 2f + 140f
        paint.color = 0xFF4CAF50.toInt()
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 16f, 16f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = 32f
        textPaint.isFakeBoldText = true
        canvas.drawText("再来一局", canvasWidth / 2f, btnY + 54f, textPaint)
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
                        val btnW = 320f; val btnH = 84f
                        val btnX = (canvasWidth - btnW) / 2
                        val btnY = canvasHeight / 2f + 80f
                        if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                            world.startGame()
                        }
                        // 设置按钮
                        val setY = btnY + btnH + 24f
                        if (x in btnX..(btnX + btnW) && y in setY..(setY + btnH)) {
                            inSettings = true
                        }
                    }
                }
            }
            GameState.LEVEL_UP -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val cardW = min(canvasWidth - 40f, 900f) / 3f - 12f
                    val cardH = 280f
                    val cardY = (canvasHeight - cardH) / 2f
                    val totalW = cardW * 3 + 24f
                    var cardX = (canvasWidth - totalW) / 2f + 6f
                    for (option in world.levelUpOptions) {
                        if (x in cardX..(cardX + cardW) && y in cardY..(cardY + cardH)) {
                            world.selectLevelUpOption(option)
                            break
                        }
                        cardX += cardW + 15f
                    }
                }
            }
            GameState.GAME_OVER, GameState.VICTORY -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val btnW = 320f; val btnH = 84f
                    val btnX = (canvasWidth - btnW) / 2
                    val btnY = canvasHeight / 2f + 140f
                    if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                        world.startGame()
                    }
                }
            }
            GameState.PAUSED -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val btnW = min(canvasWidth - 80f, 400f)
                    val btnH = 72f
                    val btnX = (canvasWidth - btnW) / 2
                    val baseY = canvasHeight / 2f - 40f
                    // 继续游戏
                    if (x in btnX..(btnX + btnW) && y in baseY..(baseY + btnH)) {
                        world.resume()
                    }
                    // 重新开始
                    val restartY = baseY + btnH + 20f
                    if (x in btnX..(btnX + btnW) && y in restartY..(restartY + btnH)) {
                        world.startGame()
                    }
                    // 返回主菜单
                    val menuY = restartY + btnH + 20f
                    if (x in btnX..(btnX + btnW) && y in menuY..(menuY + btnH)) {
                        world.backToMenu()
                    }
                }
            }
            GameState.PLAYING -> {
                when (action) {
                    MotionEvent.ACTION_DOWN -> {
                        // 检测暂停按钮
                        val pauseX = canvasWidth - 68f
                        if (x in pauseX..(pauseX + 56f) && y in 12f..68f) {
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
                            val maxDist = 60f * Settings.joystickSize
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
