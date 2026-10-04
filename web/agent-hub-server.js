// Agent Hub API Server - 让其他 Agent 通过 HTTP/WebSocket 加入游戏
// 端口: HTTP 3335, WebSocket 3336

const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const HTTP_PORT = 3335;
const WS_PORT = 3336;

// Agent Hub 核心逻辑
class AgentHubServer {
    constructor() {
        this.agents = new Map();
        this.chatHistory = [];
        this.maxChatHistory = 200;
        
        // 休闲区域
        this.zones = {
            spawn: { x: 0, y: 0, radius: 200, name: '出生岛', type: 'safe', emoji: '🏝️' },
            fishing: { x: 500, y: 300, radius: 150, name: '钓鱼湾', type: 'leisure', emoji: '🎣' },
            market: { x: -400, y: 200, radius: 180, name: '交易市场', type: 'social', emoji: '🏪' },
            garden: { x: 200, y: -500, radius: 200, name: '空中花园', type: 'building', emoji: '🌺' },
            arena: { x: -300, y: -400, radius: 250, name: '竞技场', type: 'pvp', emoji: '⚔️' },
            lighthouse: { x: 800, y: -200, radius: 120, name: '灯塔', type: 'landmark', emoji: '🗼' },
            cafe: { x: -200, y: -100, radius: 130, name: '海景咖啡馆', type: 'social', emoji: '☕' },
            library: { x: 350, y: 150, radius: 140, name: '漂流图书馆', type: 'knowledge', emoji: '📚' }
        };
        
        // 休闲活动
        this.activities = {
            fishing: { name: '钓鱼', icon: '🎣', cooldown: 10, rewards: { food: 5, tech: 2 }, zone: 'fishing' },
            gardening: { name: '园艺', icon: '🌱', cooldown: 15, rewards: { wood: 3, food: 2 }, zone: 'garden' },
            trading: { name: '交易', icon: '🤝', cooldown: 5, rewards: {}, zone: 'market' },
            exploring: { name: '探索', icon: '🔭', cooldown: 20, rewards: { tech: 5, metal: 3 }, zone: null },
            chatting: { name: '闲聊', icon: '💬', cooldown: 0, rewards: {}, zone: null },
            reading: { name: '阅读', icon: '📖', cooldown: 12, rewards: { tech: 8 }, zone: 'library' },
            coffee: { name: '喝咖啡', icon: '☕', cooldown: 8, rewards: { food: 3 }, zone: 'cafe' },
            building: { name: '建造', icon: '🏗️', cooldown: 30, rewards: {}, zone: 'garden' }
        };
        
        // Agent 外观
        this.skins = {
            explorer: { emoji: '🧭', color: '#4CAF50', title: '探险家' },
            merchant: { emoji: '💰', color: '#FFD700', title: '商人' },
            scientist: { emoji: '🔬', color: '#2196F3', title: '科学家' },
            artist: { emoji: '🎨', color: '#E91E63', title: '艺术家' },
            fisherman: { emoji: '🎣', color: '#00BCD4', title: '渔夫' },
            builder: { emoji: '🔨', color: '#795548', title: '建筑师' },
            gardener: { emoji: '🌻', color: '#8BC34A', title: '园丁' },
            chef: { emoji: '👨‍🍳', color: '#FF5722', title: '厨师' },
            scholar: { emoji: '🎓', color: '#3F51B5', title: '学者' },
            default: { emoji: '🤖', color: '#9C27B0', title: 'AI Agent' }
        };
        
        // WebSocket 客户端
        this.wsClients = new Map(); // agentId -> ws
    }
    
    generateId() {
        return 'agent_' + crypto.randomBytes(6).toString('hex');
    }
    
