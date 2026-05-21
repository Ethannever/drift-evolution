// ============================================================
// 漂流进化 - 多人模式 WebSocket 服务器
// 端口: 3334
// ============================================================

const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = 3334;
const HEARTBEAT_TIMEOUT = 30000; // 30秒心跳超时

// 房间管理
const rooms = new Map();
rooms.set('default', { players: new Map() });

// 玩家 ID -> WebSocket 映射
const clients = new Map();

// 昵称后缀池
const HEX_CHARS = '0123456789ABCDEF';

function generateNickname() {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
        suffix += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
    }
    return `漂流者${suffix}`;
}

function generateId() {
    return crypto.randomBytes(8).toString('hex');
}

// 广播消息给房间内所有玩家（可排除发送者）
function broadcast(roomName, message, excludeId) {
    const room = rooms.get(roomName);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const [id, player] of room.players) {
        if (id === excludeId) continue;
        const ws = clients.get(id);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    }
}

// 获取房间内所有玩家列表
function getPlayerList(roomName) {
    const room = rooms.get(roomName);
    if (!room) return [];

    const list = [];
    for (const [id, p] of room.players) {
        list.push({
            id,
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            stage: p.stage,
            hp: p.hp,
            nickname: p.nickname,
            weapon: p.weapon
        });
    }
    return list;
}

// ============================================================
// WebSocket 服务器启动
// ============================================================
const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log('');
    console.log('🌐 漂流进化 - 多人模式服务器');
    console.log('═══════════════════════════════════════');
    console.log(`WebSocket 服务器已启动: ws://0.0.0.0:${PORT}`);
    console.log('等待玩家连接...');
    console.log('');
});

wss.on('connection', (ws) => {
    const playerId = generateId();
    const nickname = generateNickname();
    const roomName = 'default';

    // 确保默认房间存在
    if (!rooms.has(roomName)) {
        rooms.set(roomName, { players: new Map() });
    }
    const room = rooms.get(roomName);

    // 注册玩家
    const playerData = {
        id: playerId,
        nickname,
        stage: 'raft',
        x: 0,
        y: 0,
        rotation: 0,
        hp: 80,
        weapon: 'none',
        lastSeen: Date.now()
    };

    room.players.set(playerId, playerData);
    clients.set(playerId, ws);

    console.log(`[+] ${nickname} (${playerId}) 加入房间 "${roomName}" | 当前人数: ${room.players.size}`);

    // 发送 join 消息给新玩家自身（包含 id 和 nickname）
    ws.send(JSON.stringify({
        type: 'join',
        id: playerId,
        nickname: nickname,
        stage: 'raft'
    }));

    // 发送当前房间内所有玩家列表给新玩家
    ws.send(JSON.stringify({
        type: 'players',
        players: getPlayerList(roomName)
    }));

    // 广播 join 给房间内其他玩家
    broadcast(roomName, {
        type: 'join',
        id: playerId,
        nickname: nickname,
        stage: 'raft'
    }, playerId);

    // ============================================================
    // 消息处理
    // ============================================================
    ws.on('message', (raw) => {
        playerData.lastSeen = Date.now();

        let msg;
        try {
            msg = JSON.parse(raw);
        } catch (e) {
            return; // 忽略无效消息
        }

        switch (msg.type) {
            case 'update':
                // 更新玩家状态
                playerData.x = msg.x || 0;
                playerData.y = msg.y || 0;
                playerData.rotation = msg.rotation || 0;
                playerData.stage = msg.stage || 'raft';
                playerData.hp = msg.hp || 0;
                playerData.weapon = msg.weapon || 'none';
                if (msg.nickname) playerData.nickname = msg.nickname;

                // 广播给其他玩家
                broadcast(roomName, {
                    type: 'update',
                    id: playerId,
                    x: playerData.x,
                    y: playerData.y,
                    rotation: playerData.rotation,
                    stage: playerData.stage,
                    hp: playerData.hp,
                    nickname: playerData.nickname,
                    weapon: playerData.weapon
                }, playerId);
                break;

            case 'hit':
                // 命中消息：转发给目标玩家
                broadcast(roomName, {
                    type: 'hit',
                    attackerId: playerId,
                    targetId: msg.targetId,
                    damage: msg.damage || 10
                }, null); // 发给所有人（包括目标）
                break;

            case 'kill':
                // 击杀消息：广播
                broadcast(roomName, {
                    type: 'kill',
                    killerId: playerId,
                    victimId: msg.victimId
                }, null);
                break;

            case 'chat':
                // 聊天消息（预留）
                broadcast(roomName, {
                    type: 'chat',
                    id: playerId,
                    nickname: playerData.nickname,
                    text: (msg.text || '').substring(0, 200) // 限制长度
                }, null);
                break;

            default:
                // 忽略未知类型
                break;
        }
    });

    // ============================================================
    // 断开连接
    // ============================================================
    ws.on('close', () => {
        room.players.delete(playerId);
        clients.delete(playerId);

        console.log(`[-] ${nickname} (${playerId}) 离开房间 "${roomName}" | 剩余人数: ${room.players.size}`);

        // 广播 leave
        broadcast(roomName, {
            type: 'leave',
            id: playerId
        }, playerId);
    });

    ws.on('error', (err) => {
        console.error(`[!] WebSocket 错误 (${nickname}):`, err.message);
    });
});

// ============================================================
// 心跳检测 - 30秒无消息断开
// ============================================================
setInterval(() => {
    const now = Date.now();
    for (const [roomName, room] of rooms) {
        for (const [id, player] of room.players) {
            if (now - player.lastSeen > HEARTBEAT_TIMEOUT) {
                console.log(`[⏰] ${player.nickname} (${id}) 心跳超时，断开连接`);
                const ws = clients.get(id);
                if (ws) {
                    ws.terminate();
                }
                room.players.delete(id);
                clients.delete(id);

                broadcast(roomName, {
                    type: 'leave',
                    id: id
                }, id);
            }
        }
    }
}, 10000); // 每10秒检查一次

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n🛑 多人服务器正在关闭...');
    wss.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    wss.close(() => process.exit(0));
});
