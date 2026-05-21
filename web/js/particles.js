// 粒子特效系统
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    // 创建粒子
    emit(x, y, count, options = {}) {
        const defaults = {
            color: '#fff',
            speed: 2,
            size: 3,
            life: 0.8,
            spread: Math.PI * 2,
            angle: 0,
            gravity: 0,
            fadeOut: true,
            shrink: true,
            colors: null // 多色随机
        };
        const opts = { ...defaults, ...options };

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = opts.angle - opts.spread / 2 + Math.random() * opts.spread;
            const speed = opts.speed * (0.5 + Math.random() * 0.5);
            const color = opts.colors
                ? opts.colors[Math.floor(Math.random() * opts.colors.length)]
                : opts.color;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: opts.size * (0.5 + Math.random() * 0.5),
                life: opts.life * (0.7 + Math.random() * 0.3),
                maxLife: opts.life,
                color,
                gravity: opts.gravity,
                fadeOut: opts.fadeOut,
                shrink: opts.shrink
            });
        }
    }

    // 收集特效 - 金色闪光
    collectEffect(x, y) {
        this.emit(x, y, 8, {
            colors: ['#FFD700', '#FFA500', '#FF6347', '#fff'],
            speed: 3,
            size: 4,
            life: 0.5,
            spread: Math.PI * 2
        });
    }

    // 进化爆发 - 大型彩色粒子环
    evolveEffect(x, y) {
        // 外圈爆发
        this.emit(x, y, 30, {
            colors: ['#00ff88', '#00ccff', '#ff00ff', '#ffff00', '#ff6600'],
            speed: 6,
            size: 6,
            life: 1.2,
            spread: Math.PI * 2
        });
        // 内圈闪光
        this.emit(x, y, 15, {
            color: '#fff',
            speed: 2,
            size: 8,
            life: 0.6,
            spread: Math.PI * 2
        });
        // 上升火花
        this.emit(x, y, 10, {
            colors: ['#FFD700', '#fff'],
            speed: 4,
            size: 3,
            life: 1.0,
            angle: -Math.PI / 2,
            spread: Math.PI / 3,
            gravity: -0.05
        });
    }

    // 受击特效 - 红色火花
    hitEffect(x, y) {
        this.emit(x, y, 6, {
            colors: ['#ff0000', '#ff4444', '#ff8888'],
            speed: 4,
            size: 3,
            life: 0.3,
            spread: Math.PI * 2
        });
    }

    // 射击特效 - 枪口闪光
    fireEffect(x, y, angle) {
        this.emit(x, y, 4, {
            colors: ['#ffff00', '#ffaa00', '#fff'],
            speed: 5,
            size: 3,
            life: 0.15,
            angle: angle,
            spread: Math.PI / 6
        });
    }

    // 敌人死亡 - 爆炸
    deathEffect(x, y, color = '#ff4444') {
        this.emit(x, y, 12, {
            colors: [color, '#fff', '#ffaa00'],
            speed: 5,
            size: 5,
            life: 0.6,
            spread: Math.PI * 2
        });
    }

    // 宝箱开启 - 金色喷泉
    treasureEffect(x, y) {
        this.emit(x, y, 20, {
            colors: ['#FFD700', '#FFA500', '#fff'],
            speed: 4,
            size: 4,
            life: 1.0,
            angle: -Math.PI / 2,
            spread: Math.PI / 2,
            gravity: 0.08
        });
    }

    // 船尾浪花
    wakeEffect(x, y, vx, vy) {
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < 0.5) return;
        const angle = Math.atan2(vy, vx) + Math.PI; // 反方向
        this.emit(x, y, 1, {
            color: 'rgba(255,255,255,0.5)',
            speed: speed * 0.3,
            size: 2 + speed * 0.5,
            life: 0.4,
            angle: angle,
            spread: Math.PI / 4,
            fadeOut: true
        });
    }

    // 更新所有粒子
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // 渲染所有粒子
    render(ctx, cameraX, cameraY) {
        for (const p of this.particles) {
            const alpha = p.fadeOut ? (p.life / p.maxLife) : 1;
            const size = p.shrink ? p.size * (p.life / p.maxLife) : p.size;

            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y - cameraY, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 清除所有粒子
    clear() {
        this.particles = [];
    }
}
