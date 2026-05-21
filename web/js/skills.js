// 技能系统

class SkillSystem {
    constructor() {
        this.learnedSkills = [];
        this.activeSkills = [];
        this.cooldowns = {};
    }
    
    // 解锁技能
    learnSkill(skillId) {
        if (this.learnedSkills.includes(skillId)) return false;
        
        const skill = CONFIG.SKILLS[skillId];
        if (!skill) return false;
        
        this.learnedSkills.push(skillId);
        
        if (skill.type === 'active' || skill.type === 'attack' || skill.type === 'ultimate') {
            this.activeSkills.push(skillId);
        }
        
        return true;
    }
    
    // 使用技能
    useSkill(skillId, player, enemies) {
        const skill = CONFIG.SKILLS[skillId];
        if (!skill) return { success: false, reason: '技能不存在' };
        
        // 检查冷却
        if (this.cooldowns[skillId] && this.cooldowns[skillId] > Date.now()) {
            return { success: false, reason: '技能冷却中' };
        }
        
        // 检查是否已学习
        if (!this.learnedSkills.includes(skillId)) {
            return { success: false, reason: '技能未解锁' };
        }
        
        // 执行技能效果
        let result = { success: true, skill: skill };
        
        switch (skill.type) {
            case 'active':
                this.applyActiveEffect(skill, player);
                this.cooldowns[skillId] = Date.now() + skill.cooldown * 1000;
                break;
                
            case 'attack':
                result = this.applyAttackEffect(skill, player, enemies);
                this.cooldowns[skillId] = Date.now() + skill.cooldown * 1000;
                break;
                
            case 'ultimate':
                result = this.applyUltimateEffect(skill, player, enemies);
                this.cooldowns[skillId] = Date.now() + skill.cooldown * 1000;
                break;
        }
        
        return result;
    }
    
    // 应用主动技能效果
    applyActiveEffect(skill, player) {
        const effect = skill.effect;
        
        if (effect.speedMultiplier) {
            player.speedBoost = skill.duration || 3;
            player.speedBoostEnd = Date.now() + skill.duration * 1000;
        }
        
        if (effect.invulnerable) {
            player.isInvulnerable = true;
            player.invulnerableEnd = Date.now() + skill.duration * 1000;
        }
        
        if (effect.healPercent) {
            const healAmount = player.maxHp * effect.healPercent;
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
        }
    }
    
    // 应用攻击技能效果
    applyAttackEffect(skill, player, enemies) {
        const effect = skill.effect || {};
        
        if (skill.aoe) {
            // 范围攻击
            let totalDamage = 0;
            for (const enemy of enemies) {
                if (enemy.isDead) continue;
                
                const baseDamage = player.getAttackDamage ? player.getAttackDamage() : 10;
                const damage = Math.floor(baseDamage * (skill.damageBonus || 1) * (skill.damageMod || 1));
                enemy.takeDamage(damage, player);
                totalDamage += damage;
            }
            return { success: true, type: 'aoe', damage: totalDamage, enemies: enemies.filter(e => !e.isDead).length };
        }
        
        // 单体攻击
        const nearestEnemy = this.findNearestEnemy(player, enemies);
        if (!nearestEnemy) {
            return { success: false, reason: '没有目标' };
        }
        
        const baseDamage = player.getAttackDamage ? player.getAttackDamage() : 10;
        const damage = Math.floor(baseDamage * (skill.damageBonus || 1));
        nearestEnemy.takeDamage(damage, player);
        
        return { success: true, type: 'single', damage: damage, target: nearestEnemy };
    }
    
    // 应用终极技能
    applyUltimateEffect(skill, player, enemies) {
        if (!skill.aoe) return { success: false, reason: '技能配置错误' };
        
        let totalDamage = 0;
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            
            const baseDamage = player.getAttackDamage ? player.getAttackDamage() : 10;
            const damage = Math.floor(baseDamage * (skill.damageMod || 0.5));
            enemy.takeDamage(damage, player);
            totalDamage += damage;
        }
        
