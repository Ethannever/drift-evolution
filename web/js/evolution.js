// 进化系统 - Web版

class EvolutionSystem {
    constructor() {
        this.ai = new AIService();
    }
    
    // 获取可用进化
    getAvailableEvolutions(player) {
        const currentStage = CONFIG.STAGES[player.stage];
        if (!currentStage || !currentStage.next || currentStage.next.length === 0) {
            return [];
        }
        
        const evolutions = [];
        
        for (const nextStage of currentStage.next) {
            const stageData = CONFIG.STAGES[nextStage];
            const cost = CONFIG.EVOLUTION_COSTS[nextStage];
            
            if (!stageData || !cost) continue;
            
            // 检查是否可以进化
            const canEvolve = this.canEvolve(player, nextStage);
            
            evolutions.push({
                stage: nextStage,
                name: stageData.name,
                description: stageData.description,
                cost: cost,
                stats: {
                    hp: stageData.hp,
                    speed: stageData.speed,
                    cargo: stageData.cargo
                },
                canEvolve: canEvolve.canEvolve,
                reason: canEvolve.reason
            });
        }
        
        return evolutions;
    }
    
    // 检查是否可以进化
    canEvolve(player, targetStage) {
        const currentStage = CONFIG.STAGES[player.stage];
        if (!currentStage || !currentStage.next.includes(targetStage)) {
            return { canEvolve: false, reason: '当前阶段无法进化到此阶段' };
        }
        
        const cost = CONFIG.EVOLUTION_COSTS[targetStage];
        if (!cost) {
            return { canEvolve: false, reason: '进化配置不存在' };
        }
        
        // 检查物资
        for (const [resource, amount] of Object.entries(cost)) {
            if (resource === 'tech') {
                if (player.techPoints < amount) {
                    return { 
                        canEvolve: false, 
                        reason: `科技点不足 (需要 ${amount}, 当前 ${player.techPoints})` 
                    };
                }
            } else {
                if ((player.inventory[resource] || 0) < amount) {
                    return { 
                        canEvolve: false, 
                        reason: `${this.getResourceName(resource)}不足 (需要 ${amount}, 当前 ${player.inventory[resource] || 0})` 
                    };
                }
            }
        }
        
        return { canEvolve: true };
    }
    
    // 执行进化
    evolve(player, targetStage) {
        const check = this.canEvolve(player, targetStage);
        if (!check.canEvolve) {
            return { success: false, reason: check.reason };
        }
        
        const cost = CONFIG.EVOLUTION_COSTS[targetStage];
        
        // 消耗物资
        for (const [resource, amount] of Object.entries(cost)) {
            if (resource === 'tech') {
                player.techPoints -= amount;
            } else {
                player.inventory[resource] -= amount;
            }
        }
        
        // 执行进化
        const oldStage = player.stage;
        player.evolve(targetStage);
        
        // 生成AI事件
        const event = this.ai.generateEvent({ situation: '进化', stage: targetStage });
        
        return {
            success: true,
            from: oldStage,
            to: targetStage,
            event: event
        };
    }
    
    // 获取资源中文名
    getResourceName(resource) {
        const names = {
            wood: '木材',
            metal: '金属',
            cloth: '布料',
            food: '食物',
            water: '淡水',
            fuel: '燃料',
            rope: '绳索',
            electronic: '电子元件',
            tech: '科技点'
        };
        return names[resource] || resource;
    }
    
    // 获取科技树数据
    getTechTree(currentStage) {
        const lines = {
            ocean: {
                name: '🌊 海洋线',
                stages: ['raft', 'canoe', 'fisher', 'gunboat', 'destroyer', 'cruiser', 'carrier'],
                unlocked: true
            },
            land: {
                name: '🚗 陆地线',
                stages: ['cart', 'wagon', 'car', 'truck', 'tank'],
                unlocked: false
            },
            sky: {
                name: '✈️ 天空线',
                stages: ['glider', 'biplane', 'jet', 'stealth', 'mech'],
                unlocked: false
            }
        };
        
        // 判断解锁状态
        const stageOrder = ['raft', 'canoe', 'fisher', 'gunboat', 'destroyer', 'cruiser', 'carrier'];
        const currentIndex = stageOrder.indexOf(currentStage);
        
        return lines;
    }
    
    // 判断阶段状态
    getStageStatus(stage, currentStage) {
        const stageOrder = ['raft', 'canoe', 'fisher', 'gunboat', 'destroyer', 'cruiser', 'carrier'];
        const stageIndex = stageOrder.indexOf(stage);
        const currentIndex = stageOrder.indexOf(currentStage);
        
        if (stage === currentStage) {
            return 'current';
        } else if (stageIndex <= currentIndex) {
            return 'unlocked';
        } else if (stageIndex === currentIndex + 1) {
            return 'available';
        } else {
            return 'locked';
        }
    }
}

window.EvolutionSystem = EvolutionSystem;
