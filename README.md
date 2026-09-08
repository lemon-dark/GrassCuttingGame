# 割草传说 - Phaser版

基于 Phaser 3 引擎开发的 2D 俯视角发育型割草游戏（吸血鬼幸存者类）。

## 快速开始

### 方式1：直接运行 Web 版
1. 解压 `GrassCuttingGame-Phaser-web.zip`
2. 用浏览器打开 `dist/index.html`
3. 左半屏拖动控制移动，自动攻击

### 方式2：开发模式
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 游戏玩法

- **移动**：左半屏虚拟摇杆
- **攻击**：自动攻击最近的敌人
- **升级**：拾取经验宝石，升级后三选一强化
- **目标**：存活 10 分钟获得胜利

## 已实现功能

- ✅ 玩家移动（虚拟摇杆）
- ✅ 自动攻击（能量弹，可穿透）
- ✅ 5种怪物（普通/快速/坦克/精英/Boss）
- ✅ 怪物波次生成（随时间增强）
- ✅ 经验拾取和升级系统
- ✅ 6种升级选项（攻击/攻速/生命/移速/拾取/暴击）
- ✅ 伤害数字（普通/暴击）
- ✅ 命中粒子和死亡粒子
- ✅ 击退效果
- ✅ 血条/经验条/等级/时间/击杀数 HUD
- ✅ 游戏结束和胜利界面
- ✅ 相机跟随和屏幕震动
- ✅ 发光效果（玩家/子弹/经验宝石）

## 技术栈

- **引擎**：Phaser 3（WebGL 渲染）
- **语言**：JavaScript (ES6+)
- **构建工具**：Vite
- **包管理**：npm

## 项目结构

```
GrassCuttingGame-Phaser/
├── index.html              # 入口 HTML
├── vite.config.js          # Vite 配置
├── package.json            # 依赖配置
├── src/
│   ├── main.js             # 游戏入口
│   ├── config/
│   │   └── GameConfig.js   # 游戏配置（数值/怪物/颜色）
│   ├── entities/
│   │   ├── Player.js       # 玩家类
│   │   ├── Enemy.js        # 敌人类
│   │   └── Bullet.js       # 子弹和经验宝石
│   └── scenes/
│       └── GameScene.js    # 游戏主场景
└── dist/                   # 构建输出
    ├── index.html
    └── assets/
        └── index-*.js
```

## 后续开发计划

- [ ] 8种技能系统（飞刀/火球/闪电/光环/导弹/冰锥/旋风）
- [ ] 超武进化系统
- [ ] 技能特效（序列帧贴图+粒子）
- [ ] 角色贴图和动画
- [ ] 怪物贴图和动画
- [ ] 音效和背景音乐
- [ ] 主菜单和设置界面
- [ ] 关卡模式
- [ ] 永久升级系统
- [ ] 用 Capacitor 打包成 Android APK
- [ ] 发布抖音小游戏

## 与原生版（Kotlin+Canvas）的对比

| 方面 | 原生版 | Phaser版 |
|------|--------|---------|
| 渲染 | Canvas 2D 即时模式 | WebGL 保留模式 |
| 特效能力 | 基础（drawCircle/drawLine） | 强（粒子系统+Shader+相机效果） |
| 跨平台 | 仅 Android | Web/Android/iOS/小游戏 |
| 开发效率 | 需手写所有渲染 | 引擎提供大量现成功能 |
| 性能 | 中等（CPU渲染） | 好（GPU加速） |
| 打包难度 | 高（Gradle+Android SDK） | 低（Web直接运行，Capacitor打包APK） |
