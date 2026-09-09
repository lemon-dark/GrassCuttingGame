/**
 * FXManager - 特效管理系统
 * 负责管理所有视觉特效：爆炸、闪电、粒子、屏幕特效、发光层
 * 使用 Phaser WebGL 渲染，通过 ADD 混合模式实现 Bloom 泛光效果
 */

export class FXManager {
    constructor(scene) {
        this.scene = scene;
        this.glowTextureKey = 'fx_glow';
        this.softGlowTextureKey = 'fx_soft_glow';
        this.texturesCreated = false;

        // 画质设置（low/medium/high）
        this.quality = 'high';
        this.glowEnabled = true;        // Bloom 发光（ADD 混合）
        this.particleMultiplier = 1.0;  // 粒子数量倍率
        this.screenEffectsEnabled = true; // 屏幕闪光/红屏
        this.trailsEnabled = true;       // 子弹拖尾

        // 特效对象池
        this.explosions = [];
        this.lightningBolts = [];
        this.particles = [];
        this.trails = [];
        this.screenFlashes = [];
        this.shockwaves = [];

        // 性能限制
        this.maxParticles = 400;
        this.maxExplosions = 30;
        this.maxLightnings = 20;

        // 发光层容器（所有发光对象放在这里，ADD 混合）
        this.glowLayer = null;
        this.effectLayer = null;

        this._init();
    }

    /**
     * 设置画质（low/medium/high）
     */
    setQuality(level) {
        this.quality = level;
        switch (level) {
            case 'low':
                this.glowEnabled = false;
                this.particleMultiplier = 0.4;
                this.screenEffectsEnabled = false;
                this.trailsEnabled = false;
                this.maxParticles = 150;
                break;
            case 'medium':
                this.glowEnabled = false;
                this.particleMultiplier = 0.7;
                this.screenEffectsEnabled = true;
                this.trailsEnabled = true;
                this.maxParticles = 250;
                break;
            case 'high':
            default:
                this.glowEnabled = true;
                this.particleMultiplier = 1.0;
                this.screenEffectsEnabled = true;
                this.trailsEnabled = true;
                this.maxParticles = 400;
                break;
        }
        console.log('FXManager 画质设置为:', level,
            '| 发光:', this.glowEnabled,
            '| 粒子倍率:', this.particleMultiplier,
            '| 屏幕特效:', this.screenEffectsEnabled);
    }

    _init() {
        this._createGlowTextures();
        this._createLayers();
    }

    /**
     * 创建径向渐变发光纹理（用于模拟 Bloom 泛光）
     * 白色核心 → 半透明边缘，配合 ADD 混合模式实现光溢出效果
     */
    _createGlowTextures() {
        if (this.scene.textures.exists(this.glowTextureKey)) {
            this.texturesCreated = true;
            return;
        }

        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 强发光：核心亮，快速衰减
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        this.scene.textures.addImage(this.glowTextureKey, canvas);

        // 柔发光：大范围缓慢衰减（用于 Bloom 溢出）
        const canvas2 = document.createElement('canvas');
        canvas2.width = size;
        canvas2.height = size;
        const ctx2 = canvas2.getContext('2d');
        const gradient2 = ctx2.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient2.addColorStop(0, 'rgba(255,255,255,0.6)');
        gradient2.addColorStop(0.3, 'rgba(255,255,255,0.3)');
        gradient2.addColorStop(0.7, 'rgba(255,255,255,0.1)');
        gradient2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx2.fillStyle = gradient2;
        ctx2.fillRect(0, 0, size, size);
        this.scene.textures.addImage(this.softGlowTextureKey, canvas2);

        this.texturesCreated = true;
    }

    _createLayers() {
        // 特效层（普通特效对象）
        this.effectLayer = this.scene.add.container(0, 0).setDepth(10);
        // 发光层（ADD 混合，模拟 Bloom）
        this.glowLayer = this.scene.add.container(0, 0).setDepth(11);
    }

