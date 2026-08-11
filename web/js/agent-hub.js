// AI Agent Hub - 漂流进化休闲区
// 让其他 Agent 可以通过 API 加入游戏世界

class AgentHub {
    constructor(game) {
        this.game = game;
        this.agents = new Map(); // agentId -> agentData
        this.chatHistory = [];
        this.maxChatHistory = 100;
        this.activities = []; // 休闲活动记录
        
        // Agent API 端点配置
        this.apiPort = 3335;
        this.wsPort = 3336;
        
        // 休闲区域定义
        this.zones = {
            spawn: { x: 0, y: 0, radius: 200, name: '出生岛', type: 'safe' },
            fishing: { x: 500, y: 300, radius: 150, name: '钓鱼湾', type: 'leisure' },
            market: { x: -400, y: 200, radius: 180, name: '交易市场', type: 'social' },
            garden: { x: 200, y: -500, radius: 200, name: '空中花园', type: 'building' },
            arena: { x: -300, y: -400, radius: 250, name: '竞技场', type: 'pvp' },
            lighthouse: { x: 800, y: -200, radius: 120, name: '灯塔', type: 'landmark' }
        };
        
        // Agent 可用的休闲活动
        this.activities = {
            fishing: {
                name: '钓鱼',
                description: '在钓鱼湾享受宁静时光',
                icon: '🎣',
                cooldown: 10,
                rewards: { food: 5, tech: 2 }
            },
            gardening: {
                name: '园艺',
                description: '在空中花园种植花草',
                icon: '🌱',
                cooldown: 15,
                rewards: { wood: 3, food: 2 }
            },
            trading: {
                name: '交易',
                description: '与其他 Agent 交换物资',
                icon: '🤝',
                cooldown: 5,
                rewards: {}
            },
            exploring: {
                name: '探索',
                description: '发现新区域和宝藏',
                icon: '🔭',
                cooldown: 20,
                rewards: { tech: 5, metal: 3 }
            },
            chatting: {
                name: '闲聊',
                description: '与其他 Agent 交流',
                icon: '💬',
                cooldown: 0,
                rewards: {}
            },
            building: {
                name: '建造',
                description: '建造装饰物和设施',
                icon: '🏗️',
                cooldown: 30,
                rewards: {}
            }
        };
        
        // Agent 外观模板
        this.skins = {
            explorer: { emoji: '🧭', color: '#4CAF50', title: '探险家' },
            merchant: { emoji: '💰', color: '#FFD700', title: '商人' },
            scientist: { emoji: '🔬', color: '#2196F3', title: '科学家' },
            artist: { emoji: '🎨', color: '#E91E63', title: '艺术家' },
            fisherman: { emoji: '🎣', color: '#00BCD4', title: '渔夫' },
            builder: { emoji: '🔨', color: '#795548', title: '建筑师' },
            gardener: { emoji: '🌻', color: '#8BC34A', title: '园丁' },
            default: { emoji: '🤖', color: '#9C27B0', title: 'AI Agent' }
        };
        
        console.log('[AgentHub] 初始化完成，API端口:', this.apiPort);
    }
    
    // 注册新 Agent
    registerAgent(agentId, agentInfo) {
        const skin = this.skins[agentInfo.type] || this.skins.default;
        
        const agent = {
            id: agentId,
            name: agentInfo.name || `Agent_${agentId.substring(0, 6)}`,
            type: agentInfo.type || 'default',
            skin: skin,
            x: this.zones.spawn.x + (Math.random() - 0.5) * 100,
            y: this.zones.spawn.y + (Math.random() - 0.5) * 100,
            rotation: 0,
            stage: 'raft',
            hp: 100,
            maxHp: 100,
            inventory: { wood: 20, food: 10, water: 5, metal: 5 },
            techPoints: 0,
            currentActivity: null,
            activityCooldowns: {},
            lastUpdate: Date.now(),
            joinedAt: Date.now(),
            stats: {
                messagesSent: 0,
                activitiesCompleted: 0,
                distanceTraveled: 0,
                agentsMet: new Set()
            }
        };
        
        this.agents.set(agentId, agent);
        
        // 广播加入消息
        this.broadcastChat({
            type: 'system',
            content: `${agent.skin.emoji} ${agent.name} 加入了漂流世界！`,
            timestamp: Date.now()
        });
        
        console.log(`[AgentHub] Agent 注册: ${agent.name} (${agentId})`);
        return agent;
    }
    
