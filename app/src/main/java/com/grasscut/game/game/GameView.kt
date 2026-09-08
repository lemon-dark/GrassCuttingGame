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
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin

data class Quad<out A, out B, out C, out D>(val first: A, val second: B, val third: C, val fourth: D)

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
    private var playerSheetBmp: Bitmap? = null
    private var enemyNormalSheetBmp: Bitmap? = null
    private var enemyFastSheetBmp: Bitmap? = null
    private var enemyTankSheetBmp: Bitmap? = null
    private var enemyEliteSheetBmp: Bitmap? = null
    private var enemyBossSheetBmp: Bitmap? = null

    // 物品和子弹贴图
    private var xpGemBmp: Bitmap? = null
    private var bulletEnergyBmp: Bitmap? = null
    private var bulletKnifeBmp: Bitmap? = null
    private var bulletFireballBmp: Bitmap? = null
    private var backgroundBmp: Bitmap? = null

    // 爆炸序列帧贴图（程序生成，16帧4x4）
    private var explosionSpriteSheet: Bitmap? = null
    private val EXPLOSION_FRAME_SIZE = 256
    private val EXPLOSION_COLS = 4
    private val EXPLOSION_ROWS = 4

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
            playerSheetBmp = BitmapFactory.decodeStream(context.assets.open("player_sheet.png"))
            enemyNormalSheetBmp = BitmapFactory.decodeStream(context.assets.open("enemy_normal_sheet.png"))
            enemyFastSheetBmp = BitmapFactory.decodeStream(context.assets.open("enemy_fast_sheet.png"))
            enemyTankSheetBmp = BitmapFactory.decodeStream(context.assets.open("enemy_tank_sheet.png"))
            enemyEliteSheetBmp = BitmapFactory.decodeStream(context.assets.open("enemy_elite_sheet.png"))
            enemyBossSheetBmp = BitmapFactory.decodeStream(context.assets.open("enemy_boss_sheet.png"))
            // 物品和子弹贴图
            xpGemBmp = BitmapFactory.decodeStream(context.assets.open("xp_gem.png"))
            bulletEnergyBmp = BitmapFactory.decodeStream(context.assets.open("bullet_energy.png"))
            bulletKnifeBmp = BitmapFactory.decodeStream(context.assets.open("bullet_knife.png"))
            bulletFireballBmp = BitmapFactory.decodeStream(context.assets.open("bullet_fireball.png"))
            // 背景贴图（整张，不裁剪）
            backgroundBmp = BitmapFactory.decodeStream(context.assets.open("background_full.png"))
            // 程序生成爆炸序列帧贴图
            explosionSpriteSheet = generateExplosionSpriteSheet()
        } catch (e: Exception) {
            // 贴图加载失败，回退几何图形
        }
    }

    // 程序生成爆炸序列帧贴图（16帧4x4，模拟Bloom泛光+多层烟雾+冲击波）
    private fun generateExplosionSpriteSheet(): Bitmap {
        val sheet = Bitmap.createBitmap(
            EXPLOSION_FRAME_SIZE * EXPLOSION_COLS,
            EXPLOSION_FRAME_SIZE * EXPLOSION_ROWS,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(sheet)
        val center = EXPLOSION_FRAME_SIZE / 2f

        for (frame in 0 until 16) {
            val col = frame % EXPLOSION_COLS
            val row = frame / EXPLOSION_COLS
            val offsetX = col * EXPLOSION_FRAME_SIZE.toFloat()
            val offsetY = row * EXPLOSION_FRAME_SIZE.toFloat()
            val t = frame / 15f  // 0~1 进度

            canvas.save()
            canvas.translate(offsetX, offsetY)

            // 阶段1 (0-0.25): 核心闪光 - 白色高亮，快速扩大
            // 阶段2 (0.25-0.5): 火球膨胀 - 橙红色，带烟雾
            // 阶段3 (0.5-0.75): 冲击波扩散 - 环形，带火花
            // 阶段4 (0.75-1.0): 烟雾消散 - 灰色，缓慢变淡

            val baseRadius = center * (0.15f + t * 0.85f)
            val alpha = (255 * (1f - t * 0.7f)).toInt().coerceIn(0, 255)

            // 第1层：最外层光晕（模拟Bloom，大范围低透明度）
            if (t < 0.7f) {
                val glowRadius = baseRadius * 1.8f
                val glowAlpha = (alpha * 0.15f).toInt()
                val glowColor = when {
                    t < 0.3f -> 0xFFFFF8E1.toInt()  // 近白
                    t < 0.6f -> 0xFFFF6F00.toInt()  // 橙
                    else -> 0xFFD84315.toInt()      // 深红
                }
                val glowGrad = android.graphics.RadialGradient(
                    center, center, glowRadius,
                    glowColor and 0x00FFFFFF or (glowAlpha shl 24),
                    glowColor and 0x00FFFFFF,
                    android.graphics.Shader.TileMode.CLAMP
                )
                paint.shader = glowGrad
                paint.alpha = glowAlpha
                canvas.drawCircle(center, center, glowRadius, paint)
                paint.shader = null
            }

            // 第2层：主火球（径向渐变，核心亮边缘暗）
            if (t < 0.85f) {
                val fireRadius = baseRadius * 1.0f
                val coreColor = when {
                    t < 0.2f -> 0xFFFFFFFF.toInt()   // 白
                    t < 0.4f -> 0xFFFFEB3B.toInt()   // 黄
                    t < 0.65f -> 0xFFFF9800.toInt()  // 橙
                    else -> 0xFFE65100.toInt()        // 深橙
                }
                val edgeColor = when {
                    t < 0.4f -> 0xFFFF5722.toInt()
                    else -> 0xFFBF360C.toInt()
                }
                val fireGrad = android.graphics.RadialGradient(
                    center, center, fireRadius,
                    intArrayOf(coreColor, edgeColor, edgeColor and 0x00FFFFFF),
                    floatArrayOf(0f, 0.6f, 1f),
                    android.graphics.Shader.TileMode.CLAMP
                )
                paint.shader = fireGrad
                paint.alpha = alpha
                canvas.drawCircle(center, center, fireRadius, paint)
                paint.shader = null
            }

            // 第3层：核心亮点（白色小圈，高亮度）
            if (t < 0.4f) {
                val coreRadius = baseRadius * 0.3f * (1f - t * 2f)
                val coreGrad = android.graphics.RadialGradient(
                    center, center, coreRadius,
                    0xFFFFFFFF.toInt(), 0xFFFFEB3B.toInt(),
                    android.graphics.Shader.TileMode.CLAMP
                )
                paint.shader = coreGrad
                paint.alpha = (alpha * 0.9f).toInt()
                canvas.drawCircle(center, center, coreRadius, paint)
                paint.shader = null
            }

            // 第4层：冲击波环（2-3层，不同速度）
            if (t > 0.2f && t < 0.9f) {
                val ringProgress = (t - 0.2f) / 0.7f
                for (ring in 0..2) {
                    val ringT = (ringProgress + ring * 0.15f).coerceIn(0f, 1f)
                    val ringRadius = baseRadius * (0.6f + ringT * 0.6f)
                    val ringWidth = 6f * (1f - ringT) + 1f
                    val ringAlpha = (alpha * (1f - ringT) * 0.6f).toInt()
                    val ringColor = when (ring) {
                        0 -> 0xFFFFAB40.toInt()
                        1 -> 0xFFFFFFFF.toInt()
                        else -> 0xFFFF6F00.toInt()
                    }
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = ringWidth
                    paint.color = ringColor
                    paint.alpha = ringAlpha
                    canvas.drawCircle(center, center, ringRadius, paint)
                }
                paint.style = Paint.Style.FILL
            }

            // 第5层：烟雾（不规则的灰色斑块，缓慢扩大）
            if (t > 0.3f) {
                val smokeProgress = (t - 0.3f) / 0.7f
                val smokeCount = 6
                for (i in 0 until smokeCount) {
                    val angle = (i / smokeCount.toFloat()) * 6.28f + t * 2f
                    val dist = baseRadius * (0.5f + smokeProgress * 0.6f)
                    val sx = center + cos(angle) * dist * 0.7f
                    val sy = center + sin(angle) * dist * 0.7f - smokeProgress * 20f
                    val smokeRadius = baseRadius * 0.25f * (1f + smokeProgress * 0.5f)
                    val smokeAlpha = (alpha * 0.25f * (1f - smokeProgress * 0.5f)).toInt()
                    val smokeGrad = android.graphics.RadialGradient(
                        sx, sy, smokeRadius,
                        0xFF555555.toInt() and 0x00FFFFFF or (smokeAlpha shl 24),
                        0xFF555555.toInt() and 0x00FFFFFF,
                        android.graphics.Shader.TileMode.CLAMP
                    )
                    paint.shader = smokeGrad
                    paint.alpha = smokeAlpha
                    canvas.drawCircle(sx, sy, smokeRadius, paint)
                    paint.shader = null
                }
            }

            // 第6层：火花（小亮点，带拖尾感）
            if (t > 0.15f && t < 0.7f) {
                val sparkCount = 12
                for (i in 0 until sparkCount) {
                    val angle = (i / sparkCount.toFloat()) * 6.28f + t * 3f
                    val sparkDist = baseRadius * (0.4f + (t - 0.15f) * 1.2f)
                    val sx = center + cos(angle) * sparkDist
                    val sy = center + sin(angle) * sparkDist
                    val sparkSize = 3f + (1f - t) * 3f
                    val sparkAlpha = (alpha * (1f - (t - 0.15f) / 0.55f) * 0.8f).toInt()
                    paint.color = if (i % 2 == 0) 0xFFFFEB3B.toInt() else 0xFFFF6F00.toInt()
                    paint.alpha = sparkAlpha
                    canvas.drawCircle(sx, sy, sparkSize, paint)
                }
            }

            paint.alpha = 255
            canvas.restore()
        }

        return sheet
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
    private fun drawCharacter(canvas: Canvas, sheet: Bitmap?, x: Float, y: Float, radius: Float, frameIndex: Int = 0, flipX: Boolean = false, alpha: Int = 255, frameCount: Int = 4) {
        if (sheet == null) {
            paint.alpha = alpha
            paint.color = 0xFF81C784.toInt()
            canvas.drawCircle(x, y, radius, paint)
            paint.alpha = 255
            return
        }
        val frameWidth = sheet.width / frameCount
        val frame = frameIndex.coerceIn(0, frameCount - 1)
        val size = radius * 2.3f
        val ratio = sheet.height.toFloat() / frameWidth.toFloat()
        val w = size
        val h = size * ratio
        val src = Rect(frame * frameWidth, 0, (frame + 1) * frameWidth, sheet.height)
        val dst = RectF(x - w / 2, y - h / 2, x + w / 2, y + h / 2)
        paint.alpha = alpha
        if (flipX) {
            canvas.save()
            canvas.scale(-1f, 1f, x, y)
            canvas.drawBitmap(sheet, src, dst, paint)
            canvas.restore()
        } else {
            canvas.drawBitmap(sheet, src, dst, paint)
        }
        paint.alpha = 255
    }

    private fun loadSounds() {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(12)
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
            "warning" to R.raw.warning,
            // 战斗语音
            "voice_attack" to R.raw.voice_attack,
            "voice_kill" to R.raw.voice_kill,
            "voice_levelup" to R.raw.voice_levelup,
            "voice_hurt" to R.raw.voice_hurt,
            "voice_ultimate" to R.raw.voice_ultimate,
            "voice_lowhp" to R.raw.voice_lowhp
        )
        for ((name, resId) in sounds) {
            soundIds[name] = soundPool.load(context, resId, 1)
        }
    }

    private fun playSound(name: String, rate: Float = 1f) {
        if (!soundReady || !Settings.soundEnabled) return
        soundIds[name]?.let { id ->
            // 拾取音效使用独立音量设置，其他音效使用主音量
            val vol = if (name == "pickup") Settings.pickupVolume else Settings.soundVolume
            soundPool.play(id, vol, vol, 1, 0, rate.coerceIn(0.5f, 2f))
        }
    }

    private fun playVoice(name: String) {
        if (!soundReady || !Settings.soundEnabled) return
        soundIds[name]?.let { id ->
            // 语音使用主音量的80%，避免盖过音效
            val vol = Settings.soundVolume * 0.8f
            soundPool.play(id, vol, vol, 2, 0, 1f)  // 优先级2，高于普通音效
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
                for (e in events) playSound(e.first, e.second)
            }
            // 消费语音事件
            if (world.voiceEvents.isNotEmpty()) {
                val voices = ArrayList(world.voiceEvents)
                world.voiceEvents.clear()
                for (v in voices) playVoice(v)
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
            // 子页面渲染
            when (world.state) {
                GameState.LEVEL_SELECT -> { drawLevelSelect(canvas); return }
                GameState.META_UPGRADE -> { drawMetaUpgrade(canvas); return }
                GameState.CHARACTERS -> { drawCharacters(canvas); return }
                GameState.EQUIPMENT -> { drawEquipment(canvas); return }
                GameState.BESTIARY -> { drawBestiary(canvas); return }
                GameState.WEAPONS -> { drawWeapons(canvas); return }
                GameState.SKILLS_INFO -> { drawSkillsInfo(canvas); return }
                else -> {}
            }

            // 屏幕震动（在世界坐标渲染之前偏移整个画布）
            if (world.shakeDuration > 0) {
                val dx = (Math.random().toFloat() - 0.5f) * world.shakeAmount
                val dy = (Math.random().toFloat() - 0.5f) * world.shakeAmount
                canvas.translate(dx, dy)
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
            drawExplosions(canvas)
            drawOrbitingKnives(canvas)
            drawMeteors(canvas)
            drawWhirlwind(canvas)
            drawParticles(canvas)
            drawFloatingTexts(canvas)

            canvas.restore()

            // UI 渲染（屏幕坐标，不受震动影响）
            drawHUD(canvas)
            // 受伤红屏闪烁（边缘渐变）
            if (world.hurtFlashTimer > 0) {
                val alpha = (world.hurtFlashTimer / 0.3f * 120).toInt().coerceIn(0, 120)
                paint.shader = android.graphics.RadialGradient(
                    canvasWidth / 2f, canvasHeight / 2f, canvasWidth * 0.6f,
                    intArrayOf(0x00FF0000, (alpha shl 24) or 0xFF0000),
                    floatArrayOf(0f, 1f),
                    android.graphics.Shader.TileMode.CLAMP
                )
                canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)
                paint.shader = null
            }
            // 全屏闪光
            if (world.flashDuration > 0 && world.flashAlpha > 0) {
                paint.color = world.flashColor
                paint.alpha = world.flashAlpha
                canvas.drawRect(0f, 0f, canvasWidth.toFloat(), canvasHeight.toFloat(), paint)
                paint.alpha = 255
            }
            // 超武进化提示
            drawEvolutionNotice(canvas)
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
        if (backgroundBmp != null) {
            // 整张背景图拉伸覆盖整个地图，只画一次
            val src = Rect(0, 0, backgroundBmp!!.width, backgroundBmp!!.height)
            val dst = RectF(0f, 0f, GameConfig.MAP_WIDTH, GameConfig.MAP_HEIGHT)
            canvas.drawBitmap(backgroundBmp!!, src, dst, null)
        } else {
            // 回退：棋盘格
            val tileSize = 400f
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
            // 外层发光
            drawGlow(canvas, glowGold, gem.x, gem.y, gem.radius * 2.8f, 120)
            // 宝石贴图
            if (xpGemBmp != null) {
                val size = gem.radius * 2.5f
                val ratio = xpGemBmp!!.height.toFloat() / xpGemBmp!!.width.toFloat()
                val w = size
                val h = size * ratio
                val src = Rect(0, 0, xpGemBmp!!.width, xpGemBmp!!.height)
                val dst = RectF(gem.x - w / 2, gem.y - h / 2, gem.x + w / 2, gem.y + h / 2)
                canvas.drawBitmap(xpGemBmp!!, src, dst, paint)
            } else {
                paint.color = GameConfig.COLOR_XP
                canvas.drawCircle(gem.x, gem.y, gem.radius, paint)
            }
        }
    }

    // ============ 光环 + 拾取范围 ============
    private fun drawAura(canvas: Canvas) {
        // 拾取范围圈（极淡，仅作 subtle 提示）
        val pickupRange = world.player.effectivePickupRange
        paint.color = 0xFF00E5FF.toInt()
        paint.alpha = 10
        canvas.drawCircle(world.player.x, world.player.y, pickupRange, paint)
        paint.alpha = 18
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1.5f
        paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(12f, 12f), 0f)
        canvas.drawCircle(world.player.x, world.player.y, pickupRange, paint)
        paint.pathEffect = null
        paint.style = Paint.Style.FILL
        paint.alpha = 255

        // 灼烧光环
        if (!world.auraActive) return
        val px = world.player.x
        val py = world.player.y
        val r = world.auraRadius

        if (world.auraEvolved) {
            // 超武：太阳风暴——3层旋转环+脉动
            val pulse = 1f + Math.sin(System.currentTimeMillis() * 0.003).toFloat() * 0.04f
            val rot1 = (System.currentTimeMillis() * 0.05f) % 360
            val rot2 = (System.currentTimeMillis() * -0.03f) % 360
            val rot3 = (System.currentTimeMillis() * 0.02f) % 360

            // 底层填充
            paint.color = 0xFFFF6D00.toInt()
            paint.alpha = 20
            canvas.drawCircle(px, py, r * pulse, paint)

            // 3层旋转虚线环
            val layers = arrayOf(
                Triple(r * 0.7f, 0xFF00E5FF.toInt(), rot1),
                Triple(r * 1.0f, 0xFFFF6D00.toInt(), rot2),
                Triple(r * 1.3f, 0xFFFFEB3B.toInt(), rot3)
            )
            paint.style = Paint.Style.STROKE
            for ((radius, color, rot) in layers) {
                paint.color = color
                paint.alpha = 100
                paint.strokeWidth = 4f
                paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(30f, 15f), rot)
                canvas.drawCircle(px, py, radius * pulse, paint)
            }
            paint.pathEffect = null
            paint.style = Paint.Style.FILL
            paint.alpha = 255
        } else {
            // 普通光环
            paint.color = 0xFFFFAB40.toInt()
            paint.alpha = 25
            canvas.drawCircle(px, py, r, paint)
            paint.alpha = 60
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 3f
            canvas.drawCircle(px, py, r, paint)
            paint.style = Paint.Style.FILL
            paint.alpha = 255
        }
    }

    // ============ 敌人 ============
    private fun drawEnemies(canvas: Canvas) {
        for (e in world.enemies) {
            if (!e.alive) continue
            val sheet = when (e.type) {
                EnemyType.NORMAL -> enemyNormalSheetBmp
                EnemyType.FAST -> enemyFastSheetBmp
                EnemyType.TANK -> enemyTankSheetBmp
                EnemyType.ELITE -> enemyEliteSheetBmp
                EnemyType.BOSS -> enemyBossSheetBmp
            }
            val alpha = if (e.hitFlash > 0) 180 else 255
            val visualRadius = e.radius * GameConfig.VISUAL_ENEMY_SCALE
            // 受击时轻微放大
            val hitScale = if (e.hitFlash > 0) 1.15f else 1f
            val renderRadius = visualRadius * hitScale
            drawCharacter(canvas, sheet, e.x, e.y, renderRadius, e.animFrame, e.facingRight, alpha)
            // 受击白色闪光覆盖
            if (e.hitFlash > 0) {
                paint.color = 0xFFFFFFFF.toInt()
                paint.alpha = (e.hitFlash / 0.15f * 120).toInt().coerceIn(0, 120)
                canvas.drawCircle(e.x, e.y, renderRadius * 0.9f, paint)
                paint.alpha = 255
            }

            // 血条
            if (e.hp < e.maxHp) {
                val barW = visualRadius * 2
                val barH = 5f
                val barX = e.x - visualRadius
                val barY = e.y - visualRadius - 12
                paint.color = 0xFF000000.toInt()
                paint.alpha = 150
                canvas.drawRect(barX, barY, barX + barW, barY + barH, paint)
                paint.color = GameConfig.COLOR_HP_FG
                paint.alpha = 255
                canvas.drawRect(barX, barY, barX + barW * (e.hp / e.maxHp), barY + barH, paint)
            }

            // 冰冻效果
            if (e.slowTimer > 0) {
                drawGlow(canvas, glowBlue, e.x, e.y, visualRadius * 1.3f, 80)
                paint.color = 0xFF81D4FA.toInt()
                paint.alpha = 100
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 3f
                canvas.drawCircle(e.x, e.y, visualRadius * 1.1f, paint)
                paint.style = Paint.Style.FILL
                paint.alpha = 255
            }
        }
    }

    // ============ 玩家 ============
    private fun drawPlayer(canvas: Canvas) {
        val p = world.player
        val alpha = if (p.invincibleTimer > 0 && (p.invincibleTimer * 20).toInt() % 2 == 0) 100 else 255
        val visualRadius = p.radius * GameConfig.VISUAL_PLAYER_SCALE
        drawCharacter(canvas, playerSheetBmp, p.x, p.y, visualRadius, p.animFrame, p.facingRight, alpha)
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
                // 飞刀：发光 + 旋转贴图
                drawGlow(canvas, glowWhite, b.x, b.y, b.size * 1.8f, 100)
                val angle = kotlin.math.atan2(b.vy, b.vx)
                canvas.save()
                canvas.rotate(Math.toDegrees(angle.toDouble()).toFloat(), b.x, b.y)
                if (bulletKnifeBmp != null) {
                    val kw = b.size * 3.5f
                    val kh = kw * bulletKnifeBmp!!.height / bulletKnifeBmp!!.width
                    val src = Rect(0, 0, bulletKnifeBmp!!.width, bulletKnifeBmp!!.height)
                    val dst = RectF(b.x - kw / 2, b.y - kh / 2, b.x + kw / 2, b.y + kh / 2)
                    canvas.drawBitmap(bulletKnifeBmp!!, src, dst, paint)
                } else {
                    paint.color = b.color
                    canvas.drawRect(b.x - b.size * 1.5f, b.y - b.size * 0.4f, b.x + b.size * 1.5f, b.y + b.size * 0.4f, paint)
                }
                canvas.restore()
            } else if (b.bulletType == "fireball") {
                // 火球：大发光 + 贴图
                drawGlow(canvas, glowOrange, b.x, b.y, b.size * 2.5f, 140)
                if (bulletFireballBmp != null) {
                    val fw = b.size * 3f
                    val fh = fw * bulletFireballBmp!!.height / bulletFireballBmp!!.width
                    val src = Rect(0, 0, bulletFireballBmp!!.width, bulletFireballBmp!!.height)
                    val dst = RectF(b.x - fw / 2, b.y - fh / 2, b.x + fw / 2, b.y + fh / 2)
                    canvas.drawBitmap(bulletFireballBmp!!, src, dst, paint)
                } else {
                    drawGlow(canvas, glowGold, b.x, b.y, b.size * 0.8f, 255)
                }
            } else if (b.bulletType == "missile") {
                // 追踪导弹：尾焰 + 弹体
                val angle = kotlin.math.atan2(b.vy, b.vx)
                canvas.save()
                canvas.translate(b.x, b.y)
                canvas.rotate(Math.toDegrees(angle.toDouble()).toFloat())
                // 尾焰
                drawGlow(canvas, glowOrange, -b.size * 1.5f, 0f, b.size * 1.5f, 150)
                drawGlow(canvas, glowGold, -b.size * 0.8f, 0f, b.size * 0.8f, 200)
                // 弹体
                paint.color = 0xFF424242.toInt()
                canvas.drawRoundRect(RectF(-b.size, -b.size * 0.5f, b.size, b.size * 0.5f), 4f, 4f, paint)
                paint.color = 0xFFFF6D00.toInt()
                canvas.drawCircle(b.size * 0.6f, 0f, b.size * 0.35f, paint)
                canvas.restore()
            } else if (b.bulletType == "ice_spike") {
                // 冰锥：蓝色发光 + 菱形冰锥
                val angle = kotlin.math.atan2(b.vy, b.vx)
                drawGlow(canvas, glowBlue, b.x, b.y, b.size * 2f, 120)
                canvas.save()
                canvas.translate(b.x, b.y)
                canvas.rotate(Math.toDegrees(angle.toDouble()).toFloat())
                paint.color = 0xFF81D4FA.toInt()
                val path = android.graphics.Path()
                path.moveTo(b.size * 1.5f, 0f)
                path.lineTo(0f, b.size * 0.6f)
                path.lineTo(-b.size * 0.8f, 0f)
                path.lineTo(0f, -b.size * 0.6f)
                path.close()
                canvas.drawPath(path, paint)
                paint.color = 0xFFE1F5FE.toInt()
                canvas.drawLine(0f, 0f, b.size * 1.2f, 0f, paint)
                canvas.restore()
            } else {
                // 普通子弹：发光 + 贴图
                drawGlow(canvas, glowBlue, b.x, b.y, b.size * 2f, 160)
                if (bulletEnergyBmp != null) {
                    val ew = b.size * 2.8f
                    val eh = ew * bulletEnergyBmp!!.height / bulletEnergyBmp!!.width
                    val src = Rect(0, 0, bulletEnergyBmp!!.width, bulletEnergyBmp!!.height)
                    val dst = RectF(b.x - ew / 2, b.y - eh / 2, b.x + ew / 2, b.y + eh / 2)
                    canvas.drawBitmap(bulletEnergyBmp!!, src, dst, paint)
                } else {
                    paint.color = Color.WHITE
                    paint.alpha = 255
                    canvas.drawCircle(b.x, b.y, b.size * 0.4f, paint)
                }
            }
        }
        paint.alpha = 255
    }

    // ============ 闪电（升级：主闪电+分支+电弧闪烁+命中辉光） ============
    private fun drawLightning(canvas: Canvas) {
        paint.style = Paint.Style.STROKE
        paint.strokeCap = Paint.Cap.ROUND
        paint.strokeJoin = Paint.Join.ROUND
        for (bolt in world.lightningBolts) {
            val pts = bolt.points
            if (pts.size < 2) continue
            val alpha = bolt.flickerAlpha

            // 分支闪电（细、半透明）
            for (branch in bolt.branches) {
                if (branch.size < 2) continue
                paint.color = lighterColor(bolt.color, 0.3f)
                paint.strokeWidth = bolt.width * 0.8f
                paint.alpha = (alpha * 0.5f).toInt()
                for (i in 0 until branch.size - 1) {
                    canvas.drawLine(branch[i].first, branch[i].second, branch[i+1].first, branch[i+1].second, paint)
                }
            }

            // 外发光（粗、半透明）
            paint.color = lighterColor(bolt.color, 0.4f)
            paint.strokeWidth = bolt.width * 4f
            paint.alpha = (alpha * 0.3f).toInt()
            for (i in 0 until pts.size - 1) {
                canvas.drawLine(pts[i].first, pts[i].second, pts[i+1].first, pts[i+1].second, paint)
            }
            // 中层（主色）
            paint.color = bolt.color
            paint.strokeWidth = bolt.width * 1.8f
            paint.alpha = (alpha * 0.8f).toInt()
            for (i in 0 until pts.size - 1) {
                canvas.drawLine(pts[i].first, pts[i].second, pts[i+1].first, pts[i+1].second, paint)
            }
            // 内芯（亮白）
            paint.color = 0xFFFFFFFF.toInt()
            paint.strokeWidth = bolt.width * 0.7f
            paint.alpha = alpha
            for (i in 0 until pts.size - 1) {
                canvas.drawLine(pts[i].first, pts[i].second, pts[i+1].first, pts[i+1].second, paint)
            }

            // 命中点辉光（末端）
            val endX = pts.last().first
            val endY = pts.last().second
            val glowGrad = android.graphics.RadialGradient(
                endX, endY, bolt.width * 6f,
                0xFFFFFFFF.toInt(), lighterColor(bolt.color, 0.2f) and 0x00FFFFFF,
                android.graphics.Shader.TileMode.CLAMP
            )
            paint.shader = glowGrad
            paint.style = Paint.Style.FILL
            paint.alpha = (alpha * 0.8f).toInt()
            canvas.drawCircle(endX, endY, bolt.width * 6f, paint)
            paint.shader = null
            paint.style = Paint.Style.STROKE

            // 起点辉光
            val startX = pts.first().first
            val startY = pts.first().second
            val startGrad = android.graphics.RadialGradient(
                startX, startY, bolt.width * 4f,
                0xFFFFFFFF.toInt(), lighterColor(bolt.color, 0.3f) and 0x00FFFFFF,
                android.graphics.Shader.TileMode.CLAMP
            )
            paint.shader = startGrad
            paint.style = Paint.Style.FILL
            paint.alpha = (alpha * 0.6f).toInt()
            canvas.drawCircle(startX, startY, bolt.width * 4f, paint)
            paint.shader = null
            paint.style = Paint.Style.STROKE
        }
        paint.alpha = 255
        paint.strokeWidth = 1f
        paint.style = Paint.Style.FILL
    }

    // ============ 爆炸冲击波 ============
    private fun drawExplosions(canvas: Canvas) {
        for (exp in world.explosions) {
            if (explosionSpriteSheet != null && exp.useSprite) {
                // 用序列帧贴图渲染爆炸
                val frame = exp.frameIndex
                val col = frame % EXPLOSION_COLS
                val row = frame / EXPLOSION_COLS
                val srcX = col * EXPLOSION_FRAME_SIZE
                val srcY = row * EXPLOSION_FRAME_SIZE
                val src = Rect(srcX, srcY, srcX + EXPLOSION_FRAME_SIZE, srcY + EXPLOSION_FRAME_SIZE)
                // 爆炸大小根据 maxRadius 调整（放大让特效更突出）
                val size = exp.maxRadius * 4f
                val dst = RectF(exp.x - size / 2, exp.y - size / 2, exp.x + size / 2, exp.y + size / 2)
                paint.alpha = exp.alpha
                canvas.drawBitmap(explosionSpriteSheet!!, src, dst, paint)
                paint.alpha = 255
            } else {
                // 回退：圆环渲染
                paint.style = Paint.Style.STROKE
                // 外发光环
                paint.color = exp.color
                paint.strokeWidth = exp.lineWidth * 2
                paint.alpha = (exp.alpha * 0.4f).toInt().coerceIn(0, 255)
                canvas.drawCircle(exp.x, exp.y, exp.radius * 1.1f, paint)
                // 主环
                paint.strokeWidth = exp.lineWidth
                paint.alpha = exp.alpha
                canvas.drawCircle(exp.x, exp.y, exp.radius, paint)
                // 内圈
                paint.strokeWidth = exp.lineWidth * 0.5f
                paint.alpha = (exp.alpha * 0.7f).toInt().coerceIn(0, 255)
                canvas.drawCircle(exp.x, exp.y, exp.radius * 0.7f, paint)
                paint.alpha = 255
                paint.style = Paint.Style.FILL
            }
        }
    }

    // ============ 环绕飞刀（万剑归宗） ============
    private fun drawOrbitingKnives(canvas: Canvas) {
        for (knife in world.orbitingKnives) {
            canvas.save()
            canvas.translate(knife.x, knife.y)
            canvas.rotate(Math.toDegrees(knife.angle.toDouble()).toFloat() + 90f)
            // 飞刀发光
            drawGlow(canvas, glowWhite, 0f, 0f, 50f, 120)
            // 飞刀形状（菱形）
            paint.color = 0xFFE0E0E0.toInt()
            val path = android.graphics.Path()
            path.moveTo(0f, -18f)
            path.lineTo(6f, 0f)
            path.lineTo(0f, 18f)
            path.lineTo(-6f, 0f)
            path.close()
            canvas.drawPath(path, paint)
            // 刀刃高光
            paint.color = 0xFFFFFFFF.toInt()
            canvas.drawLine(0f, -14f, 0f, 10f, paint)
            canvas.restore()
        }
    }

    // ============ 陨石（陨石雨） ============
    private fun drawMeteors(canvas: Canvas) {
        for (m in world.meteorStrikes) {
            if (m.progress < 1f) {
                // 落下中的陨石：从屏幕上方插值到目标
                val startY = m.targetY - 800f
                val curY = startY + (m.targetY - startY) * m.progress
                val curX = m.targetX
                // 尾焰
                for (i in 0..5) {
                    val trailY = curY - i * 25f
                    val trailAlpha = (150 - i * 25).coerceAtLeast(0)
                    drawGlow(canvas, glowOrange, curX, trailY, 40f - i * 5f, trailAlpha)
                }
                // 陨石本体
                drawGlow(canvas, glowOrange, curX, curY, 60f, 200)
                paint.color = 0xFF8D6E63.toInt()
                canvas.drawCircle(curX, curY, 18f, paint)
                paint.color = 0xFFFF5722.toInt()
                canvas.drawCircle(curX, curY, 12f, paint)
                // 目标预警圈
                paint.color = 0xFFFF5722.toInt()
                paint.alpha = (100 + Math.sin(m.progress * Math.PI * 4).toFloat() * 50).toInt().coerceIn(50, 150)
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 3f
                canvas.drawCircle(m.targetX, m.targetY, m.radius * 0.3f, paint)
                paint.style = Paint.Style.FILL
                paint.alpha = 255
            }
        }
    }

    // ============ 超武进化提示 ============
    private fun drawEvolutionNotice(canvas: Canvas) {
        val notice = world.evolutionNotice ?: return
        val elapsed = System.currentTimeMillis() - notice.second
        if (elapsed > 3000) {
            world.evolutionNotice = null
            return
        }
        // 淡入淡出
        val alpha = when {
            elapsed < 300 -> (elapsed / 300f * 255).toInt()
            elapsed > 2700 -> ((3000 - elapsed) / 300f * 255).toInt()
            else -> 255
        }.coerceIn(0, 255)

        val cy = canvasHeight * 0.35f
        // 背景光效
        drawGlow(canvas, glowBlue, canvasWidth / 2f, cy, 200f, (alpha * 0.5f).toInt())
        // 标题
        paint.color = 0xFF00E5FF.toInt()
        paint.alpha = alpha
        paint.textSize = canvasWidth * 0.06f
        paint.textAlign = Paint.Align.CENTER
        paint.typeface = android.graphics.Typeface.DEFAULT_BOLD
        canvas.drawText("超武觉醒！", canvasWidth / 2f, cy - 30f, paint)
        // 超武名称
        paint.color = 0xFFFFFFFF.toInt()
        paint.textSize = canvasWidth * 0.08f
        canvas.drawText(notice.first, canvasWidth / 2f, cy + 40f, paint)
        // 副标题
        paint.color = 0xFFB0BEC5.toInt()
        paint.textSize = canvasWidth * 0.035f
        paint.typeface = android.graphics.Typeface.DEFAULT
        canvas.drawText("技能已进化为终极形态", canvasWidth / 2f, cy + 80f, paint)
        paint.alpha = 255
        paint.textAlign = Paint.Align.LEFT
    }

    // ============ 旋风斩风刃 ============
    private fun drawWhirlwind(canvas: Canvas) {
        for (blade in world.whirlwindBlades) {
            canvas.save()
            canvas.translate(blade.x, blade.y)
            canvas.rotate(Math.toDegrees(blade.angle.toDouble()).toFloat() + 90f)
            // 风刃发光
            val color = if (blade.powerful) 0xFF00E5FF.toInt() else 0xFFB0BEC5.toInt()
            drawGlow(canvas, if (blade.powerful) glowBlue else glowWhite, 0f, 0f, 45f, 100)
            // 风刃形状（弯月形）
            paint.color = color
            paint.alpha = 200
            val path = android.graphics.Path()
            path.moveTo(0f, -25f)
            path.quadTo(20f, 0f, 0f, 25f)
            path.quadTo(-8f, 0f, 0f, -25f)
            path.close()
            canvas.drawPath(path, paint)
            // 风刃高光
            paint.color = 0xFFFFFFFF.toInt()
            paint.alpha = 150
            canvas.drawLine(0f, -18f, 0f, 18f, paint)
            paint.alpha = 255
            canvas.restore()
        }
    }

    // ============ 粒子 ============
    private fun drawParticles(canvas: Canvas) {
        if (!Settings.particlesEnabled) return
        for (p in world.particles) {
            if (!p.alive) continue
            val alpha = ((1f - p.age / p.lifetime) * 220).toInt().coerceIn(0, 220)
            val bmp = pickGlowForColor(p.currentColor)

            // 拖尾渲染
            if (p.trail && p.trailPositions.size >= 2) {
                for (i in p.trailPositions.indices) {
                    val trailAlpha = (alpha * (i + 1) / p.trailPositions.size * 0.5f).toInt()
                    val trailSize = p.currentSize * 2f * (i + 1) / p.trailPositions.size
                    val pos = p.trailPositions[i]
                    drawGlow(canvas, bmp, pos.first, pos.second, trailSize * 3f, trailAlpha)
                }
            }

            // 主粒子（带旋转）
            if (p.rotationSpeed != 0f) {
                canvas.save()
                canvas.translate(p.x, p.y)
                canvas.rotate(Math.toDegrees(p.rotation.toDouble()).toFloat())
                drawGlow(canvas, bmp, 0f, 0f, p.currentSize * 3.6f, alpha)
                canvas.restore()
            } else {
                drawGlow(canvas, bmp, p.x, p.y, p.currentSize * 3.6f, alpha)
            }
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
            canvas.save()
            canvas.translate(ft.x, ft.y)
            canvas.scale(ft.scale, ft.scale)
            if (ft.isCrit) {
                // 暴击：黑色描边 + 金色文字
                textPaint.color = 0xFF000000.toInt()
                textPaint.alpha = ft.alpha
                textPaint.textSize = ft.size
                textPaint.isFakeBoldText = true
                textPaint.strokeWidth = 6f
                textPaint.style = Paint.Style.STROKE
                canvas.drawText(ft.text, 0f, 0f, textPaint)
                textPaint.style = Paint.Style.FILL
                textPaint.color = ft.color
                canvas.drawText(ft.text, 0f, 0f, textPaint)
            } else {
                textPaint.color = ft.color
                textPaint.alpha = ft.alpha
                textPaint.textSize = ft.size
                textPaint.isFakeBoldText = true
                canvas.drawText(ft.text, 0f, 0f, textPaint)
            }
            canvas.restore()
        }
        textPaint.alpha = 255
        textPaint.isFakeBoldText = false
    }

    // ============ HUD ============
    private fun drawHUD(canvas: Canvas) {
        val p = world.player
        val w = canvasWidth.toFloat()
        val h = canvasHeight.toFloat()

        // 左上：血条（渐变+发光）
        val hpBarW = w * 0.38f
        val hpBarH = h * 0.022f
        val hpX = w * 0.03f
        val hpY = h * 0.025f
        paint.color = 0xCC000000.toInt()
        canvas.drawRoundRect(RectF(hpX - 4, hpY - 4, hpX + hpBarW + 4, hpY + hpBarH + 4), 8f, 8f, paint)
        paint.color = GameConfig.COLOR_HP_BG
        canvas.drawRoundRect(RectF(hpX, hpY, hpX + hpBarW, hpY + hpBarH), 6f, 6f, paint)
        // 血条渐变（红→橙）
        val hpGrad = android.graphics.LinearGradient(hpX, hpY, hpX + hpBarW, hpY,
            0xFFEF5350.toInt(), 0xFFFF8A65.toInt(), android.graphics.Shader.TileMode.CLAMP)
        paint.shader = hpGrad
        canvas.drawRoundRect(RectF(hpX, hpY, hpX + hpBarW * (p.hp / p.effectiveMaxHp), hpY + hpBarH), 6f, 6f, paint)
        paint.shader = null
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.018f
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("${p.hp.toInt()} / ${p.effectiveMaxHp.toInt()}", hpX + 10, hpY + hpBarH * 0.75f, textPaint)

        // 经验条（渐变+发光）
        val xpY = hpY + hpBarH + h * 0.012f
        val xpBarH = h * 0.014f
        paint.color = GameConfig.COLOR_XP_BAR_BG
        canvas.drawRoundRect(RectF(hpX, xpY, hpX + hpBarW, xpY + xpBarH), 6f, 6f, paint)
        // 经验条渐变（金→橙）
        val xpGrad = android.graphics.LinearGradient(hpX, xpY, hpX + hpBarW, xpY,
            0xFFFFD700.toInt(), 0xFFFFAB40.toInt(), android.graphics.Shader.TileMode.CLAMP)
        paint.shader = xpGrad
        canvas.drawRoundRect(RectF(hpX, xpY, hpX + hpBarW * (p.xp.toFloat() / p.xpToNext), xpY + xpBarH), 6f, 6f, paint)
        paint.shader = null

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
    // ============ 技能图标（渐变+图案） ============
    private fun drawSkillIcon(canvas: Canvas, skill: Skill, cx: Float, cy: Float, r: Float) {
        // 径向渐变背景
        val gradient = android.graphics.RadialGradient(cx, cy, r,
            skill.iconColor, darkerColor(skill.iconColor), android.graphics.Shader.TileMode.CLAMP)
        paint.shader = gradient
        canvas.drawCircle(cx, cy, r, paint)
        paint.shader = null
        // 外圈
        paint.color = 0xFFFFFFFF.toInt()
        paint.alpha = 60
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2f
        canvas.drawCircle(cx, cy, r - 2f, paint)
        paint.style = Paint.Style.FILL
        paint.alpha = 255
        // 根据技能类型画图案
        paint.color = 0xFFFFFFFF.toInt()
        paint.alpha = 220
        when (skill) {
            is BasicAttackSkill -> {
                // 能量弹：中心圆点+射线
                canvas.drawCircle(cx, cy, r * 0.25f, paint)
                for (i in 0 until 4) {
                    val angle = i * Math.PI / 2 + world.gameTime * 2
                    canvas.drawLine(cx, cy,
                        cx + cos(angle.toFloat()) * r * 0.7f, cy + sin(angle.toFloat()) * r * 0.7f, paint)
                }
            }
            is KnifeSkill -> {
                // 飞刀：交叉的两条线
                paint.strokeWidth = 4f
                canvas.drawLine(cx - r * 0.5f, cy - r * 0.5f, cx + r * 0.5f, cy + r * 0.5f, paint)
                canvas.drawLine(cx + r * 0.5f, cy - r * 0.5f, cx - r * 0.5f, cy + r * 0.5f, paint)
                paint.strokeWidth = 1f
            }
            is FireballSkill -> {
                // 火球：火焰形状（三层圆）
                paint.color = 0xFFFF6F00.toInt()
                canvas.drawCircle(cx, cy, r * 0.55f, paint)
                paint.color = 0xFFFFEB3B.toInt()
                canvas.drawCircle(cx, cy - r * 0.1f, r * 0.3f, paint)
            }
            is LightningSkill -> {
                // 闪电：锯齿线
                paint.strokeWidth = 4f
                val pts = floatArrayOf(cx, cy - r * 0.6f, cx - r * 0.2f, cy - r * 0.1f,
                    cx + r * 0.2f, cy - r * 0.1f, cx - r * 0.15f, cy + r * 0.5f)
                canvas.drawLines(pts, paint)
                paint.strokeWidth = 1f
            }
            is AuraSkill -> {
                // 光环：三个同心圆
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 3f
                canvas.drawCircle(cx, cy, r * 0.3f, paint)
                canvas.drawCircle(cx, cy, r * 0.5f, paint)
                canvas.drawCircle(cx, cy, r * 0.7f, paint)
                paint.style = Paint.Style.FILL
            }
            is MissileSkill -> {
                // 导弹：三角形+尾焰
                val path = android.graphics.Path()
                path.moveTo(cx, cy - r * 0.6f)
                path.lineTo(cx - r * 0.3f, cy + r * 0.4f)
                path.lineTo(cx + r * 0.3f, cy + r * 0.4f)
                path.close()
                canvas.drawPath(path, paint)
                paint.color = 0xFFFF6F00.toInt()
                canvas.drawCircle(cx, cy + r * 0.55f, r * 0.15f, paint)
            }
            is IceSpikeSkill -> {
                // 冰锥：菱形
                val path = android.graphics.Path()
                path.moveTo(cx, cy - r * 0.6f)
                path.lineTo(cx - r * 0.35f, cy)
                path.lineTo(cx, cy + r * 0.6f)
                path.lineTo(cx + r * 0.35f, cy)
                path.close()
                canvas.drawPath(path, paint)
            }
            is WhirlwindSkill -> {
                // 旋风：螺旋线
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 3f
                for (i in 0 until 3) {
                    val startAngle = world.gameTime * 3 + i * 2.094
                    val path = android.graphics.Path()
                    path.moveTo(cx + cos(startAngle.toFloat()) * r * 0.2f, cy + sin(startAngle.toFloat()) * r * 0.2f)
                    path.quadTo(cx + cos((startAngle + 1.5).toFloat()) * r * 0.5f,
                        cy + sin((startAngle + 1.5).toFloat()) * r * 0.5f,
                        cx + cos((startAngle + 3).toFloat()) * r * 0.7f,
                        cy + sin((startAngle + 3).toFloat()) * r * 0.7f)
                    canvas.drawPath(path, paint)
                }
                paint.style = Paint.Style.FILL
            }
            else -> {
                canvas.drawCircle(cx, cy, r * 0.3f, paint)
            }
        }
        paint.alpha = 255
    }

    private fun darkerColor(color: Int): Int {
        val r = (color shr 16 and 0xFF) * 0.6f
        val g = (color shr 8 and 0xFF) * 0.6f
        val b = (color and 0xFF) * 0.6f
        return 0xFF000000.toInt() or (r.toInt() shl 16) or (g.toInt() shl 8) or b.toInt()
    }

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

        // 刷新按钮
        val btnW = w * 0.25f
        val btnH = h * 0.05f
        val btnX = w / 2f - btnW / 2f
        val btnY = h * 0.15f
        val canReroll = world.rerollCount < world.maxReroll
        paint.color = if (canReroll) 0xFF1976D2.toInt() else 0xFF424242.toInt()
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 12f, 12f, paint)
        paint.color = 0xFF64B5F6.toInt()
        paint.strokeWidth = 2f
        paint.style = Paint.Style.STROKE
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 12f, 12f, paint)
        paint.style = Paint.Style.FILL
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.022f
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("刷新 (${world.maxReroll - world.rerollCount}/${world.maxReroll})", w / 2f, btnY + btnH * 0.65f, textPaint)

        val cardW = (w - w * 0.08f) / 3f - w * 0.02f
        val cardH = h * 0.32f
        val cardY = (h - cardH) / 2f
        val totalW = cardW * 3 + w * 0.04f
        var cardX = (w - totalW) / 2f + w * 0.01f

        for ((index, option) in world.levelUpOptions.withIndex()) {
            val rect = RectF(cardX, cardY, cardX + cardW, cardY + cardH)
            // 根据选项类型选择渐变颜色
            val (cardColor1, cardColor2, borderColor) = when (option) {
                is Skill -> Triple(0xFF1A237E.toInt(), 0xFF0D47A1.toInt(), 0xFF536DFE.toInt())
                is StatUpgrade -> Triple(option.color, darkerColor(option.color), 0xFFFFFFFF.toInt())
                else -> Triple(0xFF1B5E20.toInt(), 0xFF1B5E20.toInt(), 0xFF4CAF50.toInt())
            }
            // 渐变背景
            val cardGrad = android.graphics.LinearGradient(cardX, cardY, cardX, cardY + cardH,
                cardColor1, cardColor2, android.graphics.Shader.TileMode.CLAMP)
            paint.shader = cardGrad
            canvas.drawRoundRect(rect, 16f, 16f, paint)
            paint.shader = null
            // 发光边框
            paint.color = borderColor
            paint.alpha = 150
            paint.strokeWidth = 3f
            paint.style = Paint.Style.STROKE
            canvas.drawRoundRect(rect, 16f, 16f, paint)
            paint.style = Paint.Style.FILL
            paint.alpha = 255

            val iconR = w * 0.065f
            val iconY = cardY + h * 0.07f
            when (option) {
                is Skill -> {
                    drawSkillIcon(canvas, option, cardX + cardW / 2, iconY, iconR)
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
        // 渐变背景
        val bgGradient = android.graphics.LinearGradient(0f, 0f, 0f, h,
            0xFF0D1B2A.toInt(), 0xFF1B2838.toInt(), android.graphics.Shader.TileMode.CLAMP)
        paint.shader = bgGradient
        canvas.drawRect(0f, 0f, w, h, paint)
        paint.shader = null

        // 背景装饰：网格线
        paint.color = 0xFF1A3A4A.toInt()
        paint.alpha = 40
        val gridSize = 80f
        var gx = 0f
        while (gx < w) { canvas.drawLine(gx, 0f, gx, h, paint); gx += gridSize }
        var gy = 0f
        while (gy < h) { canvas.drawLine(0f, gy, w, gy, paint); gy += gridSize }
        paint.alpha = 255

        // 标题发光效果（多层）
        textPaint.textAlign = Paint.Align.CENTER
        textPaint.isFakeBoldText = true
        textPaint.textSize = w * 0.11f
        // 外发光
        textPaint.color = 0xFF00E5FF.toInt()
        textPaint.alpha = 30
        for (i in 8 downTo 1 step 2) {
            canvas.drawText("割草传说", w / 2f + i, h * 0.14f + i, textPaint)
            canvas.drawText("割草传说", w / 2f - i, h * 0.14f - i, textPaint)
        }
        textPaint.alpha = 255
        // 描边
        textPaint.color = 0xFF004D6B.toInt()
        textPaint.strokeWidth = 6f
        textPaint.style = Paint.Style.STROKE
        canvas.drawText("割草传说", w / 2f, h * 0.14f, textPaint)
        textPaint.style = Paint.Style.FILL
        // 主标题（渐变文字）
        val titleGradient = android.graphics.LinearGradient(0f, h * 0.08f, 0f, h * 0.16f,
            0xFF00E5FF.toInt(), 0xFF7C4DFF.toInt(), android.graphics.Shader.TileMode.CLAMP)
        textPaint.shader = titleGradient
        canvas.drawText("割草传说", w / 2f, h * 0.14f, textPaint)
        textPaint.shader = null
        textPaint.isFakeBoldText = false

        // 金币显示（带图标）
        textPaint.color = 0xFFFFD700.toInt()
        textPaint.textSize = h * 0.025f
        canvas.drawText("◆ 金币: ${Settings.coins} ◆", w / 2f, h * 0.19f, textPaint)

        // 开始游戏（大按钮，渐变+发光边框）
        val btnW = w * 0.7f
        val btnH = h * 0.075f
        val btnX = (w - btnW) / 2
        var btnY = h * 0.24f
        // 按钮渐变
        val startGradient = android.graphics.LinearGradient(btnX, btnY, btnX, btnY + btnH,
            0xFF00E676.toInt(), 0xFF00C853.toInt(), android.graphics.Shader.TileMode.CLAMP)
        paint.shader = startGradient
        canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 16f, 16f, paint)
        paint.shader = null
        // 发光边框
        paint.color = 0xFF69F0AE.toInt()
        paint.strokeWidth = 3f
        paint.style = Paint.Style.STROKE
        canvas.drawRoundRect(RectF(btnX + 2, btnY + 2, btnX + btnW - 2, btnY + btnH - 2), 14f, 14f, paint)
        paint.style = Paint.Style.FILL
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.032f
        textPaint.isFakeBoldText = true
        canvas.drawText("▶ 开始游戏 ◀", w / 2f, btnY + btnH * 0.65f, textPaint)

        // 网格按钮（2列，渐变+边框）
        val gridBtnW = (w - w * 0.12f) / 2f
        val gridBtnH = h * 0.065f
        val gap = h * 0.015f
        val menuItems = listOf(
            Triple("关卡选择", 0xFF1976D2.toInt(), 0xFF0D47A1.toInt()),
            Triple("永久强化", 0xFFF57F17.toInt(), 0xFFE65100.toInt()),
            Triple("角色选择", 0xFF7B1FA2.toInt(), 0xFF4A148C.toInt()),
            Triple("装备选择", 0xFF00796B.toInt(), 0xFF004D40.toInt()),
            Triple("怪物图鉴", 0xFFC62828.toInt(), 0xFFB71C1C.toInt()),
            Triple("武器图鉴", 0xFFEF6C00.toInt(), 0xFFE65100.toInt()),
            Triple("技能图鉴", 0xFF2E7D32.toInt(), 0xFF1B5E20.toInt()),
            Triple("设置", 0xFF455A64.toInt(), 0xFF263238.toInt())
        )
        textPaint.isFakeBoldText = false
        textPaint.textSize = h * 0.024f
        btnY = h * 0.34f
        for ((index, item) in menuItems.withIndex()) {
            val col = index % 2
            val row = index / 2
            val gx = (w - gridBtnW * 2 - gap) / 2 + col * (gridBtnW + gap)
            val gy = btnY + row * (gridBtnH + gap)
            // 渐变按钮
            val btnGrad = android.graphics.LinearGradient(gx, gy, gx, gy + gridBtnH,
                item.second, item.third, android.graphics.Shader.TileMode.CLAMP)
            paint.shader = btnGrad
            canvas.drawRoundRect(RectF(gx, gy, gx + gridBtnW, gy + gridBtnH), 12f, 12f, paint)
            paint.shader = null
            // 边框
            paint.color = item.second
            paint.alpha = 120
            paint.strokeWidth = 2f
            paint.style = Paint.Style.STROKE
            canvas.drawRoundRect(RectF(gx + 1, gy + 1, gx + gridBtnW - 1, gy + gridBtnH - 1), 11f, 11f, paint)
            paint.style = Paint.Style.FILL
            paint.alpha = 255
            textPaint.color = Color.WHITE
            canvas.drawText(item.first, gx + gridBtnW / 2, gy + gridBtnH * 0.65f, textPaint)
        }
    }

    // ============ 通用子页面头部 ============
    private fun drawSubPageHeader(canvas: Canvas, title: String): Float {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        paint.color = 0xFF0D0D1A.toInt()
        canvas.drawRect(0f, 0f, w, h, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = w * 0.08f
        textPaint.isFakeBoldText = true
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText(title, w / 2f, h * 0.09f, textPaint)
        textPaint.isFakeBoldText = false
        // 返回按钮
        val backW = w * 0.18f; val backH = h * 0.05f
        paint.color = 0xFF546E7A.toInt()
        canvas.drawRoundRect(RectF(w * 0.03f, h * 0.03f, w * 0.03f + backW, h * 0.03f + backH), 8f, 8f, paint)
        textPaint.color = Color.WHITE
        textPaint.textSize = h * 0.022f
        canvas.drawText("返回", w * 0.03f + backW / 2, h * 0.03f + backH * 0.65f, textPaint)
        return h * 0.14f  // 返回内容起始Y
    }

    // ============ 关卡选择 ============
    private fun drawLevelSelect(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "关卡选择")
        val cardW = w * 0.85f; val cardH = h * 0.12f; val gap = h * 0.015f
        for ((i, lvl) in GameConfig.LEVELS.withIndex()) {
            val cy = startY + i * (cardH + gap)
            val cx = (w - cardW) / 2
            val selected = GameConfig.currentLevel.id == lvl.id
            paint.color = if (selected) lvl.themeColor else 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 12f, 12f, paint)
            if (selected) {
                paint.color = 0xFFFFD700.toInt()
                paint.strokeWidth = 3f; paint.style = Paint.Style.STROKE
                canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 12f, 12f, paint)
                paint.style = Paint.Style.FILL
            }
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.028f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText("${lvl.id}. ${lvl.name}", cx + w * 0.03f, cy + cardH * 0.4f, textPaint)
            textPaint.textSize = h * 0.018f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText("血量×${lvl.enemyHpMult} 伤害×${lvl.enemyDmgMult} 奖励${lvl.rewardCoins}金币", cx + w * 0.03f, cy + cardH * 0.75f, textPaint)
        }
    }

    // ============ 永久强化 ============
    private fun drawMetaUpgrade(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "永久强化")
        textPaint.color = 0xFFFFD700.toInt()
        textPaint.textSize = h * 0.025f
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("金币: ${Settings.coins}", w / 2f, startY + h * 0.02f, textPaint)
        val upgrades = listOf(
            Quad("攻击力", "每级+2攻击", Settings.metaAtk, "atk"),
            Quad("最大生命", "每级+10生命", Settings.metaHp, "hp"),
            Quad("攻击速度", "每级+0.05攻速", Settings.metaAtkSpd, "atkspd"),
            Quad("移动速度", "每级+15移速", Settings.metaMovSpd, "movspd"),
            Quad("拾取范围", "每级+20拾取", Settings.metaPickup, "pickup"),
            Quad("暴击率", "每级+2%暴击", Settings.metaCrit, "crit")
        )
        val cardW = w * 0.9f; val cardH = h * 0.09f; val gap = h * 0.012f
        for ((i, up) in upgrades.withIndex()) {
            val cy = startY + h * 0.05f + i * (cardH + gap)
            val cx = (w - cardW) / 2
            paint.color = 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 10f, 10f, paint)
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.024f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText("${up.first} Lv.${up.third}", cx + w * 0.03f, cy + cardH * 0.45f, textPaint)
            textPaint.textSize = h * 0.016f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText(up.second, cx + w * 0.03f, cy + cardH * 0.78f, textPaint)
            // 升级按钮
            val btnW = w * 0.22f; val btnH = cardH * 0.6f
            val btnX = cx + cardW - btnW - w * 0.02f
            val btnY = cy + (cardH - btnH) / 2
            val cost = Settings.metaUpgradeCost(up.fourth)
            val canAfford = Settings.coins >= cost
            paint.color = if (canAfford) 0xFFF57F17.toInt() else 0xFF424242.toInt()
            canvas.drawRoundRect(RectF(btnX, btnY, btnX + btnW, btnY + btnH), 8f, 8f, paint)
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.018f
            textPaint.textAlign = Paint.Align.CENTER
            canvas.drawText("升级 $cost", btnX + btnW / 2, btnY + btnH * 0.65f, textPaint)
        }
    }

    // ============ 角色选择（框架） ============
    private fun drawCharacters(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "角色选择")
        val characters = listOf(
            Triple("赛博忍者", "均衡型", "cyber_ninja"),
            Triple("机甲战士", "高生命低速度", "mecha"),
            Triple("暗影刺客", "高暴击低生命", "assassin")
        )
        val cardW = w * 0.85f; val cardH = h * 0.14f; val gap = h * 0.02f
        for ((i, ch) in characters.withIndex()) {
            val cy = startY + h * 0.02f + i * (cardH + gap)
            val cx = (w - cardW) / 2
            val selected = Settings.selectedCharacter == ch.third
            paint.color = if (selected) 0xFF7B1FA2.toInt() else 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 12f, 12f, paint)
            if (selected) {
                paint.color = 0xFFFFD700.toInt()
                paint.strokeWidth = 3f; paint.style = Paint.Style.STROKE
                canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 12f, 12f, paint)
                paint.style = Paint.Style.FILL
            }
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.03f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(ch.first, cx + w * 0.04f, cy + cardH * 0.4f, textPaint)
            textPaint.textSize = h * 0.02f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText(ch.second, cx + w * 0.04f, cy + cardH * 0.7f, textPaint)
        }
        textPaint.color = 0xFF9E9E9E.toInt()
        textPaint.textSize = h * 0.018f
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("（角色属性差异待实装，当前仅作选择框架）", w / 2f, h * 0.92f, textPaint)
    }

    // ============ 装备选择（框架） ============
    private fun drawEquipment(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "装备选择")
        val equipments = listOf(
            Triple("无", "无加成", "none"),
            Triple("能量核心", "攻击力+10%", "energy_core"),
            Triple("生命护符", "最大生命+20%", "life_amulet"),
            Triple("疾风之靴", "移动速度+15%", "wind_boots")
        )
        val cardW = w * 0.85f; val cardH = h * 0.12f; val gap = h * 0.018f
        for ((i, eq) in equipments.withIndex()) {
            val cy = startY + h * 0.02f + i * (cardH + gap)
            val cx = (w - cardW) / 2
            val selected = Settings.selectedLoadout == eq.third
            paint.color = if (selected) 0xFF00796B.toInt() else 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 12f, 12f, paint)
            if (selected) {
                paint.color = 0xFFFFD700.toInt()
                paint.strokeWidth = 3f; paint.style = Paint.Style.STROKE
                canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 12f, 12f, paint)
                paint.style = Paint.Style.FILL
            }
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.028f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(eq.first, cx + w * 0.04f, cy + cardH * 0.45f, textPaint)
            textPaint.textSize = h * 0.02f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText(eq.second, cx + w * 0.04f, cy + cardH * 0.75f, textPaint)
        }
        textPaint.color = 0xFF9E9E9E.toInt()
        textPaint.textSize = h * 0.018f
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("（装备属性加成待实装，当前仅作选择框架）", w / 2f, h * 0.92f, textPaint)
    }

    // ============ 怪物图鉴 ============
    private fun drawBestiary(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "怪物图鉴")
        val monsters = listOf(
            Triple("普通怪", "基础敌人，速度中等", EnemyType.NORMAL),
            Triple("快速怪", "移动速度快，血量低", EnemyType.FAST),
            Triple("坦克怪", "血量高，移动慢", EnemyType.TANK),
            Triple("精英怪", "综合属性强，掉大量经验", EnemyType.ELITE),
            Triple("Boss", "最终Boss，超高血量", EnemyType.BOSS)
        )
        val cardW = w * 0.9f; val cardH = h * 0.13f; val gap = h * 0.015f
        for ((i, m) in monsters.withIndex()) {
            val cy = startY + h * 0.02f + i * (cardH + gap)
            val cx = (w - cardW) / 2
            paint.color = 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 10f, 10f, paint)
            // 怪物sprite
            val sheet = when (m.third) {
                EnemyType.NORMAL -> enemyNormalSheetBmp
                EnemyType.FAST -> enemyFastSheetBmp
                EnemyType.TANK -> enemyTankSheetBmp
                EnemyType.ELITE -> enemyEliteSheetBmp
                EnemyType.BOSS -> enemyBossSheetBmp
            }
            val spriteSize = cardH * 0.7f
            drawCharacter(canvas, sheet, cx + w * 0.08f, cy + cardH / 2, spriteSize / 2, 0, true, 255)
            textPaint.color = Color.WHITE
            textPaint.textSize = h * 0.026f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(m.first, cx + w * 0.18f, cy + cardH * 0.4f, textPaint)
            textPaint.textSize = h * 0.018f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText(m.second, cx + w * 0.18f, cy + cardH * 0.72f, textPaint)
        }
    }

    // ============ 武器图鉴 ============
    private fun drawWeapons(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "武器图鉴")
        val weapons = listOf(
            Quad("能量弹", "基础攻击，自动发射", "三联能量炮", BasicAttackSkill()),
            Quad("飞刀", "环绕+扇形穿透", "万剑归宗", KnifeSkill()),
            Quad("火球", "范围爆炸伤害", "陨石雨", FireballSkill()),
            Quad("闪电", "跳跃连锁攻击", "雷神之怒", LightningSkill()),
            Quad("灼烧光环", "持续范围伤害", "太阳风暴", AuraSkill()),
            Quad("追踪导弹", "自动追踪+小爆炸", "全屏导弹雨", MissileSkill()),
            Quad("冰锥术", "命中减速敌人", "绝对零度", IceSpikeSkill()),
            Quad("旋风斩", "环绕风刃持续伤害", "风暴领主", WhirlwindSkill())
        )
        val cardW = w * 0.92f; val cardH = h * 0.09f; val gap = h * 0.01f
        for ((i, wp) in weapons.withIndex()) {
            val cy = startY + h * 0.015f + i * (cardH + gap)
            val cx = (w - cardW) / 2
            paint.color = 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 8f, 8f, paint)
            // 技能图标
            drawSkillIcon(canvas, wp.fourth, cx + w * 0.06f, cy + cardH / 2, cardH * 0.35f)
            textPaint.color = 0xFF4FC3F7.toInt()
            textPaint.textSize = h * 0.022f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(wp.first, cx + w * 0.13f, cy + cardH * 0.42f, textPaint)
            textPaint.textSize = h * 0.016f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText(wp.second, cx + w * 0.13f, cy + cardH * 0.75f, textPaint)
            textPaint.color = 0xFFFFD700.toInt()
            textPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText("超武: ${wp.third}", cx + cardW - w * 0.025f, cy + cardH * 0.55f, textPaint)
        }
    }

    // ============ 技能图鉴 ============
    private fun drawSkillsInfo(canvas: Canvas) {
        val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
        val startY = drawSubPageHeader(canvas, "技能图鉴")
        val skills = listOf(
            Quad("攻击力", "攻击力+5", "可叠加", 0xFFEF5350.toInt()),
            Quad("攻击速度", "攻击速度+0.2", "可叠加", 0xFFFFAB40.toInt()),
            Quad("移动速度", "移动速度+30", "可叠加", 0xFF4FC3F7.toInt()),
            Quad("最大生命", "最大生命+20并回满", "可叠加", 0xFF66BB6A.toInt()),
            Quad("拾取范围", "拾取范围+40", "可叠加", 0xFF00E676.toInt()),
            Quad("暴击率", "暴击率+5%", "可叠加", 0xFFAB47BC.toInt()),
            Quad("暴击伤害", "暴击伤害+30%", "可叠加", 0xFFFF7043.toInt()),
            Quad("生命恢复", "每秒恢复2生命", "可叠加", 0xFF81C784.toInt())
        )
        val cardW = w * 0.92f; val cardH = h * 0.085f; val gap = h * 0.012f
        for ((i, sk) in skills.withIndex()) {
            val cy = startY + h * 0.02f + i * (cardH + gap)
            val cx = (w - cardW) / 2
            paint.color = 0xFF1A1A2E.toInt()
            canvas.drawRoundRect(RectF(cx, cy, cx + cardW, cy + cardH), 8f, 8f, paint)
            // 彩色图标
            val iconR = cardH * 0.3f
            val iconGrad = android.graphics.RadialGradient(cx + w * 0.06f, cy + cardH / 2, iconR,
                sk.fourth, darkerColor(sk.fourth), android.graphics.Shader.TileMode.CLAMP)
            paint.shader = iconGrad
            canvas.drawCircle(cx + w * 0.06f, cy + cardH / 2, iconR, paint)
            paint.shader = null
            textPaint.color = 0xFF69F0AE.toInt()
            textPaint.textSize = h * 0.022f
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(sk.first, cx + w * 0.13f, cy + cardH * 0.45f, textPaint)
            textPaint.textSize = h * 0.017f
            textPaint.color = 0xFFBDBDBD.toInt()
            canvas.drawText(sk.second, cx + w * 0.13f, cy + cardH * 0.78f, textPaint)
            textPaint.color = 0xFF9E9E9E.toInt()
            textPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText(sk.third, cx + cardW - w * 0.025f, cy + cardH * 0.55f, textPaint)
        }
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
        val pickupText = when {
            Settings.pickupVolume <= 0.01f -> "关"
            Settings.pickupVolume < 0.2f -> "低"
            Settings.pickupVolume < 0.4f -> "中"
            else -> "高"
        }
        val joyText = when {
            Settings.joystickSize < 0.9f -> "小"
            Settings.joystickSize < 1.15f -> "中"
            else -> "大"
        }
        val items = listOf(
            Triple("音效", if (Settings.soundEnabled) "开" else "关", "sound"),
            Triple("主音量", volText, "volume"),
            Triple("拾取音量", pickupText, "pickup"),
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
        val keys = listOf("sound", "volume", "pickup", "particles", "damage", "shake", "joystick")

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
                        if (Settings.soundEnabled) playSound("shoot")
                    }
                    "pickup" -> {
                        val next = when {
                            Settings.pickupVolume <= 0.01f -> 0.15f
                            Settings.pickupVolume < 0.2f -> 0.3f
                            Settings.pickupVolume < 0.4f -> 0.5f
                            else -> 0f
                        }
                        Settings.setPickupVolume(next)
                        if (Settings.soundEnabled && next > 0) playSound("pickup")
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
                        // 开始游戏
                        val btnW = w * 0.7f; val btnH = h * 0.075f
                        val btnX = (w - btnW) / 2; val btnY = h * 0.24f
                        if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                            world.startGame()
                        }
                        // 网格按钮
                        val gridBtnW = (w - w * 0.12f) / 2f
                        val gridBtnH = h * 0.065f; val gap = h * 0.015f
                        val gridStartY = h * 0.34f
                        val menuStates = listOf(
                            GameState.LEVEL_SELECT, GameState.META_UPGRADE,
                            GameState.CHARACTERS, GameState.EQUIPMENT,
                            GameState.BESTIARY, GameState.WEAPONS,
                            GameState.SKILLS_INFO, GameState.MENU  // 设置用inSettings
                        )
                        for (i in 0 until 8) {
                            val col = i % 2; val row = i / 2
                            val gx = (w - gridBtnW * 2 - gap) / 2 + col * (gridBtnW + gap)
                            val gy = gridStartY + row * (gridBtnH + gap)
                            if (x in gx..(gx + gridBtnW) && y in gy..(gy + gridBtnH)) {
                                if (i == 7) { inSettings = true }  // 设置
                                else { world.state = menuStates[i] }
                                break
                            }
                        }
                    }
                }
            }
            // 子页面通用触摸处理
            GameState.LEVEL_SELECT, GameState.META_UPGRADE, GameState.CHARACTERS,
            GameState.EQUIPMENT, GameState.BESTIARY, GameState.WEAPONS, GameState.SKILLS_INFO -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                    // 返回按钮
                    val backW = w * 0.18f; val backH = h * 0.05f
                    if (x in (w * 0.03f)..(w * 0.03f + backW) && y in (h * 0.03f)..(h * 0.03f + backH)) {
                        world.state = GameState.MENU
                        return true
                    }
                    // 关卡选择：点击关卡
                    if (world.state == GameState.LEVEL_SELECT) {
                        val startY = h * 0.14f
                        val cardW = w * 0.85f; val cardH = h * 0.12f; val gap = h * 0.015f
                        for ((i, lvl) in GameConfig.LEVELS.withIndex()) {
                            val cy = startY + i * (cardH + gap)
                            val cx = (w - cardW) / 2
                            if (x in cx..(cx + cardW) && y in cy..(cy + cardH)) {
                                GameConfig.currentLevel = lvl
                                playSound("levelup")
                                break
                            }
                        }
                    }
                    // 永久强化：点击升级按钮
                    if (world.state == GameState.META_UPGRADE) {
                        val startY = h * 0.14f + h * 0.05f
                        val cardW = w * 0.9f; val cardH = h * 0.09f; val gap = h * 0.012f
                        val types = listOf("atk", "hp", "atkspd", "movspd", "pickup", "crit")
                        for ((i, type) in types.withIndex()) {
                            val cy = startY + i * (cardH + gap)
                            val cx = (w - cardW) / 2
                            val btnW = w * 0.22f; val btnH = cardH * 0.6f
                            val btnX = cx + cardW - btnW - w * 0.02f
                            val btnY = cy + (cardH - btnH) / 2
                            if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                                if (Settings.upgradeMeta(type)) playSound("levelup")
                                break
                            }
                        }
                    }
                    // 角色选择
                    if (world.state == GameState.CHARACTERS) {
                        val startY = h * 0.14f + h * 0.02f
                        val cardW = w * 0.85f; val cardH = h * 0.14f; val gap = h * 0.02f
                        val chars = listOf("cyber_ninja", "mecha", "assassin")
                        for ((i, ch) in chars.withIndex()) {
                            val cy = startY + i * (cardH + gap)
                            val cx = (w - cardW) / 2
                            if (x in cx..(cx + cardW) && y in cy..(cy + cardH)) {
                                Settings.selectCharacter(ch)
                                playSound("levelup")
                                break
                            }
                        }
                    }
                    // 装备选择
                    if (world.state == GameState.EQUIPMENT) {
                        val startY = h * 0.14f + h * 0.02f
                        val cardW = w * 0.85f; val cardH = h * 0.12f; val gap = h * 0.018f
                        val eqs = listOf("none", "energy_core", "life_amulet", "wind_boots")
                        for ((i, eq) in eqs.withIndex()) {
                            val cy = startY + i * (cardH + gap)
                            val cx = (w - cardW) / 2
                            if (x in cx..(cx + cardW) && y in cy..(cy + cardH)) {
                                Settings.selectLoadout(eq)
                                playSound("levelup")
                                break
                            }
                        }
                    }
                }
            }
            GameState.LEVEL_UP -> {
                if (action == MotionEvent.ACTION_DOWN) {
                    val w = canvasWidth.toFloat(); val h = canvasHeight.toFloat()
                    // 刷新按钮点击
                    val btnW = w * 0.25f
                    val btnH = h * 0.05f
                    val btnX = w / 2f - btnW / 2f
                    val btnY = h * 0.15f
                    if (x in btnX..(btnX + btnW) && y in btnY..(btnY + btnH)) {
                        world.rerollOptions()
                        return true
                    }
                    // 升级卡片点击
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