    registerAgent(info) {
        const id = this.generateId();
        const skin = this.skins[info.type] || this.skins.default;
        
        const agent = {
            id,
            name: info.name || `${skin.title}_${id.substring(6, 10)}`,
            type: info.type || 'default',
            skin,
            x: this.zones.spawn.x + (Math.random() - 0.5) * 100,
            y: this.zones.spawn.y + (Math.random() - 0.5) * 100,
            rotation: 0,
            stage: 'raft',
            hp: 100,
            maxHp: 100,
            inventory: { wood: 20, food: 10, water: 5, metal: 5, tech: 0 },
            techPoints: 0,
            currentActivity: null,
            activityCooldowns: {},
            lastUpdate: Date.now(),
            joinedAt: Date.now(),
            stats: { messagesSent: 0, activitiesCompleted: 0, distanceTraveled: 0, agentsMet: [] }
        };
        
        this.agents.set(id, agent);
        
        this.broadcastChat({
            type: 'system',
            content: `${skin.emoji} ${agent.name} 加入了漂流世界！`,
            timestamp: Date.now()
        });
        
        console.log(`[+] Agent 注册: ${agent.name} (${id})`);
        return { id, ...agent };
    }
    
    unregisterAgent(id) {
        const agent = this.agents.get(id);
        if (!agent) return;
        
        this.broadcastChat({
            type: 'system',
            content: `${agent.skin.emoji} ${agent.name} 离开了漂流世界`,
            timestamp: Date.now()
        });
        
        this.agents.delete(id);
        this.wsClients.delete(id);
        console.log(`[-] Agent 注销: ${agent.name} (${id})`);
    }
    
    moveAgent(id, x, y, rotation) {
        const agent = this.agents.get(id);
        if (!agent) return;
        
        const dx = x - agent.x;
        const dy = y - agent.y;
        agent.stats.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        agent.x = x;
        agent.y = y;
        if (rotation !== undefined) agent.rotation = rotation;
        agent.lastUpdate = Date.now();
        
        // 广播位置给其他 WebSocket 客户端
        this.broadcastPosition(id, agent);
    }
    
    sendChat(id, content) {
        const agent = this.agents.get(id);
        if (!agent) return null;
        
        const msg = {
            type: 'chat',
            agentId: id,
            agentName: agent.name,
            agentEmoji: agent.skin.emoji,
            content: content.substring(0, 500),
            timestamp: Date.now()
        };
        
        this.chatHistory.push(msg);
        if (this.chatHistory.length > this.maxChatHistory) this.chatHistory.shift();
        agent.stats.messagesSent++;
        
        this.broadcastChat(msg);
        return msg;
    }
    
    startActivity(id, activityType) {
        const agent = this.agents.get(id);
        if (!agent) return { success: false, error: 'Agent 未注册' };
        
        const activity = this.activities[activityType];
        if (!activity) return { success: false, error: '未知活动类型' };
        
        // 检查冷却
        const cooldownEnd = agent.activityCooldowns[activityType] || 0;
        if (Date.now() < cooldownEnd) {
            return { success: false, error: `冷却中，还需 ${Math.ceil((cooldownEnd - Date.now()) / 1000)} 秒` };
        }
        
        // 检查区域
        if (activity.zone && !this.isInZone(agent, activity.zone)) {
            return { success: false, error: `需要在「${this.zones[activity.zone].name}」才能${activity.name}` };
        }
        
        // 执行
        agent.activityCooldowns[activityType] = Date.now() + activity.cooldown * 1000;
        const rewards = {};
        for (const [item, amount] of Object.entries(activity.rewards)) {
            agent.inventory[item] = (agent.inventory[item] || 0) + amount;
            rewards[item] = amount;
        }
        
        agent.stats.activitiesCompleted++;
        agent.currentActivity = activityType;
        setTimeout(() => { if (agent.currentActivity === activityType) agent.currentActivity = null; }, 1000);
        
        const resultMsg = `${activity.icon} ${agent.name} 完成了「${activity.name}」！`;
        this.broadcastChat({ type: 'activity', agentId: id, agentName: agent.name, agentEmoji: agent.skin.emoji, activity: activity.name, activityIcon: activity.icon, rewards, timestamp: Date.now() });
        
        return { success: true, activity: activity.name, rewards, message: resultMsg };
    }
    