    /**
     * 创建一个发光精灵（用于 Bloom 效果）
     */
    createGlow(x, y, color, size, alpha = 0.5, soft = false) {
        const texKey = soft ? this.softGlowTextureKey : this.glowTextureKey;
        const img = this.scene.add.image(x, y, texKey)
            .setTint(color)
            .setAlpha(alpha)
            .setDepth(11);
        // 高画质启用 ADD 混合（Bloom 泛光），中低画质用普通混合
        if (this.glowEnabled) {
            img.setBlendMode(Phaser.BlendModes.ADD);
        }
        img.displayWidth = size * 2;
        img.displayHeight = size * 2;
        this.glowLayer.add(img);
        return img;
    }

    // ==================== 爆炸系统 ====================

    /**
     * 触发多层爆炸特效
     * @param {number} x - 中心X
     * @param {number} y - 中心Y
     * @param {number} radius - 爆炸半径
     * @param {number} color - 主颜色 (0xRRGGBB)
     * @param {object} options - 可选配置
     */
    spawnExplosion(x, y, radius, color, options = {}) {
        if (this.explosions.length >= this.maxExplosions) return;

        const {
            particleCount = 25,
            shakeIntensity = 0.008,
            withFlash = true,
            ringCount = 3
        } = options;

        // 根据画质调整粒子数量
        const actualParticleCount = Math.floor(particleCount * this.particleMultiplier);

        // 1. 多层冲击波环
        for (let i = 0; i < ringCount; i++) {
            const ring = this.scene.add.graphics().setDepth(10);
            const ringColor = i === 0 ? 0xFFFFFF : color;
            const ringAlpha = i === 0 ? 0.9 : 0.6 - i * 0.15;
            const ringWidth = i === 0 ? 6 : 4 - i;
            const delay = i * 0.06;
            const life = 0.4 + i * 0.1;
            const maxR = radius * (1 + i * 0.3);

            this.shockwaves.push({
                graphics: ring,
                x, y,
                maxRadius: maxR,
                color: ringColor,
                alpha: ringAlpha,
                lineWidth: ringWidth,
                life: life,
                maxLife: life,
                delay: delay,
                age: 0
            });
        }

        // 2. 核心闪光（大尺寸柔发光，ADD 混合）
        const coreGlow = this.createGlow(x, y, 0xFFFFFF, radius * 1.5, 0.8, true);
        this.scene.tweens.add({
            targets: coreGlow,
            alpha: 0,
            displayWidth: radius * 4,
            displayHeight: radius * 4,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => coreGlow.destroy()
        });

        // 3. 主火球发光
        const fireGlow = this.createGlow(x, y, color, radius, 0.6, true);
        this.scene.tweens.add({
            targets: fireGlow,
            alpha: 0,
            displayWidth: radius * 2.5,
            displayHeight: radius * 2.5,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => fireGlow.destroy()
        });

        // 4. 火花粒子（带拖尾，向外飞散）
        for (let i = 0; i < actualParticleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 300;
            const pColor = Math.random() < 0.4 ? 0xFFFFFF : color;
            const pSize = 3 + Math.random() * 5;
            const pLife = 0.4 + Math.random() * 0.4;

            const img = this.scene.add.image(x, y, this.glowTextureKey)
                .setTint(pColor)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(12)
                .setAlpha(0.9);
            img.displayWidth = pSize * 4;
            img.displayHeight = pSize * 4;

            // 拖尾
            const trailPoints = [];
            const trailGraphics = this.scene.add.graphics().setDepth(11);

            this.particles.push({
                img,
                trailGraphics,
                trailPoints,
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: pColor,
                size: pSize,
                life: pLife,
                maxLife: pLife,
                gravity: 150,
                drag: 0.94,
                hasTrail: true
            });
        }

        // 5. 烟雾粒子（向上飘，缓慢消散）
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            const smokeColor = 0x444444;
            const smokeSize = 15 + Math.random() * 20;

            const img = this.scene.add.image(x, y, this.softGlowTextureKey)
                .setTint(smokeColor)
                .setAlpha(0.4)
                .setDepth(9);
            img.displayWidth = smokeSize * 2;
            img.displayHeight = smokeSize * 2;

            this.particles.push({
                img,
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                color: smokeColor,
                size: smokeSize,
                life: 1.0 + Math.random() * 0.5,
                maxLife: 1.5,
                gravity: -30,
                drag: 0.96,
                grow: true,
                hasTrail: false
            });
        }

