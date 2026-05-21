// 渲染效果增强
class RendererEffects {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.time = 0;
        this.particles = [];
        this.waveOffset = 0;
    }
    
    update(dt) {
        this.time += dt;
        this.waveOffset += dt * 20;
        
        // 更新粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // 添加击中粒子
    addHitParticles(x, y, color = '#ffff00') {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.3,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }
    
    // 渲染波浪背景
    renderOceanBackground(camera) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // 基础颜色
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, w, h);
        
        // 波浪层1
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
        ctx.lineWidth = 1;
        const wave1 = Math.sin(this.waveOffset * 0.02) * 10;
        for (let y = -50; y < h + 50; y += 40) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 10) {
                const yOffset = Math.sin((x + camera.x) * 0.02 + this.waveOffset * 0.05 + y * 0.1) * wave1;
                if (x === 0) {
                    ctx.moveTo(x, y + yOffset);
                } else {
                    ctx.lineTo(x, y + yOffset);
                }
            }
            ctx.stroke();
        }
        
        // 波浪层2
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.05)';
        const wave2 = Math.sin(this.waveOffset * 0.015 + 1) * 8;
        for (let y = -30; y < h + 30; y += 25) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 10) {
                const yOffset = Math.sin((x + camera.x * 0.5) * 0.03 + this.waveOffset * 0.03 + y * 0.05) * wave2;
                if (x === 0) {
                    ctx.moveTo(x, y + yOffset);
                } else {
                    ctx.lineTo(x, y + yOffset);
                }
            }
            ctx.stroke();
        }
    }
    
    // 渲染粒子
    renderParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            const alpha = p.life / 0.6;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RendererEffects };
}
