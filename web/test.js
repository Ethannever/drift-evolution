// 游戏测试 - 使用vm.Script
const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('🧪 漂流进化 - Web版测试\n');

const gameDir = __dirname;
const jsDir = path.join(gameDir, 'js');
const loadCode = (file) => fs.readFileSync(path.join(jsDir, file), 'utf8');

// 创建沙箱环境
const createSandbox = () => {
    const elements = {};
    const sandbox = {
        console,
        Math, Date, Object, Array, String, JSON, Map, Set,
        performance: { now: () => Date.now() },
        CONFIG: {
            SETTINGS: { spawnInterval: 30000, spawnDistance: 400, invulnerabilityTime: 500, driftStrength: 10 },
            STAGES: { raft: { name:'木筏', hp:50, speed:100, cargo:5, defense:0, size:{width:48,height:32} } },
            ENEMIES: { shark: { name:'鲨鱼', hp:30, damage:15, speed:80, width:40, height:25, behavior:'aggressive' } },
            WEAPONS: {}, ITEMS: {}
        },
        document: {
            getElementById: (id) => elements[id] || (elements[id] = {
                classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false, toggle: ()=>{} },
                addEventListener: ()=>{}, textContent: '', value: '', innerHTML: '', style: {},
                getContext: ()=>({ fillRect:()=>{}, clearRect:()=>{}, translate:()=>{}, rotate:()=>{}, scale:()=>{}, fill:()=>{}, save:()=>{}, restore:()=>{}, beginPath:()=>{}, arc:()=>{}, lineTo:()=>{}, moveTo:()=>{}, stroke:()=>{}, fillText:()=>{}, font:'', textAlign:'', drawImage:()=>{}, createLinearGradient:()=>({addColorStop:()=>{}}), fillStyle:'', strokeStyle:'', lineWidth:0 })
            }),
            querySelectorAll: ()=>({length:0}), createElement: ()=>({getContext:()=>({}), width:800, height:600})
        },
        window: { innerWidth:800, innerHeight:600, addEventListener:()=>{}, requestAnimationFrame:(cb)=>{setTimeout(()=>cb(16),0);return 1;}, location:{pathname:'/game/'}},
        setTimeout, setInterval, clearTimeout, clearInterval,
        isNaN, isFinite, parseInt, parseFloat, encodeURI, decodeURI
    };
    vm.createContext(sandbox);
    return sandbox;
};

// 测试1: 执行所有模块
console.log('📁 测试1: 加载模块');
const sandbox = createSandbox();
const files = ['config.js', 'ai.js', 'player.js', 'enemy.js', 'combat.js', 'evolution.js', 'game.js'];

for (const file of files) {
    try {
        let code = loadCode(file);
        // 包装代码使其可以运行
        code = `void function() { ${code} }()`;
        new vm.Script(code).runInContext(sandbox);
        console.log(`  ✅ ${file}`);
    } catch (e) {
        console.log(`  ❌ ${file}: ${e.message}`);
    }
}

// 测试2: 游戏逻辑
console.log('\n🎮 测试2: 游戏逻辑');
try {
    const Game = sandbox.Game;
    console.log(`  Game类: ${typeof Game}`);
    
    const game = new Game();
    console.log(`  ✅ Game实例化, 状态: ${game.state}`);
    
    game.startGame();
    console.log(`  ✅ startGame(), 状态: ${game.state}, HP: ${game.player.hp}/${game.player.maxHp}`);
    
    // 运行10帧
    for (let i = 0; i < 10; i++) {
        game.gameLoop(performance.now() + 16);
    }
    console.log(`  ✅ 10帧后 - 状态: ${game.state}, HP: ${game.player.hp}, 敌人: ${game.enemies.length}`);
    
    game.gameOver();
    console.log(`  ✅ gameOver(), 状态: ${game.state}`);
    
    game.startGame();
    console.log(`  ✅ 重新开始, 状态: ${game.state}, HP: ${game.player.hp}`);
    
} catch (e) {
    console.log(`  ❌ 错误: ${e.message}`);
    console.log(e.stack.split('\n').slice(0,5).join('\n'));
}

// 测试3: 碰撞
console.log('\n💥 测试3: 碰撞与伤害');
try {
    const Player = sandbox.Player;
    const Enemy = sandbox.Enemy;
    
    const p = new Player(400, 300);
    const e = new Enemy(400, 300, 'shark');
    console.log(`  同位置碰撞: ${e.collidesWith(p)} (预期: true)`);
    
    const far = new Enemy(1000, 1000, 'shark');
    console.log(`  远处碰撞: ${far.collidesWith(p)} (预期: false)`);
    
    const hp = p.hp;
    p.takeDamage(10, e);
    console.log(`  受伤: ${hp} -> ${p.hp} (损失${hp-p.hp}, 预期: 10-0=${10})`);
    
    console.log(`  无敌时间: ${p.isInvulnerable} (预期: true)`);
    
} catch (e) {
    console.log(`  ❌ 错误: ${e.message}`);
}

console.log('\n📊 测试完成!\n');