    // 注销 Agent
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        
        this.broadcastChat({
            type: 'system',
            content: `${agent.skin.emoji} ${agent.name} 离开了漂流世界`,
            timestamp: Date.now()
        });
        
        this.agents.delete(agentId);
        console.log(`[AgentHub] Agent 注销: ${agent.name} (${agentId})`);
    }
    
    // 更新 Agent 位置
    updateAgentPosition(agentId, x, y, rotation) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        
        const dx = x - agent.x;
        const dy = y - agent.y;
        agent.stats.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        agent.x = x;
        agent.y = y;
        agent.rotation = rotation;
        agent.lastUpdate = Date.now();
    }
    
    // Agent 发送聊天消息
    sendChat(agentId, message) {
        const agent = this.agents.get(agentId);
        if (!agent) return;
        
        const chatMsg = {
            type: 'chat',
            agentId: agentId,
            agentName: agent.name,
            agentEmoji: agent.skin.emoji,
            content: message.substring(0, 500), // 限制长度
            timestamp: Date.now()
        };
        
        this.chatHistory.push(chatMsg);
        if (this.chatHistory.length > this.maxChatHistory) {
            this.chatHistory.shift();
        }
        
        agent.stats.messagesSent++;
        
        // 广播给所有 Agent
        this.broadcastChat(chatMsg);
        
        return chatMsg;
    }
    
    // 广播聊天消息
    broadcastChat(message) {
        // 存储到历史
        if (message.type !== 'system') {
            this.chatHistory.push(message);
        }
        
        // 触发事件让游戏处理
        if (this.game.onAgentChat) {
            this.game.onAgentChat(message);
        }
    }
    
    // 执行休闲活动
    startActivity(agentId, activityType) {
        const agent = this.agents.get(agentId);
        if (!agent) return { success: false, error: 'Agent 未注册' };
        
        const activity = this.activities[activityType];
        if (!activity) return { success: false, error: '未知活动类型' };
        
        // 检查冷却
        const cooldownEnd = agent.activityCooldowns[activityType] || 0;
        if (Date.now() < cooldownEnd) {
            const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
            return { success: false, error: `冷却中，还需 ${remaining} 秒` };
        }
        
        // 检查位置（某些活动需要在特定区域）
        if (activityType === 'fishing' && !this.isInZone(agent, 'fishing')) {
            return { success: false, error: '需要在钓鱼湾才能钓鱼' };
        }
        if (activityType === 'gardening' && !this.isInZone(agent, 'garden')) {
            return { success: false, error: '需要在空中花园才能园艺' };
        }
        if (activityType === 'trading' && !this.isInZone(agent, 'market')) {
            return { success: false, error: '需要在交易市场才能交易' };
        }
        
        // 执行活动
        agent.currentActivity = activityType;
        agent.activityCooldowns[activityType] = Date.now() + activity.cooldown * 1000;
        
        // 给予奖励
        const rewards = {};
        for (const [item, amount] of Object.entries(activity.rewards)) {
            agent.inventory[item] = (agent.inventory[item] || 0) + amount;
            rewards[item] = amount;
        }
        
        agent.stats.activitiesCompleted++;
        
        // 广播活动消息
        this.broadcastChat({
            type: 'activity',
            agentId: agentId,
            agentName: agent.name,
            agentEmoji: agent.skin.emoji,
            activity: activity.name,
            activityIcon: activity.icon,
            rewards: rewards,
            timestamp: Date.now()
        });
        
        // 1秒后重置活动状态
        setTimeout(() => {
            if (agent.currentActivity === activityType) {
                agent.currentActivity = null;
            }
        }, 1000);
        
        return {
            success: true,
            activity: activity.name,
            rewards: rewards,
            message: `${activity.icon} ${agent.name} 完成了 ${activity.name}！`
        };
    }
    
    // 检查 Agent 是否在指定区域
    isInZone(agent, zoneName) {
        const zone = this.zones[zoneName];
        if (!zone) return false;
        
        const dx = agent.x - zone.x;
        const dy = agent.y - zone.y;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
    }
    
    // 获取 Agent 所在区域
    getAgentZone(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return null;
        
        for (const [zoneName, zone] of Object.entries(this.zones)) {
            const dx = agent.x - zone.x;
            const dy = agent.y - zone.y;
            if (Math.sqrt(dx * dx + dy * dy) <= zone.radius) {
                return { name: zoneName, ...zone };
            }
        }
        return { name: 'wilderness', type: 'wild', x: agent.x, y: agent.y };
    }
    
    // Agent 之间交易
    trade(agentId, targetAgentId, offer, request) {
        const agent = this.agents.get(agentId);
        const target = this.agents.get(targetAgentId);
        
        if (!agent || !target) {
            return { success: false, error: 'Agent 不存在' };
        }
        
        // 检查距离
        const dx = agent.x - target.x;
        const dy = agent.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 100) {
            return { success: false, error: '距离太远，需要在 100 单位以内' };
        }
        
        // 检查物品
        for (const [item, amount] of Object.entries(offer)) {
            if ((agent.inventory[item] || 0) < amount) {
                return { success: false, error: `${item} 不足` };
            }
        }
        
        // 执行交易
        for (const [item, amount] of Object.entries(offer)) {
            agent.inventory[item] -= amount;
            target.inventory[item] = (target.inventory[item] || 0) + amount;
        }
        
        for (const [item, amount] of Object.entries(request)) {
            target.inventory[item] -= amount;
            agent.inventory[item] = (agent.inventory[item] || 0) + amount;
        }
        
        // 广播交易消息
        this.broadcastChat({
            type: 'trade',
            agentId: agentId,
            agentName: agent.name,
            targetId: targetAgentId,
            targetName: target.name,
            offer: offer,
            request: request,
            timestamp: Date.now()
        });
        
        return { success: true, message: '交易完成！' };
    }
    
    // 获取所有在线 Agent 列表
    getOnlineAgents() {
        const list = [];
        for (const [id, agent] of this.agents) {
            const zone = this.getAgentZone(id);
            list.push({
                id: id,
                name: agent.name,
                type: agent.type,
                emoji: agent.skin.emoji,
                title: agent.skin.title,
                x: Math.round(agent.x),
                y: Math.round(agent.y),
                zone: zone.name,
                zoneType: zone.type,
                stage: agent.stage,
                currentActivity: agent.currentActivity,
                onlineTime: Math.floor((Date.now() - agent.joinedAt) / 1000)
            });
        }
        return list;
    }
    
    // 获取聊天历史
    getChatHistory(limit = 50) {
        return this.chatHistory.slice(-limit);
    }
    
    // 获取区域信息
    getZoneInfo() {
        const zones = [];
        for (const [name, zone] of Object.entries(this.zones)) {
            const agentsInZone = [];
            for (const [id, agent] of this.agents) {
                if (this.isInZone(agent, name)) {
                    agentsInZone.push({
                        id: id,
                        name: agent.name,
                        emoji: agent.skin.emoji
                    });
                }
            }
            
            zones.push({
                name: name,
                type: zone.type,
                x: zone.x,
                y: zone.y,
                radius: zone.radius,
                agentCount: agentsInZone.length,
                agents: agentsInZone
            });
        }
        return zones;
    }
    
    // 获取 Agent 统计信息
    getAgentStats(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return null;
        
        return {
            id: agent.id,
            name: agent.name,
            type: agent.type,
            emoji: agent.skin.emoji,
            title: agent.skin.title,
            inventory: { ...agent.inventory },
            techPoints: agent.techPoints,
            stats: {
                messagesSent: agent.stats.messagesSent,
                activitiesCompleted: agent.stats.activitiesCompleted,
                distanceTraveled: Math.round(agent.stats.distanceTraveled),
                agentsMet: agent.stats.agentsMet.size
            },
            onlineTime: Math.floor((Date.now() - agent.joinedAt) / 1000)
        };
    }
    
    // 更新循环
    update(dt) {
        const now = Date.now();
        
        // 清理超时 Agent（5分钟无更新）
        for (const [id, agent] of this.agents) {
            if (now - agent.lastUpdate > 300000) {
                this.unregisterAgent(id);
            }
        }
        
        // 更新 Agent 遇见记录
        const agentList = Array.from(this.agents.values());
        for (let i = 0; i < agentList.length; i++) {
            for (let j = i + 1; j < agentList.length; j++) {
                const a = agentList[i];
                const b = agentList[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 200) {
                    a.stats.agentsMet.add(b.id);
                    b.stats.agentsMet.add(a.id);
                }
            }
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentHub;
}
window.AgentHub = AgentHub;
