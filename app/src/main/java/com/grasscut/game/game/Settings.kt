package com.grasscut.game.game

import android.content.Context
import android.content.SharedPreferences

/**
 * 游戏设置 —— 用 SharedPreferences 持久化
 */
object Settings {
    private const val PREF_NAME = "grasscut_settings"

    // 设置项 key
    private const val KEY_SOUND_ENABLED = "sound_enabled"
    private const val KEY_SOUND_VOLUME = "sound_volume"
    private const val KEY_PICKUP_VOLUME = "pickup_volume"
    private const val KEY_PARTICLES_ENABLED = "particles_enabled"
    private const val KEY_DAMAGE_NUMBERS = "damage_numbers"
    private const val KEY_SCREEN_SHAKE = "screen_shake"
    private const val KEY_JOYSTICK_SIZE = "joystick_size"

    // 当前值
    var soundEnabled: Boolean = true
        private set
    var soundVolume: Float = 0.6f
        private set
    var pickupVolume: Float = 0.3f
        private set
    var particlesEnabled: Boolean = true
        private set
    var damageNumbers: Boolean = true
        private set
    var screenShake: Boolean = true
        private set
    var joystickSize: Float = 1.0f
        private set

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        soundEnabled = prefs.getBoolean(KEY_SOUND_ENABLED, true)
        soundVolume = prefs.getFloat(KEY_SOUND_VOLUME, 0.6f)
        pickupVolume = prefs.getFloat(KEY_PICKUP_VOLUME, 0.3f)
        particlesEnabled = prefs.getBoolean(KEY_PARTICLES_ENABLED, true)
        damageNumbers = prefs.getBoolean(KEY_DAMAGE_NUMBERS, true)
        screenShake = prefs.getBoolean(KEY_SCREEN_SHAKE, true)
        joystickSize = prefs.getFloat(KEY_JOYSTICK_SIZE, 1.0f)
    }

    fun setSoundEnabled(v: Boolean) { soundEnabled = v; prefs.edit().putBoolean(KEY_SOUND_ENABLED, v).apply() }
    fun setSoundVolume(v: Float) { soundVolume = v; prefs.edit().putFloat(KEY_SOUND_VOLUME, v).apply() }
    fun setPickupVolume(v: Float) { pickupVolume = v; prefs.edit().putFloat(KEY_PICKUP_VOLUME, v).apply() }
    fun setParticlesEnabled(v: Boolean) { particlesEnabled = v; prefs.edit().putBoolean(KEY_PARTICLES_ENABLED, v).apply() }
    fun setDamageNumbers(v: Boolean) { damageNumbers = v; prefs.edit().putBoolean(KEY_DAMAGE_NUMBERS, v).apply() }
    fun setScreenShake(v: Boolean) { screenShake = v; prefs.edit().putBoolean(KEY_SCREEN_SHAKE, v).apply() }
    fun setJoystickSize(v: Float) { joystickSize = v; prefs.edit().putFloat(KEY_JOYSTICK_SIZE, v).apply() }
}