        // 6. 屏幕震动
        if (shakeIntensity > 0) {
            this.scene.cameras.main.shake(200, shakeIntensity);
        }

        // 7. 屏幕闪光
        if (withFlash) {
            this.spawnScreenFlash(color, 0.15, 0.3);
        }

        this.explosions.push({ x, y, radius, color, age: 0, life: 0.6 });
    }

    // ==================== 闪电系统 ====================

    /**
     * 触发分支闪电特效
     */
    spawnLightning(x1, y1, x2, y2, color = 0xFFFF00, options = {}) {
        if (this.lightningBolts.length >= this.maxLightnings) return;

        const {
            width = 4,
            life = 0.25,
            branches = 3,
            glowSize = 30
        } = options;

        // 生成主闪电路径（中点位移算法）
        const mainPath = this._generateLightningPath(x1, y1, x2, y2, 5, 0.15);

        // 生成分支
        const branchPaths = [];
        for (let i = 0; i < branches; i++) {
            const startIdx = Math.floor(mainPath.length * (0.3 + i * 0.2));
            if (startIdx >= mainPath.length - 1) continue;
            const [sx, sy] = mainPath[startIdx];
            const [dx, dy] = [mainPath[startIdx + 1][0] - mainPath[startIdx - 1][0],
                               mainPath[startIdx + 1][1] - mainPath[startIdx - 1][1]];
            const dist = Math.hypot(dx, dy) || 1;
            const perpX = -dy / dist;
            const perpY = dx / dist;
            const branchLen = 40 + Math.random() * 60;
            const dir = Math.random() > 0.5 ? 1 : -1;
            const ex = sx + perpX * branchLen * dir + (Math.random() - 0.5) * 30;
            const ey = sy + perpY * branchLen * dir + (Math.random() - 0.5) * 30;
            branchPaths.push(this._generateLightningPath(sx, sy, ex, ey, 3, 0.2));
        }

        const graphics = this.scene.add.graphics().setDepth(10);
        const endGlow = this.createGlow(x2, y2, color, glowSize, 0.7, false);
        const startGlow = this.createGlow(x1, y1, color, glowSize * 0.7, 0.5, false);

        const bolt = {
            graphics,
            mainPath,
            branchPaths,
            color,
            width,
            life,
            maxLife: life,
            age: 0,
            endGlow,
            startGlow,
            flickerSeed: Math.random() * 100
        };

        this.lightningBolts.push(bolt);
        this._drawLightning(bolt);
    }

    _generateLightningPath(x1, y1, x2, y2, iterations, offsetRatio) {
        let pts = [[x1, y1], [x2, y2]];
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const offset = Math.max(dist * offsetRatio, 15);

        for (let iter = 0; iter < iterations; iter++) {
            const newPts = [];
            for (let i = 0; i < pts.length - 1; i++) {
                const [x1p, y1p] = pts[i];
                const [x2p, y2p] = pts[i + 1];
                const mx = (x1p + x2p) / 2 + (Math.random() - 0.5) * offset;
                const my = (y1p + y2p) / 2 + (Math.random() - 0.5) * offset;
                newPts.push(pts[i]);
                newPts.push([mx, my]);
            }
            newPts.push(pts[pts.length - 1]);
            pts = newPts;
        }
        return pts;
    }

    _drawLightning(bolt) {
        const { graphics, mainPath, branchPaths, color, width, age, maxLife, flickerSeed } = bolt;
        const t = age / maxLife;
        const flicker = 0.7 + 0.3 * Math.sin(age * 80 + flickerSeed);
        const alpha = Math.max(0, (1 - t) * flicker);

        graphics.clear();

        // 分支（细、半透明）
        for (const branch of branchPaths) {
            if (branch.length < 2) continue;
            graphics.lineStyle(width * 0.8, this._lighterColor(color, 0.3), alpha * 0.5);
            for (let i = 0; i < branch.length - 1; i++) {
                graphics.lineBetween(branch[i][0], branch[i][1], branch[i+1][0], branch[i+1][1]);
            }
        }

        // 外发光（粗、低透明度）
        graphics.lineStyle(width * 4, this._lighterColor(color, 0.4), alpha * 0.25);
        for (let i = 0; i < mainPath.length - 1; i++) {
            graphics.lineBetween(mainPath[i][0], mainPath[i][1], mainPath[i+1][0], mainPath[i+1][1]);
        }

        // 主色层
        graphics.lineStyle(width * 1.8, color, alpha * 0.8);
        for (let i = 0; i < mainPath.length - 1; i++) {
            graphics.lineBetween(mainPath[i][0], mainPath[i][1], mainPath[i+1][0], mainPath[i+1][1]);
        }

        // 内芯（亮白）
        graphics.lineStyle(width * 0.7, 0xFFFFFF, alpha);
        for (let i = 0; i < mainPath.length - 1; i++) {
            graphics.lineBetween(mainPath[i][0], mainPath[i][1], mainPath[i+1][0], mainPath[i+1][1]);
        }
    }

    // ==================== 命中粒子 ====================

    /**
     * 触发命中粒子效果
     */
    spawnHitParticles(x, y, color = 0xFFFF00, isCrit = false) {
        const count = isCrit ? 12 : 6;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = isCrit ? 150 + Math.random() * 250 : 80 + Math.random() * 150;
            const pColor = isCrit && Math.random() < 0.5 ? 0xFFFFFF : color;
            const pSize = isCrit ? 4 + Math.random() * 6 : 3 + Math.random() * 4;
            const pLife = isCrit ? 0.35 + Math.random() * 0.2 : 0.25 + Math.random() * 0.15;

            const img = this.scene.add.image(x, y, this.glowTextureKey)
                .setTint(pColor)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(12)
                .setAlpha(0.9);
            img.displayWidth = pSize * 3;
            img.displayHeight = pSize * 3;

            this.particles.push({
                img,
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: pColor,
                size: pSize,
                life: pLife,
                maxLife: pLife,
                gravity: 100,
                drag: 0.93,
                hasTrail: false
            });
        }

        // 命中闪光（小范围）
        const hitGlow = this.createGlow(x, y, color, isCrit ? 25 : 15, isCrit ? 0.7 : 0.4, false);
        this.scene.tweens.add({
            targets: hitGlow,
            alpha: 0,
            displayWidth: isCrit ? 80 : 50,
            displayHeight: isCrit ? 80 : 50,
            duration: isCrit ? 200 : 150,
            ease: 'Cubic.easeOut',
            onComplete: () => hitGlow.destroy()
        });
    }

    // ==================== 子弹拖尾 ====================

    /**
     * 创建子弹拖尾效果
     * 返回一个 trail 对象，需要每帧调用 updateTrail(trail, x, y)
     */
    createTrail(color = 0x4FC3F7, maxLength = 8, width = 6) {
        if (!this.trailsEnabled) return null;
        const graphics = this.scene.add.graphics().setDepth(9);
        const trail = {
            graphics,
            color,
            maxLength,
            width,
            points: [],
            alive: true
        };
        this.trails.push(trail);
        return trail;
    }

    updateTrail(trail, x, y) {
        if (!trail.alive) return;
        trail.points.push({ x, y });
        if (trail.points.length > trail.maxLength) {
            trail.points.shift();
        }
        this._drawTrail(trail);
    }

    destroyTrail(trail) {
        trail.alive = false;
        if (trail.graphics) trail.graphics.destroy();
        const idx = this.trails.indexOf(trail);
        if (idx >= 0) this.trails.splice(idx, 1);
    }

    _drawTrail(trail) {
        const { graphics, points, color, width, maxLength } = trail;
        graphics.clear();
        if (points.length < 2) return;

        // 外发光层
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / points.length;
            const alpha = t * 0.3;
            const w = width * (0.5 + t * 1.5);
            graphics.lineStyle(w * 2.5, this._lighterColor(color, 0.3), alpha);
            graphics.lineBetween(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
        }

        // 主色层
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / points.length;
            const alpha = t * 0.7;
            const w = width * (0.3 + t * 0.7);
            graphics.lineStyle(w, color, alpha);
            graphics.lineBetween(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
        }

        // 内芯（亮白）
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / points.length;
            const alpha = t * 0.9;
            const w = width * 0.3 * (0.3 + t * 0.7);
            graphics.lineStyle(w, 0xFFFFFF, alpha);
            graphics.lineBetween(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
        }
    }

    // ==================== 屏幕特效 ====================

    /**
     * 屏幕闪光（全屏颜色叠加）
     */
    spawnScreenFlash(color = 0xFFFFFF, intensity = 0.3, duration = 0.2) {
        if (!this.screenEffectsEnabled) return;
        const flash = this.scene.add.rectangle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            color,
            intensity
        ).setScrollFactor(0).setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: duration * 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        this.screenFlashes.push({ flash, age: 0, life: duration });
    }

    /**
     * 受击红屏（玩家受伤时）
     */
    spawnDamageFlash() {
        if (!this.screenEffectsEnabled) return;
        const flash = this.scene.add.rectangle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            0xFF0000,
            0.25
        ).setScrollFactor(0).setDepth(5000);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });
    }

    /**
     * 升级闪光（金色）
     */
    spawnLevelUpFlash() {
        this.spawnScreenFlash(0xFFD700, 0.4, 0.4);
        this.scene.cameras.main.shake(300, 0.005);
    }

    // ==================== 更新循环 ====================

    update(dt) {
        this._updateParticles(dt);
        this._updateLightnings(dt);
        this._updateShockwaves(dt);
        this._updateExplosions(dt);
        this._updateScreenFlashes(dt);
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                p.img.destroy();
                if (p.trailGraphics) p.trailGraphics.destroy();
                this.particles.splice(i, 1);
                continue;
            }

            p.vx *= p.drag;
            p.vy = p.vy * p.drag + p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const alpha = p.life / p.maxLife;
            p.img.setPosition(p.x, p.y);
            p.img.setAlpha(alpha * 0.9);

            if (p.grow) {
                const scale = 1 + (1 - alpha) * 0.8;
                p.img.displayWidth = p.size * 2 * scale;
                p.img.displayHeight = p.size * 2 * scale;
            } else {
                const scale = 0.5 + alpha * 0.5;
                p.img.displayWidth = p.size * 3 * scale;
                p.img.displayHeight = p.size * 3 * scale;
            }

            // 拖尾
            if (p.hasTrail && p.trailGraphics && p.trailPoints) {
                p.trailPoints.push({ x: p.x, y: p.y });
                if (p.trailPoints.length > 6) p.trailPoints.shift();

                p.trailGraphics.clear();
                if (p.trailPoints.length >= 2) {
                    for (let j = 0; j < p.trailPoints.length - 1; j++) {
                        const t = j / p.trailPoints.length;
                        p.trailGraphics.lineStyle(
                            p.size * t * 0.8,
                            p.color,
                            alpha * t * 0.5
                        );
                        p.trailGraphics.lineBetween(
                            p.trailPoints[j].x, p.trailPoints[j].y,
                            p.trailPoints[j+1].x, p.trailPoints[j+1].y
                        );
                    }
                }
            }
        }
    }

    _updateLightnings(dt) {
        for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
            const bolt = this.lightningBolts[i];
            bolt.age += dt;
            if (bolt.age >= bolt.life) {
                bolt.graphics.destroy();
                bolt.endGlow.destroy();
                bolt.startGlow.destroy();
                this.lightningBolts.splice(i, 1);
                continue;
            }

            // 电弧闪烁：随机重绘路径
            if (Math.random() < 0.5) {
                const [x1, y1] = bolt.mainPath[0];
                const [x2, y2] = bolt.mainPath[bolt.mainPath.length - 1];
                bolt.mainPath = this._generateLightningPath(x1, y1, x2, y2, 5, 0.15);
            }
            this._drawLightning(bolt);

            // 端点辉光闪烁
            const glowAlpha = (1 - bolt.age / bolt.life) * (0.5 + Math.random() * 0.5);
            bolt.endGlow.setAlpha(glowAlpha);
            bolt.startGlow.setAlpha(glowAlpha * 0.7);
        }
    }

    _updateShockwaves(dt) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.age += dt;
            if (sw.age < sw.delay) continue;
            if (sw.age >= sw.life + sw.delay) {
                sw.graphics.destroy();
                this.shockwaves.splice(i, 1);
                continue;
            }

            const t = (sw.age - sw.delay) / sw.life;
            const r = sw.maxRadius * (1 - Math.pow(1 - t, 3)); // easeOutCubic
            const alpha = sw.alpha * (1 - t);

            sw.graphics.clear();
            // 外发光
            sw.graphics.lineStyle(sw.lineWidth * 3, this._lighterColor(sw.color, 0.3), alpha * 0.3);
            sw.graphics.strokeCircle(sw.x, sw.y, r);
            // 主环
            sw.graphics.lineStyle(sw.lineWidth, sw.color, alpha);
            sw.graphics.strokeCircle(sw.x, sw.y, r);
            // 内部填充（早期）
            if (t < 0.3) {
                sw.graphics.fillStyle(sw.color, alpha * 0.2 * (1 - t / 0.3));
                sw.graphics.fillCircle(sw.x, sw.y, r * 0.9);
            }
        }
    }

    _updateExplosions(dt) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.age += dt;
            if (exp.age >= exp.life) {
                this.explosions.splice(i, 1);
            }
        }
    }

    _updateScreenFlashes(dt) {
        for (let i = this.screenFlashes.length - 1; i >= 0; i--) {
            const sf = this.screenFlashes[i];
            sf.age += dt;
            if (sf.age >= sf.life) {
                this.screenFlashes.splice(i, 1);
            }
        }
    }

    // ==================== 工具方法 ====================

    _lighterColor(color, amount = 0.4) {
        const r = Math.min(255, ((color >> 16) & 0xFF) + Math.floor(255 * amount));
        const g = Math.min(255, ((color >> 8) & 0xFF) + Math.floor(255 * amount));
        const b = Math.min(255, (color & 0xFF) + Math.floor(255 * amount));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * 清理所有特效（场景重启时调用）
     */
    clearAll() {
        for (const p of this.particles) {
            p.img.destroy();
            if (p.trailGraphics) p.trailGraphics.destroy();
        }
        for (const b of this.lightningBolts) {
            b.graphics.destroy();
            b.endGlow.destroy();
            b.startGlow.destroy();
        }
        for (const sw of this.shockwaves) {
            sw.graphics.destroy();
        }
        for (const t of this.trails) {
            if (t.graphics) t.graphics.destroy();
        }
        this.particles = [];
        this.lightningBolts = [];
        this.shockwaves = [];
        this.trails = [];
        this.explosions = [];
        this.screenFlashes = [];
    }

    /**
     * 获取性能统计
     */
    getStats() {
        return {
            particles: this.particles.length,
            explosions: this.explosions.length,
            lightnings: this.lightningBolts.length,
            shockwaves: this.shockwaves.length,
            trails: this.trails.length
        };
    }
}
