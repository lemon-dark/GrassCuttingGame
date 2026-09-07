# 割草传说 (GrassCuttingGame)

一款 2D 俯视角发育型割草游戏（吸血鬼幸存者类），原生 Android（Kotlin）开发。

## 游戏特性

- **核心玩法**：移动躲避 → 自动攻击 → 拾取经验 → 升级三选一 → 变强割草
- **一局 15 分钟**，5 分钟出 Boss，坚持到最后击败 Boss 胜利
- **5 种技能**：能量弹（基础）、飞刀（穿透）、火球（爆炸）、闪电链（跳跃）、灼烧光环（范围持续伤害）
- **6 种属性升级**：攻击力、攻速、移速、最大生命、拾取范围、暴击率
- **5 种敌人**：普通、快速、坦克、精英（每 60 秒一波）、Boss
- **虚拟摇杆**：全屏跟随手指，支持大小调节
- **设置系统**：音效开关/音量、粒子特效、伤害数字、屏幕震动、摇杆大小，自动持久化

## 技术栈

- **语言**：Kotlin
- **最低 SDK**：API 24 (Android 7.0)
- **目标 SDK**：API 36
- **构建工具**：Gradle + AGP 8.7.3
- **渲染**：SurfaceView + Canvas（纯原生，无游戏引擎依赖）
- **音效**：SoundPool + 程序生成 8-bit WAV
- **贴图**：程序生成径向渐变发光贴图（assets/）

## 项目结构

```
app/src/main/
├── java/com/grasscut/game/
│   ├── MainActivity.kt          # 入口 Activity
│   └── game/
│       ├── GameConfig.kt        # 常量配置（地图、属性、颜色、经验曲线）
│       ├── Entities.kt          # 实体类（玩家、敌人、子弹、经验宝石、粒子、空间分区）
│       ├── Skills.kt            # 技能系统（5 种技能 + 属性升级）
│       ├── GameWorld.kt         # 游戏世界（状态机、碰撞、波次、升级选项）
│       ├── GameView.kt          # 渲染与输入（SurfaceView、相机、HUD、设置界面）
│       └── Settings.kt          # 设置持久化（SharedPreferences）
├── assets/                      # 发光贴图（程序生成）
├── res/
│   ├── raw/                     # 音效 WAV 文件
│   ├── mipmap-*/               # 启动图标
│   ├── drawable/                # 图标前景
│   ├── layout/                  # 布局
│   └── values/                  # 字符串、主题、颜色
└── AndroidManifest.xml
```

## 构建

```bash
# 设置环境变量
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk

# 构建 Debug APK
./gradlew assembleDebug

# 输出位置
app/build/outputs/apk/debug/app-debug.apk
```

## 游戏操作

- **移动**：触摸屏幕任意位置，虚拟摇杆跟随手指，拖动控制方向
- **攻击**：全自动，无需操作
- **升级**：升级时弹出三选一界面，点击选择技能或属性
- **设置**：主菜单点击"设置"按钮调节各项选项

## 开发说明

- 所有游戏逻辑在 `GameWorld.kt` 中，渲染在 `GameView.kt` 中，二者通过 `world` 对象通信
- 音效事件通过 `world.soundEvents` 队列从 GameWorld 传递到 GameView 的 SoundPool 播放
- 设置通过 `Settings` 单例 + SharedPreferences 持久化，GameView 在渲染和输入时读取
- 敌人生成和增强速度在 `GameWorld.spawnEnemies()` 和 `Entities.kt` 的 `Enemy` 构造函数中调节
- 经验曲线在 `GameConfig.xpToNext()` 中定义

## License

MIT