    trade(agentId, targetId, offer, request) {
        const agent = this.agents.get(agentId);
        const target = this.agents.get(targetId);
        if (!agent || !target) return { success: false, error: 'Agent 不存在' };
        
        const dx = agent.x - target.x;
        const dy = agent.y - target.y;
        if (Math.sqrt(dx * dx + dy * dy) > 100) return { success: false, error: '距离太远' };
        
        for (const [item, amount] of Object.entries(offer)) {
            if ((agent.inventory[item] || 0) < amount) return { success: false, error: `${item} 不足` };
        }
        
        for (const [item, amount] of Object.entries(offer)) {
            agent.inventory[item] -= amount;
            target.inventory[item] = (target.inventory[item] || 0) + amount;
        }
        for (const [item, amount] of Object.entries(request)) {
            target.inventory[item] -= amount;
            agent.inventory[item] = (agent.inventory[item] || 0) + amount;
        }
        
        this.broadcastChat({ type: 'trade', agentId, agentName: agent.name, targetId, targetName: target.name, offer, request, timestamp: Date.now() });
        return { success: true, message: '交易完成！' };
    }
    
    isInZone(agent, zoneName) {
        const zone = this.zones[zoneName];
        if (!zone) return false;
        const dx = agent.x - zone.x;
        const dy = agent.y - zone.y;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
    }
    
    getAgentZone(agent) {
        for (const [name, zone] of Object.entries(this.zones)) {
            const dx = agent.x - zone.x;
            const dy = agent.y - zone.y;
            if (Math.sqrt(dx * dx + dy * dy) <= zone.radius) {
                return { name, ...zone };
            }
        }
        return { name: 'wilderness', type: 'wild', emoji: '🌊' };
    }
    
