export class Bullet {
    constructor(scene, x, y, vx, vy, damage, type = 'energy', explosionRadius = 0, homing = false, slowDuration = 0, slowFactor = 1) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.type = type;
        this.explosionRadius = explosionRadius;
        this.homing = homing;
        this.slowDuration = slowDuration;
        this.slowFactor = slowFactor;
        this.radius = type === 'fireball' ? 12 : type === 'missile' ? 10 : 6;
        this.alive = true;
        this.lifetime = 3.0;
        this.hitEnemies = new Set();
        
        // 颜色配置
        this.colors = {
            energy: { main: 0x4FC3F7, glow: 0x81D4FA },
            fireball: { main: 0xFF6D00, glow: 0xFFAB40 },
            knife: { main: 0xE0E0E0, glow: 0xFFFFFF },
            missile: { main: 0x9E9E9E, glow: 0xFF5722 },
            ice_spike: { main: 0x80DEEA, glow: 0xB2EBF2 }
        };
        this.color = this.colors[type] || this.colors.energy;
        
        // 创建图形
        this.graphics = scene.add.graphics().setDepth(8);
        this.glow = scene.add.circle(x, y, this.radius * 2, this.color.glow, 0.3).setDepth(7);
        this.drawBullet();
    }
    
    drawBullet() {
        this.graphics.clear();
        if (this.type === 'fireball') {
            this.graphics.fillStyle(this.color.glow, 0.5);
            this.graphics.fillCircle(this.x, this.y, this.radius * 1.5);
            this.graphics.fillStyle(this.color.main, 1);
            this.graphics.fillCircle(this.x, this.y, this.radius);
            this.graphics.fillStyle(0xFFFF00, 0.8);
            this.graphics.fillCircle(this.x, this.y, this.radius * 0.5);
        } else if (this.type === 'knife') {
            const angle = Math.atan2(this.vy, this.vx);
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const r = this.radius;
            // 直接计算旋转后坐标，不用translate/rotate（Phaser Graphics没有translate方法）
            const p1x = this.x + (r * 2 * cos - 0 * sin);
            const p1y = this.y + (r * 2 * sin + 0 * cos);
            const p2x = this.x + (0 * cos - r * 0.6 * sin);
            const p2y = this.y + (0 * sin + r * 0.6 * cos);
            const p3x = this.x + (-r * cos - 0 * sin);
            const p3y = this.y + (-r * sin + 0 * cos);
            const p4x = this.x + (0 * cos - (-r * 0.6) * sin);
            const p4y = this.y + (0 * sin + (-r * 0.6) * cos);
            this.graphics.fillStyle(this.color.main, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(p1x, p1y);
            this.graphics.lineTo(p2x, p2y);
            this.graphics.lineTo(p3x, p3y);
            this.graphics.lineTo(p4x, p4y);
            this.graphics.closePath();
            this.graphics.fillPath();
        } else if (this.type === 'missile') {
            const angle = Math.atan2(this.vy, this.vx);
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const r = this.radius;
            const rotatePoint = (px, py) => ({
                x: this.x + (px * cos - py * sin),
                y: this.y + (px * sin + py * cos)
            });
            // 尾焰（圆形，直接计算旋转后圆心）
            const tailCenter = rotatePoint(-r * 1.5, 0);
            this.graphics.fillStyle(0xFF5722, 0.6);
            this.graphics.fillCircle(tailCenter.x, tailCenter.y, r * 0.8);
            // 弹体（矩形4个顶点）
            const b1 = rotatePoint(-r, -r * 0.5);
            const b2 = rotatePoint(r, -r * 0.5);
            const b3 = rotatePoint(r, r * 0.5);
            const b4 = rotatePoint(-r, r * 0.5);
            this.graphics.fillStyle(this.color.main, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(b1.x, b1.y);
            this.graphics.lineTo(b2.x, b2.y);
            this.graphics.lineTo(b3.x, b3.y);
            this.graphics.lineTo(b4.x, b4.y);
            this.graphics.closePath();
            this.graphics.fillPath();
            // 弹头（三角形3个顶点）
            const h1 = rotatePoint(r * 2, 0);
            const h2 = rotatePoint(r, -r * 0.5);
            const h3 = rotatePoint(r, r * 0.5);
            this.graphics.fillStyle(0xFF5722, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(h1.x, h1.y);
            this.graphics.lineTo(h2.x, h2.y);
            this.graphics.lineTo(h3.x, h3.y);
            this.graphics.closePath();
            this.graphics.fillPath();
        } else if (this.type === 'ice_spike') {
            const angle = Math.atan2(this.vy, this.vx);
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const r = this.radius;
            const rotatePoint = (px, py) => ({
                x: this.x + (px * cos - py * sin),
                y: this.y + (px * sin + py * cos)
            });
            // 光晕（圆形，圆心就是子弹位置，不需要旋转）
            this.graphics.fillStyle(this.color.glow, 0.4);
            this.graphics.fillCircle(this.x, this.y, r * 1.5);
            // 冰锥四边形4个顶点
            const p1 = rotatePoint(r * 2, 0);
            const p2 = rotatePoint(-r * 0.5, r * 0.8);
            const p3 = rotatePoint(-r, 0);
            const p4 = rotatePoint(-r * 0.5, -r * 0.8);
            this.graphics.fillStyle(this.color.main, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(p1.x, p1.y);
            this.graphics.lineTo(p2.x, p2.y);
            this.graphics.lineTo(p3.x, p3.y);
            this.graphics.lineTo(p4.x, p4.y);
            this.graphics.closePath();
            this.graphics.fillPath();
        } else {
            this.graphics.fillStyle(this.color.glow, 0.4);
            this.graphics.fillCircle(this.x, this.y, this.radius * 1.5);
            this.graphics.fillStyle(this.color.main, 1);
            this.graphics.fillCircle(this.x, this.y, this.radius);
            this.graphics.fillStyle(0xFFFFFF, 0.8);
            this.graphics.fillCircle(this.x, this.y, this.radius * 0.4);
        }
    }
    
    update(dt) {
        if (!this.alive) return;
        
        // 追踪导弹
        if (this.homing) {
            let nearest = null;
            let minDist = 500;
            for (const e of this.scene.enemies) {
                if (!e.alive) continue;
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < minDist) { minDist = d; nearest = e; }
            }
            if (nearest) {
                const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                const currentAngle = Math.atan2(this.vy, this.vx);
                let diff = targetAngle - currentAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const turnSpeed = 3 * dt;
                const newAngle = currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, diff));
                const speed = Math.hypot(this.vx, this.vy);
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifetime -= dt;
        
        if (this.lifetime <= 0) {
            this.alive = false;
            return;
        }
        
        // 地图边界
        if (this.x < 0 || this.x > 3000 || this.y < 0 || this.y > 3000) {
            this.alive = false;
            return;
        }
        
        this.drawBullet();
        this.glow.setPosition(this.x, this.y);
    }
    
    destroy() {
        if (this.destroyed) return; // 防重复销毁
        this.destroyed = true;
        this.graphics.destroy();
        this.glow.destroy();
    }
}

export class XpGem {
    constructor(scene, x, y, value) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 8;
        this.alive = true;
        this.bobOffset = Math.random() * Math.PI * 2;
        
        this.graphics = scene.add.graphics();
        this.glow = scene.add.circle(x, y, this.radius * 2, 0xFFD700, 0.3);
        this.drawGem();
    }
    
    drawGem() {
        this.graphics.clear();
        const bob = Math.sin(Date.now() / 200 + this.bobOffset) * 3;
        const y = this.y + bob;
        this.graphics.fillStyle(0xFFD700, 0.3);
        this.graphics.fillCircle(this.x, y, this.radius * 1.8);
        this.graphics.fillStyle(0xFFD700, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(this.x, y - this.radius);
        this.graphics.lineTo(this.x + this.radius * 0.7, y);
        this.graphics.lineTo(this.x, y + this.radius);
        this.graphics.lineTo(this.x - this.radius * 0.7, y);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.fillStyle(0xFFFFFF, 0.6);
        this.graphics.fillCircle(this.x - 2, y - 2, 2);
    }
    
    update(dt, player) {
        if (!this.alive) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < player.pickupRange) {
            const speed = 300 * (1 - dist / player.pickupRange) + 100;
            this.x += (dx / dist) * speed * dt;
            this.y += (dy / dist) * speed * dt;
        }
        
        if (dist < player.radius + 10) {
            this.alive = false;
            return;
        }
        
        this.drawGem();
        this.glow.setPosition(this.x, this.y);
    }
    
    destroy() {
        if (this.destroyed) return; // 防重复销毁
        this.destroyed = true;
        this.graphics.destroy();
        this.glow.destroy();
    }
}
