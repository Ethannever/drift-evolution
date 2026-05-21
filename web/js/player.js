// 玩家载具类

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.stage = 'raft';
        this.name = CONFIG.STAGES.raft.name;
        this.maxHp = CONFIG.STAGES.raft.hp;
        this.hp = this.maxHp;
        this.speed = CONFIG.STAGES.raft.speed;
        this.cargo = CONFIG.STAGES.raft.cargo;
        this.defense = CONFIG.STAGES.raft.defense;
        
        // 移动
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.rotationSpeed = 2;
        
        // 物资
        this.inventory = { wood: 10, food: 5, water: 3 };
        this.techPoints = 0;
        
        // 武器
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.lastFireTime = 0;
        
        // 状态
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;

        // 像素精灵动画
        this.spriteFrame = 0;       // 当前精灵帧 0-3
        this.spriteTimer = 0;       // 帧计时器
        this.spriteFrameDuration = 0.25;  // 每帧持续时间(秒)
        this.isMoving = false;      // 是否正在移动

        // 尺寸
        this.width = 48;
        this.height = 32;
    }
    
    // 进化到新阶段
    evolve(newStage) {
        const stageData = CONFIG.STAGES[newStage];
        if (!stageData) return false;
        
        this.stage = newStage;
        this.name = stageData.name;
        this.maxHp = stageData.hp;
        this.hp = this.maxHp;
        this.speed = stageData.speed;
        this.cargo = stageData.cargo;
        this.defense = stageData.defense;
        
        // 更新武器
        this.weapons = stageData.weapons.map(w => ({...CONFIG.WEAPONS[w]}));
        this.currentWeaponIndex = 0;
        
        return true;
    }
    
    // 受伤
    takeDamage(amount, attacker) {
        if (this.isInvulnerable) {
            return { damage: 0, blocked: true };
        }
        
        const actualDamage = Math.max(1, amount - this.defense);
        this.hp = Math.max(0, this.hp - actualDamage);
        
        // 无敌时间
        this.isInvulnerable = true;
        this.invulnerableTimer = CONFIG.SETTINGS.invulnerabilityTime;
        
        return { damage: actualDamage, hpRemaining: this.hp, destroyed: this.hp <= 0 };
    }
    
    // 添加科技点
    addTechPoints(amount) {
        this.techPoints += amount;
    }
    
    // 添加物资
    addItem(type, amount) {
        const currentTotal = Object.values(this.inventory).reduce((a, b) => a + b, 0);
        if (currentTotal >= this.cargo) return false;
        
        this.inventory[type] = (this.inventory[type] || 0) + amount;
        return true;
    }
    
    // 消耗物资
    removeItem(type, amount) {
        if ((this.inventory[type] || 0) < amount) return false;
        this.inventory[type] -= amount;
        return true;
    }
    
    // 获取当前武器
    getCurrentWeapon() {
        if (this.weapons.length === 0) return null;
        return this.weapons[this.currentWeaponIndex];
    }
    
    // 切换武器
    switchWeapon(delta) {
        if (this.weapons.length <= 1) return;
        this.currentWeaponIndex = (this.currentWeaponIndex + delta + this.weapons.length) % this.weapons.length;
    }
    
    // 开火
    canFire() {
        const weapon = this.getCurrentWeapon();
        if (!weapon) return false;
        
        const now = Date.now();
        const cooldown = 1000 / weapon.fireRate;
        
        if (now - this.lastFireTime < cooldown) return false;
        
        // 检查弹药
        if (weapon.ammoCost && weapon.ammo < weapon.ammoCost) return false;
        
        return true;
    }
    
    fire(targetX, targetY) {
        const weapon = this.getCurrentWeapon();
        if (!weapon || !this.canFire()) return null;
        
        this.lastFireTime = Date.now();
        
        // 消耗弹药
        if (weapon.ammoCost) {
            weapon.ammo -= weapon.ammoCost;
        }
        
        // 计算方向
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const angle = Math.atan2(dy, dx);
        
        return {
            x: this.x,
            y: this.y,
            angle: angle,
            damage: weapon.damage,
            range: weapon.range,
            speed: weapon.type === 'ranged' ? 400 : 0,
            type: weapon.type,
            knockback: weapon.knockback || 0
        };
    }
    
    // 获取HP百分比
    getHpPercent() {
        return this.hp / this.maxHp;
    }
    
    // 获取总物资数
    getInventoryTotal() {
        return Object.values(this.inventory).reduce((a, b) => a + b, 0);
    }
    
    // 更新
    update(dt, keys) {
        // 计算实际速度（进化基础速度 × 加速技能倍率）
        let actualSpeed = this.speed;
        if (this.speedBoostEnd && this.speedBoostEnd > Date.now()) {
            actualSpeed *= 2;  // speed_boost: x2 for 3s
        }
        if (this.isInvulnerable && this.invulnerableEnd && this.invulnerableEnd > Date.now()) {
            // 护盾技能激活中（已由 skills.js 设置 isInvulnerable）
        }


        if (keys.up) dy = -1;
        if (keys.down) dy = 1;
        if (keys.left) dx = -1;
        if (keys.right) dx = 1;


        // 标准化对角线移动
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // 应用移动（使用进化后真实速度 × 技能倍率）
        this.x += dx * actualSpeed * dt;
        this.y += dy * actualSpeed * dt;

        // 同时更新朝向
        this.isMoving = (dx !== 0 || dy !== 0);
        if (this.isMoving) {
            this.rotation = Math.atan2(dy, dx);
        }

        // 更新精灵动画帧
        this.spriteTimer += dt;
        if (this.spriteTimer >= this.spriteFrameDuration) {
            this.spriteTimer -= this.spriteFrameDuration;
            if (this.isMoving) {
                // 移动状态: 帧 2-3 循环(桨/螺旋桨动画)
                this.spriteFrame = (this.spriteFrame < 2 || this.spriteFrame >= 3) ? 2 : 3;
            } else {
                // 静止状态: 帧 0-1 循环(上下浮动)
                this.spriteFrame = (this.spriteFrame >= 1) ? 0 : 1;
            }
        }
    }
    
    // 渲染(像素精灵图版)
    render(ctx) {
        ctx.save();

        // 无敌闪烁效果
        if (this.isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 发光脉冲效果(降低强度: shadowBlur 15->5)
        const pulseIntensity = 5 + Math.sin(Date.now() / 200) * 3;
        ctx.shadowColor = '#4fc3f7';
        ctx.shadowBlur = pulseIntensity;

        // 使用精灵管理器绘制对应阶段的精灵
        if (window.spriteManager) {
            window.spriteManager.render(
                ctx,
                this.stage,
                this.spriteFrame,
                this.x,
                this.y,
                this.rotation,
                1.0
            );
        } else {
            // 回退: 精灵管理器未加载时用简单方块
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.getColor();
            ctx.fillRect(-20, -14, 40, 28);
        }

        ctx.restore();
    }
    
    getColor() {
        const colors = {
            raft: '#D4A574',  // 浅棕色，更显眼
            canoe: '#A0522D',
            fisher: '#CD853F',
            gunboat: '#708090',
            destroyer: '#4682B4',
            cruiser: '#4169E1',
            carrier: '#1E3A5F'
        };
        return colors[this.stage] || '#D4A574';
    }
    
    // 存档数据
    getSaveData() {
        return {
            stage: this.stage,
            hp: this.hp,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            inventory: {...this.inventory},
            techPoints: this.techPoints,
            weapons: this.weapons.map(w => w.name)
        };
    }
    
    // 加载存档
    loadSaveData(data) {
        this.stage = data.stage || 'raft';
        this.hp = data.hp || 50;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.rotation = data.rotation || 0;
        this.inventory = data.inventory || { wood: 0, food: 0, water: 0 };
        this.techPoints = data.techPoints || 0;
        
        // 恢复阶段属性
        const stageData = CONFIG.STAGES[this.stage];
        if (stageData) {
            this.name = stageData.name;
            this.maxHp = stageData.hp;
            this.speed = stageData.speed;
            this.cargo = stageData.cargo;
            this.defense = stageData.defense;
            this.weapons = (data.weapons || stageData.weapons).map(w => ({...CONFIG.WEAPONS[w]}));
        }
    }
}

window.Player = Player;
