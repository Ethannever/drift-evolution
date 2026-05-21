// 敌人类

class Enemy {
    constructor(x, y, type) {
        const data = CONFIG.ENEMIES[type] || CONFIG.ENEMIES.hostile_raft;
        
        this.id = 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.x = x;
        this.y = y;
        this.type = type;
        this.name = data.name;
        
        this.maxHp = data.hp;
        this.hp = data.hp;
        this.damage = data.damage;
        this.speed = data.speed;
        this.behavior = data.behavior;
        this.drops = data.drops || {};
        
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        
        this.attackCooldown = 0;
        this.attackInterval = 1000; // 1秒攻击间隔
        
        this.width = 40;
        this.height = 30;
        
        this.isDead = false;
    }
    
    // 寻找目标
    findTarget(player) {
        if (!player) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 300) { // 检测范围
            return { target: player, distance: dist };
        }
        
        return null;
    }
    
    // 更新AI
    update(dt, player) {
        if (this.isDead) return;
        
        const targetInfo = this.findTarget(player);
        
        if (targetInfo) {
            const { target, distance } = targetInfo;
            
            // 计算朝向
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            this.rotation = Math.atan2(dy, dx);
            
            if (distance > 50) {
                // 追逐
                this.vx = Math.cos(this.rotation) * this.speed;
                this.vy = Math.sin(this.rotation) * this.speed;
            } else {
                // 攻击范围
                this.vx *= 0.9;
                this.vy *= 0.9;
                
                // 攻击
                this.tryAttack(target);
            }
        } else {
            // 巡逻
            this.patrol(dt);
        }
        
        // 应用速度
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 攻击冷却
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt * 1000;
        }
    }
    
    // 巡逻行为
    patrol(dt) {
        // 简单巡逻：随机方向移动
        if (Math.random() < 0.01) {
            this.rotation = Math.random() * Math.PI * 2;
        }
        
        this.vx = Math.cos(this.rotation) * this.speed * 0.3;
        this.vy = Math.sin(this.rotation) * this.speed * 0.3;
    }
    
    // 尝试攻击
    tryAttack(target) {
        if (this.attackCooldown > 0) return null;
        
        this.attackCooldown = this.attackInterval;
        
        return target.takeDamage(this.damage, this);
    }
    
    // 受伤
    takeDamage(amount, attacker) {
        this.hp = Math.max(0, this.hp - amount);
        
        if (this.hp <= 0) {
            this.isDead = true;
            return { destroyed: true, drops: this.drops };
        }
        
        return { damage: amount, hpRemaining: this.hp, destroyed: false };
    }
    
    // 碰撞检测
    collidesWith(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        return dist < (this.width + other.width) / 2;
    }
    
    // 渲染
    render(ctx) {
        if (this.isDead) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // 鲨鱼 - 更生动的颜色
        if (this.type === 'shark') {
            // 身体
            const gradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
            gradient.addColorStop(0, '#546e7a');
            gradient.addColorStop(0.5, '#78909c');
            gradient.addColorStop(1, '#455a64');
            ctx.fillStyle = gradient;
            
            // 椭圆身体
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 背鳍
            ctx.fillStyle = '#37474f';
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(-8, -this.height/2 - 12);
            ctx.lineTo(8, -this.height/2);
            ctx.closePath();
            ctx.fill();
            
            // 眼睛
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.width/4, -3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.width/4 + 1, -3, 2, 0, Math.PI * 2);
            ctx.fill();
            
        } else {
            // 海盗船 - 木船风格
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            // 桅杆
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(-3, -this.height/2 - 20, 6, 25);
            
            // 旗帜
            ctx.fillStyle = '#f44336';
            ctx.fillRect(3, -this.height/2 - 18, 15, 10);
        }
        
        ctx.restore();
        
        // HP条
        this.renderHPBar(ctx);
    }
    
    renderHPBar(ctx) {
        const barWidth = 40;
        const barHeight = 4;
        const x = this.x - barWidth/2;
        const y = this.y - this.height/2 - 10;
        
        // 背景
        ctx.fillStyle = 'rgba(50, 50, 80, 0.8)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 血量
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#f87171';
        ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
    }
    
    getColor() {
        const colors = {
            hostile_raft: '#8B4513',
            shark: '#4a5568',
            pirate_canoe: '#722F37'
        };
        return colors[this.type] || '#8B4513';
    }
}

window.Enemy = Enemy;