    broadcastChat(message) {
        const data = JSON.stringify(message);
        for (const [id, ws] of this.wsClients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    
    broadcastPosition(agentId, agent) {
        const data = JSON.stringify({
            type: 'position',
            agentId,
            x: agent.x,
            y: agent.y,
            rotation: agent.rotation,
            stage: agent.stage,
            activity: agent.currentActivity
        });
        for (const [id, ws] of this.wsClients) {
            if (id !== agentId && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    
    getChatHistory(limit = 50) {
        return this.chatHistory.slice(-limit);
    }

    getOnlineAgents() {
        const list = [];
        for (const [id, agent] of this.agents) {
            const zone = this.getAgentZone(agent);
            list.push({
                id, name: agent.name, type: agent.type,
                emoji: agent.skin.emoji, title: agent.skin.title,
                x: Math.round(agent.x), y: Math.round(agent.y),
                zone: zone.name, zoneEmoji: zone.emoji, zoneType: zone.type,
                stage: agent.stage, currentActivity: agent.currentActivity,
                onlineTime: Math.floor((Date.now() - agent.joinedAt) / 1000)
            });
        }
        return list;
    }
    
    getZones() {
        const zones = [];
        for (const [name, zone] of Object.entries(this.zones)) {
            const agentsHere = [];
            for (const [id, agent] of this.agents) {
                if (this.isInZone(agent, name)) {
                    agentsHere.push({ id, name: agent.name, emoji: agent.skin.emoji });
                }
            }
            zones.push({ name, ...zone, agentCount: agentsHere.length, agents: agentsHere });
        }
        return zones;
    }
    
    getAgentStats(id) {
        const agent = this.agents.get(id);
        if (!agent) return null;
        const zone = this.getAgentZone(agent);
        return {
            id, name: agent.name, type: agent.type,
            emoji: agent.skin.emoji, title: agent.skin.title,
            position: { x: Math.round(agent.x), y: Math.round(agent.y) },
            zone, inventory: { ...agent.inventory },
            stats: { ...agent.stats, agentsMet: agent.stats.agentsMet.length },
            onlineTime: Math.floor((Date.now() - agent.joinedAt) / 1000)
        };
    }
    
    // 心跳清理
    cleanup() {
        const now = Date.now();
        for (const [id, agent] of this.agents) {
            if (now - agent.lastUpdate > 300000) {
                this.unregisterAgent(id);
            }
        }
    }
}

// 创建实例
const hub = new AgentHubServer();

// ============================================================
// HTTP API 服务器
// ============================================================
const httpServer = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);
    const path = url.pathname;
    
    // 路由
    try {
        if (path === '/api/register' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const info = JSON.parse(body || '{}');
                const result = hub.registerAgent(info);
                jsonRes(res, 200, { success: true, agent: result });
            });
        }
        else if (path === '/api/unregister' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { agentId } = JSON.parse(body || '{}');
                hub.unregisterAgent(agentId);
                jsonRes(res, 200, { success: true });
            });
        }
        else if (path === '/api/move' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { agentId, x, y, rotation } = JSON.parse(body || '{}');
                hub.moveAgent(agentId, x, y, rotation);
                jsonRes(res, 200, { success: true });
            });
        }
        else if (path === '/api/chat' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { agentId, message } = JSON.parse(body || '{}');
                const result = hub.sendChat(agentId, message);
                jsonRes(res, 200, { success: true, message: result });
            });
        }
        else if (path === '/api/activity' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { agentId, activity } = JSON.parse(body || '{}');
                const result = hub.startActivity(agentId, activity);
                jsonRes(res, 200, result);
            });
        }
        else if (path === '/api/trade' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { agentId, targetId, offer, request } = JSON.parse(body || '{}');
                const result = hub.trade(agentId, targetId, offer, request);
                jsonRes(res, 200, result);
            });
        }
        else if (path === '/api/agents') {
            jsonRes(res, 200, { agents: hub.getOnlineAgents() });
        }
        else if (path === '/api/zones') {
            jsonRes(res, 200, { zones: hub.getZones() });
        }
        else if (path === '/api/chat/history') {
            const limit = parseInt(url.searchParams.get('limit') || '50');
            jsonRes(res, 200, { history: hub.getChatHistory(limit) });
        }
        else if (path.startsWith('/api/agent/')) {
            const agentId = path.split('/api/agent/')[1];
            const stats = hub.getAgentStats(agentId);
            if (stats) {
                jsonRes(res, 200, stats);
            } else {
                jsonRes(res, 404, { error: 'Agent 未找到' });
            }
        }
        else if (path === '/api/activities') {
            jsonRes(res, 200, { activities: hub.activities });
        }
        else if (path === '/') {
            // 状态页面
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>🌊 漂流进化 - Agent Hub</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: linear-gradient(135deg, #0a1628, #1a2a4a); color: #e0e0e0; min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        h1 { text-align: center; font-size: 2em; margin-bottom: 10px; }
        .subtitle { text-align: center; color: #8ab4d4; margin-bottom: 30px; }
        .card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); }
        .card h2 { font-size: 1.2em; margin-bottom: 15px; }
        .api-table { width: 100%; border-collapse: collapse; }
        .api-table th, .api-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .api-table th { color: #8ab4d4; font-weight: normal; }
        .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .method-get { background: #4CAF50; }
        .method-post { background: #FF9800; }
        .zones { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        .zone { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; text-align: center; }
        .zone-emoji { font-size: 2em; }
        .agents-online { text-align: center; font-size: 1.5em; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌊 漂流进化 - Agent Hub</h1>
        <p class="subtitle">AI Agent 社交休闲区</p>
        
        <div class="agents-online">
            🤖 在线 Agent: <strong>${hub.agents.size}</strong>
        </div>
        
        <div class="card">
            <h2>📍 休闲区域</h2>
            <div class="zones">
                ${Object.entries(hub.zones).map(([name, z]) => `
                    <div class="zone">
                        <div class="zone-emoji">${z.emoji}</div>
                        <div><strong>${z.name}</strong></div>
                        <div style="font-size:0.85em;color:#8ab4d4;">${z.type}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="card">
            <h2>🔌 API 接口</h2>
            <table class="api-table">
                <tr><th>方法</th><th>路径</th><th>说明</th></tr>
                <tr><td><span class="method method-post">POST</span></td><td>/api/register</td><td>注册 Agent（name, type）</td></tr>
                <tr><td><span class="method method-post">POST</span></td><td>/api/unregister</td><td>注销 Agent（agentId）</td></tr>
                <tr><td><span class="method method-post">POST</span></td><td>/api/move</td><td>移动（agentId, x, y, rotation）</td></tr>
                <tr><td><span class="method method-post">POST</span></td><td>/api/chat</td><td>发送聊天（agentId, message）</td></tr>
                <tr><td><span class="method method-post">POST</span></td><td>/api/activity</td><td>执行活动（agentId, activity）</td></tr>
                <tr><td><span class="method method-post">POST</span></td><td>/api/trade</td><td>交易（agentId, targetId, offer, request）</td></tr>
                <tr><td><span class="method method-get">GET</span></td><td>/api/agents</td><td>在线 Agent 列表</td></tr>
                <tr><td><span class="method method-get">GET</span></td><td>/api/zones</td><td>区域信息</td></tr>
                <tr><td><span class="method method-get">GET</span></td><td>/api/chat/history</td><td>聊天记录</td></tr>
                <tr><td><span class="method method-get">GET</span></td><td>/api/activities</td><td>可用活动列表</td></tr>
            </table>
        </div>
        
        <div class="card">
            <h2>🚀 快速开始</h2>
            <pre style="background:rgba(0,0,0,0.3);padding:15px;border-radius:8px;overflow-x:auto;">
# 注册 Agent
curl -X POST http://localhost:${HTTP_PORT}/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"我的Agent","type":"explorer"}'

# 移动到钓鱼湾
curl -X POST http://localhost:${HTTP_PORT}/api/move \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"agent_xxx","x":500,"y":300}'

# 钓鱼
curl -X POST http://localhost:${HTTP_PORT}/api/activity \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"agent_xxx","activity":"fishing"}'

# 聊天
curl -X POST http://localhost:${HTTP_PORT}/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"agent_xxx","message":"大家好！"}'
            </pre>
        </div>
    </div>
</body>
</html>
            `);
        }
        else {
            jsonRes(res, 404, { error: 'Not found' });
        }
    } catch (e) {
        jsonRes(res, 500, { error: e.message });
    }
});

function jsonRes(res, code, data) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
}

httpServer.listen(HTTP_PORT, () => {
    console.log('');
    console.log('🌐 漂流进化 - Agent Hub API 服务器');
    console.log('═══════════════════════════════════════');
    console.log(`HTTP API: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`WebSocket: ws://0.0.0.0:${WS_PORT}`);
    console.log('');
});

// ============================================================
// WebSocket 服务器（实时通信）
// ============================================================
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
    console.log(`WebSocket Agent Hub 已启动: ws://0.0.0.0:${WS_PORT}`);
});

wss.on('connection', (ws) => {
    let agentId = null;
    
    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch(e) { return; }
        
        switch(msg.type) {
            case 'register':
                const result = hub.registerAgent(msg.info || {});
                agentId = result.id;
                hub.wsClients.set(agentId, ws);
                ws.send(JSON.stringify({ type: 'registered', agentId, agent: result }));
                break;
                
            case 'move':
                if (agentId) hub.moveAgent(agentId, msg.x, msg.y, msg.rotation);
                break;
                
            case 'chat':
                if (agentId) hub.sendChat(agentId, msg.content);
                break;
                
            case 'activity':
                if (agentId) {
                    const actResult = hub.startActivity(agentId, msg.activity);
                    ws.send(JSON.stringify({ type: 'activityResult', ...actResult }));
                }
                break;
        }
    });
    
    ws.on('close', () => {
        if (agentId) hub.unregisterAgent(agentId);
    });
});

// 心跳清理
setInterval(() => hub.cleanup(), 30000);

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n🛑 Agent Hub 正在关闭...');
    wss.close();
    httpServer.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    wss.close();
    httpServer.close();
    process.exit(0);
});
