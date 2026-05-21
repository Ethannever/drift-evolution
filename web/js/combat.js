// 战斗系统 - 抛射物管理

class CombatSystem {
    constructor() {
        this.projectiles = [];
    }
    
    // 创建抛射物
    createProjectile(fireData, owner) {
        const projectile = {
            x: fireData.x,
            y: fireData.y,
            vx: Math.cos(fireData.angle) * fireData.speed,
            vy: Math.sin(fireData.angle) * fireData.speed,
            damage: fireData.damage,
            range: fireData.range,
            traveled: 0,
            type: fireData.type,
            knockback: fireData.knockback,
            owner: owner,
            isDead: false
        };
        
        this.projectiles.push(projectile);
        return projectile;
    }
    
    // 创建近战攻击特效
    createMeleeHit(x, y, angle, range, damage, knockback, owner) {
        // 近战直接命中，不创建抛射物
        return { x, y, angle, range, damage, knockback, owner, isMelee: true };
    }
    
    // 更新所有抛射物
    update(dt, enemies, player) {
        // 更新抛射物
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // 移动
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.traveled += Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt;
            
            // 检查射程
            if (p.traveled > p.range) {
                p.isDead = true;
            }
            
            // 检查与敌人碰撞
            for (const enemy of enemies) {
                if (enemy.isDead) continue;
                
                const dx = enemy.x - p.x;
                const dy = enemy.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < enemy.width / 2 + 5) {
                    // 命中
                    enemy.takeDamage(p.damage, p.owner);
                    
                    // 击退
                    if (p.knockback && enemy.takeDamage) {
                        const angle = Math.atan2(dy, dx);
                        enemy.vx += Math.cos(angle) * p.knockback * 0.1;
                        enemy.vy += Math.sin(angle) * p.knockback * 0.1;
                    }
                    
                    p.isDead = true;
                    break;
                }
            }
            
            // 检查与玩家碰撞（敌人抛射物）
            if (p.owner === 'enemy' && player) {
                const dx = player.x - p.x;
                const dy = player.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < player.width / 2 + 5) {
                    const result = player.takeDamage(p.damage, null);
                    p.isDead = true;
                    
                    if (result.destroyed) {
                        return { playerDestroyed: true };
                    }
                }
            }
            
            // 移除死亡的抛射物
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }
        
        return { playerDestroyed: false };
    }
    
    // 渲染抛射物
    render(ctx) {
        for (const p of this.projectiles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx));
            
            // 发光效果
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            
            // 抛射物外观
            if (p.type === 'ranged') {
                // 子弹 - 明亮黄色
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(0.3, '#fbbf24');
                gradient.addColorStop(1, '#f59e0b');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 尾部
                ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
                ctx.beginPath();
                ctx.moveTo(-5, 0);
                ctx.lineTo(-15, -5);
                ctx.lineTo(-15, 5);
                ctx.closePath();
                ctx.fill();
            } else {
                // 近战武器
                ctx.fillStyle = '#94a3b8';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#64748b';
                ctx.fillRect(-8, -3, 16, 6);
            }
            
            ctx.restore();
        }
    }
    
    // 渲染近战特效
    renderMeleeEffect(ctx, hitData) {
        if (!hitData) return;
        
        ctx.save();
        ctx.translate(hitData.x, hitData.y);
        ctx.rotate(hitData.angle);
        
        // 近战范围
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, hitData.range, -Math.PI/4, Math.PI/4);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // 清除所有抛射物
    clear() {
        this.projectiles = [];
    }
}

window.CombatSystem = CombatSystem;
