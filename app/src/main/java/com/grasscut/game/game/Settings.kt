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

    // 永久升级 key
    private const val KEY_COINS = "coins"
    private const val KEY_META_ATK = "meta_atk"
    private const val KEY_META_HP = "meta_hp"
    private const val KEY_META_ATKSPD = "meta_atkspd"
    private const val KEY_META_MOVSPD = "meta_movspd"
    private const val KEY_META_PICKUP = "meta_pickup"
    private const val KEY_META_CRIT = "meta_crit"
    private const val KEY_SELECTED_CHARACTER = "selected_character"
    private const val KEY_SELECTED_LOADOUT = "selected_loadout"

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

    // 永久升级（局外成长）
    var coins: Int = 0
        private set
    var metaAtk: Int = 0      // 每级+2攻击
        private set
    var metaHp: Int = 0       // 每级+10生命
        private set
    var metaAtkSpd: Int = 0   // 每级+0.05攻速
        private set
    var metaMovSpd: Int = 0   // 每级+15移速
        private set
    var metaPickup: Int = 0   // 每级+20拾取
        private set
    var metaCrit: Int = 0     // 每级+2%暴击
        private set
    var selectedCharacter: String = "cyber_ninja"
        private set
    var selectedLoadout: String = "none"
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
        // 永久升级
        coins = prefs.getInt(KEY_COINS, 0)
        metaAtk = prefs.getInt(KEY_META_ATK, 0)
        metaHp = prefs.getInt(KEY_META_HP, 0)
        metaAtkSpd = prefs.getInt(KEY_META_ATKSPD, 0)
        metaMovSpd = prefs.getInt(KEY_META_MOVSPD, 0)
        metaPickup = prefs.getInt(KEY_META_PICKUP, 0)
        metaCrit = prefs.getInt(KEY_META_CRIT, 0)
        selectedCharacter = prefs.getString(KEY_SELECTED_CHARACTER, "cyber_ninja") ?: "cyber_ninja"
        selectedLoadout = prefs.getString(KEY_SELECTED_LOADOUT, "none") ?: "none"
    }

    fun setSoundEnabled(v: Boolean) { soundEnabled = v; prefs.edit().putBoolean(KEY_SOUND_ENABLED, v).apply() }
    fun setSoundVolume(v: Float) { soundVolume = v; prefs.edit().putFloat(KEY_SOUND_VOLUME, v).apply() }
    fun setPickupVolume(v: Float) { pickupVolume = v; prefs.edit().putFloat(KEY_PICKUP_VOLUME, v).apply() }
    fun setParticlesEnabled(v: Boolean) { particlesEnabled = v; prefs.edit().putBoolean(KEY_PARTICLES_ENABLED, v).apply() }
    fun setDamageNumbers(v: Boolean) { damageNumbers = v; prefs.edit().putBoolean(KEY_DAMAGE_NUMBERS, v).apply() }
    fun setScreenShake(v: Boolean) { screenShake = v; prefs.edit().putBoolean(KEY_SCREEN_SHAKE, v).apply() }
    fun setJoystickSize(v: Float) { joystickSize = v; prefs.edit().putFloat(KEY_JOYSTICK_SIZE, v).apply() }

    // 永久升级方法
    fun addCoins(amount: Int) { coins += amount; prefs.edit().putInt(KEY_COINS, coins).apply() }
    fun spendCoins(amount: Int): Boolean {
        if (coins >= amount) { coins -= amount; prefs.edit().putInt(KEY_COINS, coins).apply(); return true }
        return false
    }
    fun upgradeMeta(type: String): Boolean {
        val cost = metaUpgradeCost(type)
        if (!spendCoins(cost)) return false
        when (type) {
            "atk" -> { metaAtk++; prefs.edit().putInt(KEY_META_ATK, metaAtk).apply() }
            "hp" -> { metaHp++; prefs.edit().putInt(KEY_META_HP, metaHp).apply() }
            "atkspd" -> { metaAtkSpd++; prefs.edit().putInt(KEY_META_ATKSPD, metaAtkSpd).apply() }
            "movspd" -> { metaMovSpd++; prefs.edit().putInt(KEY_META_MOVSPD, metaMovSpd).apply() }
            "pickup" -> { metaPickup++; prefs.edit().putInt(KEY_META_PICKUP, metaPickup).apply() }
            "crit" -> { metaCrit++; prefs.edit().putInt(KEY_META_CRIT, metaCrit).apply() }
        }
        return true
    }
    fun metaUpgradeCost(type: String): Int {
        val level = when (type) {
            "atk" -> metaAtk; "hp" -> metaHp; "atkspd" -> metaAtkSpd
            "movspd" -> metaMovSpd; "pickup" -> metaPickup; "crit" -> metaCrit
            else -> 0
        }
        return 50 + level * 30
    }
    fun selectCharacter(id: String) { selectedCharacter = id; prefs.edit().putString(KEY_SELECTED_CHARACTER, id).apply() }
    fun selectLoadout(id: String) { selectedLoadout = id; prefs.edit().putString(KEY_SELECTED_LOADOUT, id).apply() }
}
