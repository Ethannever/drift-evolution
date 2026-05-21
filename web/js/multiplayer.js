// Multiplayer Client - Drift Evolution
class MultiplayerClient {
    constructor() {
        this.ws = null; this.connected = false; this.playerId = null; this.nickname = '';
        this.otherPlayers = new Map();
        this.host = window.location.hostname || 'localhost';
        this.port = 3334;
        this.url = 'ws://' + this.host + ':' + this.port;
        this.reconnectDelay = 3000; this.reconnectTimer = null; this.shouldReconnect = true;
        this.lastSendTime = 0; this.sendInterval = 50;
        this.onConnect = null; this.onDisconnect = null;
        this.onPlayerJoin = null; this.onPlayerLeave = null;
        this.onHit = null; this.onKill = null;
        this.playerCount = 0;
    }
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
        this.shouldReconnect = true;
        try {
            console.log('[MP] Connecting: ' + this.url);
            this.ws = new WebSocket(this.url);
            this.ws.onopen = () => { this.connected = true; console.log('[MP] Connected'); if (this.onConnect) this.onConnect(); };
            this.ws.onmessage = (ev) => { this._handleMessage(ev.data); };
            this.ws.onclose = () => { this.connected = false; this.otherPlayers.clear(); this.playerCount = 0; if (this.onDisconnect) this.onDisconnect(); this._scheduleReconnect(); };
            this.ws.onerror = () => {};
        } catch(e) { this._scheduleReconnect(); }
    }
    disconnect() {
        this.shouldReconnect = false; clearTimeout(this.reconnectTimer);
        if (this.ws) { this.ws.close(); this.ws = null; }
        this.connected = false; this.otherPlayers.clear(); this.playerCount = 0;
    }
    sendUpdate(player) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const now = Date.now(); if (now - this.lastSendTime < this.sendInterval) return; this.lastSendTime = now;
        const weapon = player.getCurrentWeapon ? player.getCurrentWeapon() : null;
        this.ws.send(JSON.stringify({
            type:'update', x:Math.round(player.x*10)/10, y:Math.round(player.y*10)/10,
            rotation:Math.round(player.rotation*1000)/1000, stage:player.stage,
            hp:Math.round(player.hp), nickname:this.nickname, weapon:weapon?weapon.name:'none'
        }));
    }
    sendHit(targetId, damage) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({type:'hit',targetId:targetId,damage:damage||10}));
    }
    sendKill(victimId) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({type:'kill',victimId:victimId}));
    }
    getOtherPlayers() { return this.otherPlayers; }
    _handleMessage(data) {
        let msg; try { msg = JSON.parse(data); } catch(e) { return; }
        switch(msg.type) {
            case 'join':
                if (msg.id && !this.playerId) { this.playerId = msg.id; this.nickname = msg.nickname; console.log('[MP] You: '+this.nickname); }
                else if (msg.id !== this.playerId) {
                    this.otherPlayers.set(msg.id,{id:msg.id,nickname:msg.nickname,stage:msg.stage||'raft',x:0,y:0,rotation:0,hp:80,weapon:'none',lastUpdate:Date.now()});
                    this.playerCount = this.otherPlayers.size+1; if(this.onPlayerJoin) this.onPlayerJoin(msg);
                }
                break;
            case 'leave':
                const lp = this.otherPlayers.get(msg.id);
                this.otherPlayers.delete(msg.id); this.playerCount = this.otherPlayers.size+1;
                if (lp && this.onPlayerLeave) this.onPlayerLeave(msg);
                break;
            case 'update':
                if (msg.id === this.playerId) return;
                const ex = this.otherPlayers.get(msg.id);
                if (ex) { ex.targetX=msg.x; ex.targetY=msg.y; ex.targetRotation=msg.rotation; ex.stage=msg.stage; ex.hp=msg.hp; ex.nickname=msg.nickname||ex.nickname; ex.weapon=msg.weapon; ex.lastUpdate=Date.now(); }
                else { this.otherPlayers.set(msg.id,{id:msg.id,nickname:msg.nickname||'?',stage:msg.stage||'raft',x:msg.x,y:msg.y,targetX:msg.x,targetY:msg.y,rotation:msg.rotation,targetRotation:msg.rotation,hp:msg.hp,weapon:msg.weapon,lastUpdate:Date.now()}); this.playerCount=this.otherPlayers.size+1; }
                break;
            case 'players':
                if (msg.players) { for(const p of msg.players){ if(p.id===this.playerId) continue; this.otherPlayers.set(p.id,{id:p.id,nickname:p.nickname,stage:p.stage||'raft',x:p.x,y:p.y,targetX:p.x,targetY:p.y,rotation:p.rotation,targetRotation:p.rotation,hp:p.hp,weapon:p.weapon,lastUpdate:Date.now()}); } this.playerCount=this.otherPlayers.size+1; }
                break;
            case 'hit': if(this.onHit) this.onHit(msg); break;
            case 'kill': if(this.onKill) this.onKill(msg); break;
        }
    }
    updatePositions(dt) {
        const s = 8;
        for(const[id,p] of this.otherPlayers){
            if(p.targetX!==undefined){p.x+=(p.targetX-p.x)*Math.min(1,s*dt);p.y+=(p.targetY-p.y)*Math.min(1,s*dt);}
            if(p.targetRotation!==undefined){let d=p.targetRotation-p.rotation;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;p.rotation+=d*Math.min(1,s*dt);}
            if(Date.now()-p.lastUpdate>60000) this.otherPlayers.delete(id);
        }
    }
    _scheduleReconnect() {
        if(!this.shouldReconnect) return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => { if(!this.connected&&this.shouldReconnect){console.log('[MP] Reconnecting...');this.connect();} }, this.reconnectDelay);
    }
}
window.MultiplayerClient = MultiplayerClient;