        return { success: true, type: 'ultimate', damage: totalDamage };
    }
    
    // 找到最近的敌人
    findNearestEnemy(player, enemies) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        
        return nearest;
    }
    
    // 获取技能冷却剩余时间
    getCooldownRemaining(skillId) {
        if (!this.cooldowns[skillId]) return 0;
        const remaining = this.cooldowns[skillId] - Date.now();
        return remaining > 0 ? remaining / 1000 : 0;
    }
    
    // 更新技能状态
    update(dt, player) {
        // 更新速度加成
        if (player.speedBoostEnd && player.speedBoostEnd <= Date.now()) {
            player.speedBoost = 0;
            player.speedBoostEnd = null;
        }
        
        // 更新无敌时间
        if (player.invulnerableEnd && player.invulnerableEnd <= Date.now()) {
            player.isInvulnerable = false;
            player.invulnerableEnd = null;
        }
    }
    
    // 获取已解锁技能列表
    getLearnedSkills() {
        return this.learnedSkills.map(id => ({
            id,
            ...CONFIG.SKILLS[id]
        }));
    }
    
    // 获取技能面板数据
    getSkillsPanelData() {
        return this.activeSkills.map(id => {
            const skill = CONFIG.SKILLS[id];
            const cooldown = this.getCooldownRemaining(id);
            return {
                id,
                ...skill,
                cooldownRemaining: cooldown,
                onCooldown: cooldown > 0
            };
        });
    }
}

// 道具系统
class ItemSystem {
    constructor() {
        this.inventory = {};
        this.maxSlots = 12;
    }
    
    // 添加道具
    addItem(itemId, count = 1) {
        if (this.inventory[itemId]) {
            this.inventory[itemId] += count;
        } else {
            if (Object.keys(this.inventory).length >= this.maxSlots) {
                return { success: false, reason: '背包已满' };
            }
            this.inventory[itemId] = count;
        }
        return { success: true, count: this.inventory[itemId] };
    }
    
    // 使用道具
    useItem(itemId, player) {
        const item = CONFIG.ITEMS[itemId];
        if (!item) return { success: false, reason: '道具不存在' };
        
        const count = this.inventory[itemId] || 0;
        if (count <= 0) return { success: false, reason: '道具数量不足' };
        
        let result = { success: true, item: item };
        
        switch (item.type) {
            case 'consumable':
                if (item.effect.heal) {
                    player.hp = Math.min(player.maxHp, player.hp + item.effect.heal);
                }
                if (item.effect.restoreStamina) {
                    // 恢复体力逻辑
                }
                this.inventory[itemId]--;
                break;
                
            case 'equip':
                // 装备逻辑
                break;
                
            default:
                // 资源类道具无法使用
                return { success: false, reason: '该道具无法使用' };
        }
        
        return result;
    }
    
    // 获取道具列表
    getInventory() {
        return Object.entries(this.inventory)
            .filter(([id, count]) => count > 0)
            .map(([id, count]) => ({
                id,
                ...CONFIG.ITEMS[id],
                count
            }));
    }
    
    // 清理背包
    cleanInventory() {
        for (const id of Object.keys(this.inventory)) {
            if (this.inventory[id] <= 0) {
                delete this.inventory[id];
            }
        }
    }
}

// 天气系统
class WeatherSystem {
    constructor() {
        this.current = 'clear';
        this.effect = {};
        this.nextChange = 0;
    }
    
    update(dt) {
        if (Date.now() >= this.nextChange) {
            this.changeWeather();
        }
        
        // 应用天气效果
        this.applyEffects();
    }
    
    changeWeather() {
        const weathers = Object.keys(CONFIG.WEATHER);
        const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
        const weather = CONFIG.WEATHER[newWeather];
        
        this.current = newWeather;
        this.effect = { ...weather.effect };
        
        // 设置下次天气变化时间
        const duration = weather.duration;
        this.nextChange = Date.now() + (duration[0] + Math.random() * (duration[1] - duration[0])) * 1000;
    }
    
    applyEffects() {
        // 应用天气效果到游戏逻辑
    }
    
    getCurrentWeather() {
        return {
            id: this.current,
            ...CONFIG.WEATHER[this.current],
            effects: this.effect
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SkillSystem, ItemSystem, WeatherSystem };
}
