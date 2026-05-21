// 主游戏逻辑 - 漂流进化 Web版

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏状态
        this.state = 'menu'; // menu, playing, paused, gameover
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.combat = new CombatSystem();
        this.evolution = new EvolutionSystem();
        this.ai = new AIService();
        
        // 新系统：音效、粒子、任务
        this.sound = new SoundSystem();
        this.particles = new ParticleSystem();
        this.quests = new QuestSystem();

        // 多人模式
        this.multiplayer = new MultiplayerClient();
        this.multiplayerSendTimer = 0;

        // 船载 Agent
        this.companion = null;

        // 技能/道具/天气系统
        this.skillSystem = null;
        this.itemSystem = null;
        this.weatherSystem = null;
        
        // 输入状态
        this.keys = { up: false, down: false, left: false, right: false };
        this.mouse = { x: 0, y: 0, down: false };
        
        // 洋流
        this.drift = { x: 0, y: 0 };
        this.driftTimer = 0;
        
        // 敌人生成
        this.spawnTimer = 0;
        this.spawnResourceNodeTimer = 0;
        this.spawnTreasureTimer = 0;
        this.spawnRockTimer = 0;
        this.spawnCurrentZoneTimer = 0;
        
        // Bug报告
        this.bugPoints = 0;
        this.reportedBugs = [];
        
        // 世界偏移（相机）
        this.camera = { x: 0, y: 0 };
        
        // 游戏时间（秒）
        this.gameTime = 0;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 设置画布大小
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 输入事件
        this.setupInput();
        
        // UI事件
        this.setupUI();
        
        // 开始游戏循环 (RAF + setInterval fallback for WeChat)
        this._loopStarted = false;
        this._rafId = requestAnimationFrame((t) => {
            this._loopStarted = true;
            this.gameLoop(t);
        });
        
        // Fallback: if RAF doesn't fire within 500ms, use setInterval
        setTimeout(() => {
            if (!this._loopStarted || this.gameTime < 0.1) {
                console.log('⚠️ requestAnimationFrame fallback: using setInterval');
                this._useInterval = true;
                this._intervalId = setInterval(() => {
                    this.gameLoop(performance.now());
                }, 16);
            }
        }, 500);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupInput() {
        // 键盘
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing') return;
            
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.keys.up = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.down = true;
                    break;
                case 'a':
                case 'arrowleft':
                    this.keys.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = true;
                    break;
                case 'q':
                    if (this.player) this.player.switchWeapon(-1);
                    this.updateWeaponUI();
                    break;
                case 'z':
                    if (this.player) this.player.switchWeapon(1);
                    this.updateWeaponUI();
                    break;
                case 'v':
                    this.togglePanel('evolution');
                    break;
                case 't':
                    this.togglePanel('tech-tree');
                    break;
                case 'b':
                    this.togglePanel('bug');
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.keys.up = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.down = false;
                    break;
                case 'a':
                case 'arrowleft':
                    this.keys.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = false;
                    break;
            }
        });
        
        // 鼠标
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.down = true;
                this.tryFire();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.down = false;
            }
        });
        
        // 触摸支持
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.mouse.x = touch.clientX;
            this.mouse.y = touch.clientY;
            this.mouse.down = true;
            this.tryFire();
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.mouse.x = touch.clientX;
            this.mouse.y = touch.clientY;
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.mouse.down = false;
        });
    }
    
    setupUI() {
        // 主菜单按钮
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-continue').addEventListener('click', () => this.loadGame());

        // 关闭面板按钮
        document.getElementById('btn-close-evolution').addEventListener('click', () => this.hidePanel('evolution'));
        document.getElementById('btn-close-tech-tree').addEventListener('click', () => this.hidePanel('tech-tree'));
        document.getElementById('btn-close-bug').addEventListener('click', () => this.hidePanel('bug'));
        document.getElementById('btn-close-inventory').addEventListener('click', () => this.hidePanel('inventory'));
        document.getElementById('btn-close-skills').addEventListener('click', () => this.hidePanel('skills'));
        document.getElementById('btn-close-ai').addEventListener('click', () => this.hidePanel('ai'));

        // AI 面板按钮（兼容旧逻辑 + 新 Agent 聊天）
        document.getElementById('btn-ai-evolve').addEventListener('click', () => this.aiEvolve());
        document.getElementById('btn-ai-advisor').addEventListener('click', () => this.aiAdvisor());
        document.getElementById('btn-ai-status').addEventListener('click', () => this.aiStatus());

        // Agent 聊天
        const chatInput = document.getElementById('companion-chat-input');
        const chatSend = document.getElementById('companion-chat-send');
        const chatLog = document.getElementById('companion-chat-log');

        const doSendChat = () => {
            const msg = chatInput ? chatInput.value.trim() : '';
            if (msg && this.companion) {
                this.companion.chat(msg);
                if (chatInput) chatInput.value = '';
                this._updateCompanionChatLog();
            }
        };

        if (chatSend) chatSend.addEventListener('click', doSendChat);
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doSendChat();
            });
        }

        // 模式切换按钮
        document.querySelectorAll('.btn-mode').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.companion) {
                    const mode = btn.getAttribute('data-mode');
                    this.companion.autoMode = mode;
                    // 更新按钮状态
                    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const modeNames = { balanced: '⚖️平衡', explore: '🔭探索', combat: '⚔️战斗', collect: '📦收集' };
                    this.companion.addMessage(`切换为${modeNames[mode] || mode}模式！`);
                    this._updateCompanionChatLog();
                }
            };
            btn.addEventListener('click', handler);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); handler(e); }, { passive: false });
        });

        // Bug报告
        document.getElementById('btn-report-bug').addEventListener('click', () => this.reportBug());

        // 重新开始
        document.getElementById('btn-restart').addEventListener('click', () => this.startGame());

        // 快捷按钮 - 使用通用方法绑定，同时支持 click 和 touchstart（兼容微信WebView）
        this._bindQuickBtn('btn-evolution', () => this.togglePanel('evolution'));
        this._bindQuickBtn('btn-tech-tree', () => this.togglePanel('tech-tree'));
        this._bindQuickBtn('btn-bug', () => this.togglePanel('bug'));
        this._bindQuickBtn('btn-quest', () => this.togglePanel('quest'));
        this._bindQuickBtn('btn-inventory', () => this.togglePanel('inventory'));
        this._bindQuickBtn('btn-skills', () => this.togglePanel('skills'));
        this._bindQuickBtn('btn-ai', () => this.togglePanel('ai'));

        // 关闭任务面板
        const btnCloseQuest = document.getElementById('btn-close-quest');
        if (btnCloseQuest) btnCloseQuest.addEventListener('click', () => this.hidePanel('quest'));

        // 音效开关
        const btnSound = document.getElementById('btn-sound');
        if (btnSound) {
            const toggleSound = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 同时切换音效和 BGM
                const on = this.sound.toggleMute();
                if (!on) {
                    // 静音时也关闭 BGM
                    this.sound.stopBGM();
                } else {
                    // 取消静音时恢复 BGM
                    if (this.sound.bgmEnabled) {
                        this.sound.startBGM();
                    }
                }
                btnSound.textContent = on ? '🔊' : '🔇';
            };
            btnSound.addEventListener('click', toggleSound);
            btnSound.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
        }

        // 射击按钮
        const fireBtn = document.getElementById('fire-button');
        const fireHandler = (e) => { e.preventDefault(); e.stopPropagation(); this.tryFire(); };
        fireBtn.addEventListener('touchstart', fireHandler, { passive: false });
        fireBtn.addEventListener('click', fireHandler);

        // 虚拟摇杆
        this.setupJoystick();
    }

    // 通用快捷按钮绑定方法 - 同时绑定 click 和 touchstart，兼容微信 WebView
    _bindQuickBtn(btnId, callback) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        let handled = false;
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (handled) return;
            handled = true;
            setTimeout(() => { handled = false; }, 300); // 防重复触发
            try { this.sound.click(); } catch(e) {} // 修复：AudioContext 未初始化时不阻塞 callback
            callback();
        };

        // 同时绑定 click 和 touchstart 确保移动端兼容
        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', handler, { passive: false });
    }
    
    setupJoystick() {
        const game = this;
        const area = document.getElementById('joystick-area');
        const base = document.getElementById('joystick-base');
        const stick = document.getElementById('joystick-stick');

        if (!area || !base || !stick) return;

        const maxDist = 40; // 摇杆最大移动距离
        let originX = 0, originY = 0;
        let active = false;

        function resetKeys() {
            game.keys.up = false;
            game.keys.down = false;
            game.keys.left = false;
            game.keys.right = false;
        }

        function setStick(dx, dy) {
            stick.style.transform = `translate(${dx}px, ${dy}px)`;
        }

        function handleMove(clientX, clientY) {
            let dx = clientX - originX;
            let dy = clientY - originY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 限制在半径内
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            setStick(dx, dy);

            // 死区 - 防止微小抖动
            const deadzone = 8;
            resetKeys();

            if (dist > deadzone) {
                // 计算角度（弧度）
                const angle = Math.atan2(-dy, dx); // 注意y轴反转

                // 8方向判定
                if (angle > -2.749 && angle <= -0.393) game.keys.up = true;
                if (angle > 0.393 && angle <= 2.749) game.keys.down = true;
                if (angle > -1.963 && angle <= -0.393 || angle > 2.749 || angle <= -2.749) game.keys.left = false;
                if (angle > -0.393 && angle <= 0.393 || angle > -2.749 && angle <= -1.963) game.keys.right = false;

                // 简化：4方向，用角度判断
                game.keys.up = false;
                game.keys.down = false;
                game.keys.left = false;
                game.keys.right = false;

                // 上下：|dy| > |dx| 时判定为上下
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                if (absDy > absDx) {
                    if (dy < 0) game.keys.up = true;
                    else game.keys.down = true;
                } else {
                    if (dx < 0) game.keys.left = true;
                    else game.keys.right = true;
                }

                // 支持对角线：同时设置两个方向
                if (absDx > deadzone && absDy > deadzone) {
                    if (dy < 0) game.keys.up = true;
                    else game.keys.down = true;
                    if (dx < 0) game.keys.left = true;
                    else game.keys.right = true;
                }
            }
        }

        function onStart(e) {
            e.preventDefault();
            e.stopPropagation();
            active = true;
            stick.classList.add('active');

            const touch = e.touches ? e.touches[0] : e;
            // 用底座中心作为摇杆原点
            const rect = base.getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top + rect.height / 2;

            handleMove(touch.clientX, touch.clientY);
        }

        function onMove(e) {
            if (!active) return;
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            handleMove(touch.clientX, touch.clientY);
        }

        function onEnd(e) {
            active = false;
            stick.classList.remove('active');
            setStick(0, 0);
            resetKeys();
        }

        // 触摸事件
        area.addEventListener('touchstart', onStart, { passive: false });
        area.addEventListener('touchmove', onMove, { passive: false });
        area.addEventListener('touchend', onEnd);
        area.addEventListener('touchcancel', onEnd);

        // 鼠标事件（桌面端）
        area.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
    }
    
    startGame() {
        // 确保画布尺寸正确（此时游戏屏幕已可见）
        this.resize();
        
        // 创建玩家
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        
        // 初始化新系统
        if (typeof SkillSystem !== 'undefined') {
            this.skillSystem = new SkillSystem();
            // 解锁初始技能
            this.skillSystem.learnSkill('swift_current');
            this.skillSystem.learnSkill('speed_boost');
            this.skillSystem.learnSkill('repair');
        }
        
        if (typeof ItemSystem !== 'undefined') {
            this.itemSystem = new ItemSystem();
            // 初始道具
            this.itemSystem.addItem('wood_bundle', 5);
            this.itemSystem.addItem('food', 3);
            this.itemSystem.addItem('water', 2);
        }
        
        if (typeof WeatherSystem !== 'undefined') {
            this.weatherSystem = new WeatherSystem();
        }
        
        // 重置状态
        this.enemies = [];
        this.resourceNodes = [];
        this.treasures = [];
        this.rocks = [];
        this.floatingTexts = [];
        this.combat.clear();
        this.state = 'playing';
        this.gameTime = 0;
        
        // 切换界面
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        document.getElementById('game-over').classList.add('hidden');
        
        // 更新UI
        this.updateHUD();
        this.updateInventoryUI();
        this.updateWeaponUI();
        this.updateSkillsUI();

        // 创建船载 Agent
        if (typeof CompanionAgent !== 'undefined') {
            // 尝试从存档加载
            const savedCompanion = this._savedCompanion || null;
            this.companion = CompanionAgent.fromJSON(savedCompanion, this.player, this);
            if (!savedCompanion) {
                this.companion.addMessage("你好！我是小舵，你的船载AI助手。我会帮你观察环境、管理资源、提醒危险。有什么需要随时问我！");
            } else {
                this.companion.addMessage("又见面了！上次的航行记录已恢复，我们继续吧~");
            }
            this._savedCompanion = null;
        }

        // 启动背景音乐
        if (this.sound && this.sound.bgmEnabled) {
            this.sound.startBGM();
        }

        // 隐藏所有面板
        this.hidePanel('evolution');
        this.hidePanel('tech-tree');
        this.hidePanel('bug');
        this.hidePanel('inventory');
        this.hidePanel('skills');
        this.hidePanel('ai');

        // 连接多人服务器
        if (this.multiplayer) {
            this.multiplayer.connect();
        }
    }
    
    tryFire() {
        if (this.state !== 'playing' || !this.player) return;
        
        const weapon = this.player.getCurrentWeapon();
        if (!weapon) return;
        
        if (weapon.type === 'melee') {
            // 近战
            const worldX = this.mouse.x + this.camera.x;
            const worldY = this.mouse.y + this.camera.y;
            const fireData = this.player.fire(worldX, worldY);
            
            if (fireData) {
                this.sound.fire();
                this.particles.fireEffect(fireData.x, fireData.y, fireData.angle);
                // 近战直接命中检测
                const hitData = this.combat.createMeleeHit(
                    fireData.x, fireData.y, fireData.angle,
                    fireData.range, fireData.damage, fireData.knockback,
                    this.player
                );
                
                // 检测敌人碰撞
                for (const enemy of this.enemies) {
                    if (enemy.isDead) continue;
                    
                    const dx = enemy.x - hitData.x;
                    const dy = enemy.y - hitData.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const angle = Math.atan2(dy, dx);
                    
                    // 检查是否在近战范围内
                    if (dist < hitData.range + enemy.width/2) {
                        // 检查角度
                        let angleDiff = Math.abs(angle - hitData.angle);
                        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                        
                        if (angleDiff < Math.PI / 4) {
                            const result = enemy.takeDamage(hitData.damage, this.player);
                            if (result.destroyed) {
                                this.onEnemyKilled(enemy);
                            }
                        }
                    }
                }
            }
        } else {
            // 远程
            const worldX = this.mouse.x + this.camera.x;
            const worldY = this.mouse.y + this.camera.y;
            const fireData = this.player.fire(worldX, worldY);
            
            if (fireData) {
                this.sound.fire();
                this.particles.fireEffect(fireData.x, fireData.y, fireData.angle);
                this.combat.createProjectile(fireData, this.player);
            }
        }
        
        this.updateWeaponUI();
    }
    
    onEnemyKilled(enemy) {
        // 音效 + 粒子 + 任务追踪
        this.sound.enemyDeath();
        this.particles.deathEffect(enemy.x, enemy.y);
        const killQuests = this.quests.trackKill();
        if (killQuests.length > 0) {
            const rewards = this.quests.getRewards(killQuests);
            this.player.addTechPoints(rewards.techPoints);
            for (const q of killQuests) {
                this.showFloatingText(`✅ ${q.name} +${q.reward.techPoints}科技`, '#00ff88');
                this.sound.levelUp();
            }
        }
        
        // 掉落物品
        for (const [item, amount] of Object.entries(enemy.drops)) {
            this.player.addItem(item, amount);
        }
        
        // 科技点
        this.player.addTechPoints(10);

        // Agent 反馈
        if (this.companion) {
            this.companion.gainExp(15);
            this.companion.adaptPersonality('attack');
        }

        // 更新UI
        this.updateInventoryUI();
        this.updateHUD();
    }
    
    gameLoop(timestamp) {
        // 计算deltaTime
        this.deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // 限制最大dt
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;
        
        // 更新
        if (this.state === 'playing') {
            this.update(this.deltaTime);
        }
        
        // 渲染
        this.render();
        
        // 继续循环
        if (!this._useInterval) {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }
    
    update(dt) {
        // 安全检查
        if (!this.player || this.state !== 'playing') return;
        
        // 更新玩家
        this.player.update(dt, this.keys);

        // 多人模式 - 同步位置 & 更新其他玩家
        if (this.multiplayer) {
            this.multiplayer.sendUpdate(this.player);
            this.multiplayer.updatePositions(dt);
        }
        
        // 更新粒子 + 船尾浪花
        this.particles.update(dt);
        this.particles.wakeEffect(this.player.x, this.player.y, this.player.vx || 0, this.player.vy || 0);
        
        // 更新任务（存活时间）
        this.quests.trackSurvived(this.gameTime);
        
        // 更新洋流
        this.updateDrift(dt);
        
        // 应用洋流
        this.player.x += this.drift.x * dt;
        this.player.y += this.drift.y * dt;
        
        // 更新相机
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;
        
        // 生成敌人
        this.updateSpawning(dt);
        
        // 生成资源节点
        this.spawnResourceNodeTimer += dt * 1000;
        if (this.spawnResourceNodeTimer > 15000) {  // 每15秒生成一个资源节点
            this.spawnResourceNodeTimer = 0;
            this.spawnResourceNode();
        }
        
        // 更新资源节点
        this.updateResourceNodes(dt);
        
        // 更新环境对象（宝藏、礁石、洋流）
        this.updateEnvironment(dt);
        
        // 生成宝藏箱（每20秒）
        this.spawnTreasureTimer += dt * 1000;
        if (this.spawnTreasureTimer > 20000) {
            this.spawnTreasureTimer = 0;
            this.spawnTreasure();
        }
        
        // 生成礁石（每25秒）
        this.spawnRockTimer += dt * 1000;
        if (this.spawnRockTimer > 25000) {
            this.spawnRockTimer = 0;
            this.spawnRock();
        }
        
        // 生成洋流区域（每30秒）
        this.spawnCurrentZoneTimer += dt * 1000;
        if (this.spawnCurrentZoneTimer > 30000) {
            this.spawnCurrentZoneTimer = 0;
            this.spawnCurrentZone();
        }
        
        // 更新技能系统
        if (this.skillSystem) {
            this.skillSystem.update(dt, this.player);
        }
        
        // 更新天气系统
        if (this.weatherSystem) {
            this.weatherSystem.update(dt);
        }
        
        // 更新游戏时间
        this.gameTime += dt;
        
        // 更新敌人
        for (const enemy of this.enemies) {
            if (!enemy || enemy.isDead) continue;
            enemy.update(dt, this.player);
            
            // 敌人与礁石碰撞
            if (this.rocks) {
                for (const r of this.rocks) {
                    const dx = enemy.x - r.x;
                    const dy = enemy.y - r.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const collisionDist = r.size + enemy.width / 2;
                    if (dist < collisionDist) {
                        // 推开
                        const pushForce = (collisionDist - dist) * 0.5;
                        const angle = Math.atan2(dy, dx);
                        enemy.x += Math.cos(angle) * pushForce;
                        enemy.y += Math.sin(angle) * pushForce;
                        // 受伤
                        const result = enemy.takeDamage(5 * dt);
                        if (result && result.destroyed) {
                            enemy.isDead = true;
                        }
                    }
                }
            }
            
            // 敌人与玩家碰撞
            if (enemy.collidesWith(this.player)) {
                this.sound.hit();
                this.particles.hitEffect(this.player.x, this.player.y);
                const result = this.player.takeDamage(enemy.damage * 0.5, enemy);
                if (result && result.destroyed) {
                    this.gameOver();
                    return;
                }
                this.updateHUD();
            }
        }
        
        // 移除死亡敌人
        this.enemies = this.enemies.filter(e => !e.isDead);
        
        // 更新战斗系统
        if (this.enemies.length > 0) {
            const combatResult = this.combat.update(dt, this.enemies, this.player);
            if (combatResult && combatResult.playerDestroyed) {
                this.gameOver();
                return;
            }
        }

        // 更新船载 Agent
        if (this.companion) {
            this.companion.update(dt);
            // Agent 经验：根据游戏时间缓慢增长
            this.companion.gainExp(dt * 2);
        }

        // 更新UI
        this.updateHUD();
        this.updateMultiplayerStatus();
    }
    
    updateDrift(dt) {
        this.driftTimer += dt;
        if (this.driftTimer > 3) {
            this.driftTimer = 0;
            this.drift.x = (Math.random() - 0.5) * CONFIG.SETTINGS.driftStrength * 2;
            this.drift.y = (Math.random() - 0.5) * CONFIG.SETTINGS.driftStrength * 2;
        }
    }
    
    updateSpawning(dt) {
        this.spawnTimer += dt * 1000;
        
        if (this.spawnTimer >= CONFIG.SETTINGS.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }
    }
    
    spawnEnemy() {
        // 限制敌人生成上限，防止数组爆炸
        const MAX_ENEMIES = 50;
        if (this.enemies.length >= MAX_ENEMIES) {
            return; // 达到上限，不生成新敌人
        }

        // 在玩家附近生成
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.SETTINGS.spawnDistance;
        
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        // 随机敌人类型
        const types = Object.keys(CONFIG.ENEMIES);
        const type = types[Math.floor(Math.random() * types.length)];
        
        const enemy = new Enemy(x, y, type);
        this.enemies.push(enemy);
    }
    
    render() {
        const ctx = this.ctx;
        
        // 清空画布 - 破败世界深海色
        ctx.fillStyle = '#080e1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === 'menu') return;
        
        // 绘制海洋背景
        this.renderOcean(ctx);
        
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // 渲染敌人
        for (const enemy of this.enemies) {
            enemy.render(ctx);
        }
        
        // 渲染其他玩家（多人模式）
        if (this.multiplayer) {
            this.renderOtherPlayers(ctx);
        }

        // 渲染玩家
        if (this.player) {
            this.player.render(ctx);
        }

        // 渲染船载 Agent 浮动消息
        if (this.companion) {
            this.companion.renderFloatingMessages(ctx);
        }

        // 渲染粒子特效
        this.particles.render(ctx, this.camera.x, this.camera.y);
        
        // 渲染资源节点
        this.renderResourceNodes();
        
        // 渲染环境对象（礁石、洋流、宝藏）
        this.renderEnvironment();
        
        // 渲染战斗系统
        this.combat.render(ctx);
        
        ctx.restore();
        
        // 渲染小地图
        this.renderMinimap();
        
        // 渲染浮动文字（使用 deltaTime 而非未定义的 dt）
        this.updateFloatingTexts(this.deltaTime);
        this.renderFloatingTexts();

        // 渲染调试信息
        this.renderDebug();
    }
    
    renderMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        if (!canvas || !this.player) return;
        
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const scale = 0.1; // 小地图缩放比例
        
        // 清空
        ctx.fillStyle = 'rgba(10, 25, 45, 0.9)';
        ctx.fillRect(0, 0, w, h);
        
        // 绘制玩家位置（中心点）
        const playerX = w / 2;
        const playerY = h / 2;
        
        // 绘制敌人
        ctx.fillStyle = '#f87171';
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const dx = (enemy.x - this.player.x) * scale;
            const dy = (enemy.y - this.player.y) * scale;
            if (Math.abs(dx) < w/2 && Math.abs(dy) < h/2) {
                ctx.beginPath();
                ctx.arc(playerX + dx, playerY + dy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // 绘制玩家
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 玩家方向指示
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(
            playerX + Math.cos(this.player.rotation) * 10,
            playerY + Math.sin(this.player.rotation) * 10
        );
        ctx.stroke();
    }
    
    renderOcean(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = Date.now() * 0.001;

        // 破败世界：废墟背景
        this.renderRuins(ctx, w, h, time);

        // 动态波浪效果
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.10)';
        ctx.lineWidth = 2;

        // 水平波浪线
        for (let y = 0; y < h + 60; y += 35) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 5) {
                const waveY = y + Math.sin((x + this.camera.x) * 0.02 + time * 2) * 5
                            + Math.sin((x + this.camera.x) * 0.01 + time) * 3;
                if (x === 0) {
                    ctx.moveTo(x, waveY);
                } else {
                    ctx.lineTo(x, waveY);
                }
            }
            ctx.stroke();
        }

        // 亮点效果
        ctx.fillStyle = 'rgba(150, 200, 255, 0.03)';
        for (let i = 0; i < 20; i++) {
            const x = ((i * 137 + time * 20) % (w + 100)) - 50 + this.camera.x * 0.3;
            const y = ((i * 89 + time * 15) % (h + 100)) - 50 + this.camera.y * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, 2 + Math.sin(time * 3 + i) * 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // 浮动碎片
        this.renderDebris(ctx, w, h, time);
    }

    // 破败世界废墟背景
    renderRuins(ctx, w, h, time) {
        const camX = this.camera.x;
        const camY = this.camera.y;
        const gridSize = 400;
        const startX = Math.floor(camX / gridSize) * gridSize;
        const startY = Math.floor(camY / gridSize) * gridSize;

        for (let gx = startX - gridSize; gx < camX + w + gridSize; gx += gridSize) {
            for (let gy = startY - gridSize; gy < camY + h + gridSize; gy += gridSize) {
                const hash = ((gx * 7919 + gy * 104729) & 0xFFFF) / 0xFFFF;
                if (hash > 0.35) continue;

                const screenX = gx - camX;
                const screenY = gy - camY;
                const ruinType = Math.floor(hash * 10) % 4;
                const rot = ((gx * 31 + gy * 97) & 0xFF) / 255 * 0.4 - 0.2;
                const sway = Math.sin(time * 0.5 + gx * 0.01 + gy * 0.01) * 0.5;

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(rot + sway * 0.01);
                ctx.globalAlpha = 0.15 + hash * 0.15;

                switch (ruinType) {
                    case 0: // collapsed building
                        ctx.fillStyle = '#3a4a5a';
                        ctx.fillRect(-15, -40, 30, 45);
                        ctx.fillStyle = '#2a3a4a';
                        ctx.fillRect(-12, -35, 8, 8);
                        ctx.fillRect(4, -35, 8, 8);
                        ctx.fillRect(-12, -22, 8, 8);
                        ctx.fillRect(4, -22, 8, 8);
                        ctx.fillStyle = '#4a5a6a';
                        ctx.beginPath();
                        ctx.moveTo(-15, -40);
                        ctx.lineTo(-5, -48);
                        ctx.lineTo(8, -42);
                        ctx.lineTo(15, -40);
                        ctx.closePath();
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(60, 120, 60, 0.4)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(-10, -30);
                        ctx.quadraticCurveTo(-18, -15, -12, 0);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(10, -25);
                        ctx.quadraticCurveTo(18, -10, 14, 5);
                        ctx.stroke();
                        break;
                    case 1: // broken bridge
                        ctx.fillStyle = '#5a5a5a';
                        ctx.fillRect(-30, -5, 25, 6);
                        ctx.fillRect(10, -3, 20, 6);
                        ctx.fillStyle = '#4a4a4a';
                        ctx.fillRect(-5, -8, 15, 3);
                        ctx.fillStyle = '#6a6a6a';
                        ctx.fillRect(-28, 1, 5, 12);
                        ctx.fillRect(25, 1, 5, 12);
                        ctx.fillStyle = 'rgba(40, 60, 80, 0.3)';
                        ctx.fillRect(-30, 8, 60, 8);
                        break;
                    case 2: // tilted lamppost
                        ctx.fillStyle = '#7a7a7a';
                        ctx.save();
                        ctx.rotate(-0.3);
                        ctx.fillRect(-2, -35, 4, 35);
                        ctx.fillStyle = '#9a9a9a';
                        ctx.fillRect(-6, -38, 12, 5);
                        ctx.fillStyle = 'rgba(120, 80, 40, 0.5)';
                        ctx.fillRect(-2, -20, 4, 6);
                        ctx.restore();
                        break;
                    case 3: // rubble
                        ctx.fillStyle = '#5a5a5a';
                        ctx.beginPath();
                        ctx.moveTo(-20, 5);
                        ctx.lineTo(-15, -8);
                        ctx.lineTo(-5, -12);
                        ctx.lineTo(5, -10);
                        ctx.lineTo(15, -5);
                        ctx.lineTo(20, 5);
                        ctx.closePath();
                        ctx.fill();
                        ctx.fillStyle = '#6a6a6a';
                        ctx.beginPath();
                        ctx.arc(-8, -2, 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(50, 100, 50, 0.5)';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(-10, 3);
                        ctx.quadraticCurveTo(-12, -8, -8, -15);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(10, 2);
                        ctx.quadraticCurveTo(14, -6, 10, -12);
                        ctx.stroke();
                        break;
                }
                ctx.restore();
            }
        }
    }

    // floating debris
    renderDebris(ctx, w, h, time) {
        const camX = this.camera.x;
        const camY = this.camera.y;
        for (let i = 0; i < 8; i++) {
            const baseX = (i * 547 + Math.floor(camX / 800) * 800) % (w + 400) - 200;
            const baseY = (i * 389 + Math.floor(camY / 800) * 800) % (h + 400) - 200;
            const fx = baseX + Math.sin(time * 0.3 + i * 2.1) * 8;
            const fy = baseY + Math.cos(time * 0.2 + i * 1.7) * 5;

            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(time * 0.1 + i * 0.5);
            ctx.globalAlpha = 0.12;
            if (i % 3 === 0) {
                ctx.fillStyle = '#6a5a3a';
                ctx.fillRect(-12, -3, 24, 6);
            } else if (i % 3 === 1) {
                ctx.fillStyle = 'rgba(120, 150, 180, 0.5)';
                ctx.beginPath();
                ctx.moveTo(-8, -6);
                ctx.lineTo(6, -8);
                ctx.lineTo(10, 4);
                ctx.lineTo(-4, 8);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = '#3a3a3a';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
    
    updateHUD() {
        if (!this.player) return;
        
        // HP
        const hpPercent = this.player.getHpPercent();
        const hpFill = document.getElementById('hp-fill');
        hpFill.style.width = (hpPercent * 100) + '%';
        
        // HP颜色
        hpFill.classList.remove('warning', 'danger');
        if (hpPercent <= 0.25) {
            hpFill.classList.add('danger');
        } else if (hpPercent <= 0.5) {
            hpFill.classList.add('warning');
        }
        
        document.getElementById('hp-text').textContent = 
            `${Math.floor(this.player.hp)}/${this.player.maxHp}`;
        
        // 速度
        document.getElementById('speed-text').textContent = this.player.speed;
        
        // 货物
        document.getElementById('cargo-text').textContent = 
            `${this.player.getInventoryTotal()}/${this.player.cargo}`;
        
        // 阶段
        document.getElementById('stage-text').textContent = this.player.name;
        
        // 科技点
        document.getElementById('tech-points').textContent = this.player.techPoints;
    }

    updateMultiplayerStatus() {
        const el = document.getElementById('mp-status');
        if (!el || !this.multiplayer) return;

        if (this.multiplayer.connected) {
            const count = this.multiplayer.playerCount || 1;
            el.textContent = '🌐 ' + this.multiplayer.nickname + ' | ' + count + ' players online';
            el.className = 'connected';
            el.style.display = 'block';
        } else {
            el.textContent = '🌐 Offline';
            el.className = 'disconnected';
            el.style.display = 'block';
        }
    }
    
    updateInventoryUI() {
        if (!this.player) return;
        
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        
        for (const [item, amount] of Object.entries(this.player.inventory)) {
            if (amount > 0) {
                const div = document.createElement('div');
                div.textContent = `${this.evolution.getResourceName(item)}: ${amount}`;
                list.appendChild(div);
            }
        }
    }
    
    updateSkillsUI() {
        const skillsList = document.getElementById('skills-list');
        if (!skillsList) return;
        
        if (!this.skillSystem) {
            skillsList.innerHTML = '<p style="color:#8ab4d4;text-align:center;">技能系统加载中...</p>';
            return;
        }
        
        const skills = this.skillSystem.getSkillsPanelData();
        
        if (skills.length === 0) {
            skillsList.innerHTML = '<p style="color:#8ab4d4;text-align:center;">暂无技能</p>';
            return;
        }
        
        skillsList.innerHTML = skills.map(skill => `
            <div class="skill-item ${skill.onCooldown ? 'on-cooldown' : ''}" 
                 onclick="game.tryUseSkill('${skill.id}')">
                <div class="skill-icon">${this.getSkillIcon(skill.type)}</div>
                <div class="skill-info">
                    <div class="skill-name">${skill.name}</div>
                    <div class="skill-desc">${skill.desc}</div>
                    ${skill.cooldownRemaining > 0 ? 
                        `<div class="skill-cooldown">⏱️ ${Math.ceil(skill.cooldownRemaining)}秒</div>` : ''}
                </div>
                <span class="skill-type-badge ${skill.type}">${skill.type === 'active' ? '主动' : skill.type === 'attack' ? '攻击' : skill.type === 'ultimate' ? '终极' : '被动'}</span>
            </div>
        `).join('');
    }
    
    getSkillIcon(type) {
        const icons = {
            passive: '🔧',
            active: '⚡',
            attack: '⚔️',
            ultimate: '💥'
        };
        return icons[type] || '⚡';
    }
    
    tryUseSkill(skillId) {
        if (!this.skillSystem || !this.player || this.state !== 'playing') return;
        
        const result = this.skillSystem.useSkill(skillId, this.player, this.enemies);
        
        if (result.success) {
            this.updateSkillsUI();
            this.updateHUD();
            
            // 显示技能使用提示
            if (result.type === 'aoe') {
                this.showFloatingText(`${result.skill.name}! 造成${result.damage}伤害!`, 'gold');
            } else if (result.type === 'single') {
                this.showFloatingText(`${result.skill.name}! 造成${result.damage}伤害!`, 'yellow');
            } else if (result.type === 'ultimate') {
                this.showFloatingText(`💥 海啸! 全屏${result.damage}伤害!`, 'purple');
            }
        } else if (result.reason) {
            this.showFloatingText(result.reason, 'red');
        }
    }
    
    showFloatingText(text, color = 'white') {
        // 创建浮动文字效果
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${color};
            font-size: 1.5rem;
            font-weight: bold;
            text-shadow: 0 0 10px ${color};
            z-index: 9999;
            pointer-events: none;
            animation: floatUp 1s ease-out forwards;
        `;
        div.textContent = text;
        document.body.appendChild(div);
        
        setTimeout(() => div.remove(), 1000);
    }
    
    updateWeaponUI() {
        if (!this.player) return;
        
        const weapon = this.player.getCurrentWeapon();
        
        if (weapon) {
            document.getElementById('weapon-name').textContent = weapon.name;
            document.getElementById('weapon-ammo').textContent = 
                weapon.ammoCost ? `弹药: ${weapon.ammo || 0}` : '';
        } else {
            document.getElementById('weapon-name').textContent = '无';
            document.getElementById('weapon-ammo').textContent = '';
        }
    }
    
    togglePanel(name) {
        const panelId = name + '-panel';
        const panel = document.getElementById(panelId);
        
        if (panel.classList.contains('hidden')) {
            // 显示面板
            this.showPanel(name);
        } else {
            // 隐藏面板
            this.hidePanel(name);
        }
    }
    
    showPanel(name) {
        const panelId = name + '-panel';
        document.getElementById(panelId).classList.remove('hidden');
        
        if (name === 'evolution') {
            this.updateEvolutionPanel();
        } else if (name === 'tech-tree') {
            this.updateTechTreePanel();
        } else if (name === 'bug') {
            this.updateBugPanel();
        } else if (name === 'quest') {
            this.updateQuestPanel();
        } else if (name === 'ai') {
            this.updateAIPanel();
        }
    }
    
    hidePanel(name) {
        const panelId = name + '-panel';
        document.getElementById(panelId).classList.add('hidden');
    }
    
    updateEvolutionPanel() {
        if (!this.player) return;
        
        const options = document.getElementById('evolution-options');
        options.innerHTML = '';
        
        const evolutions = this.evolution.getAvailableEvolutions(this.player);
        
        if (evolutions.length === 0) {
            options.innerHTML = '<p style="text-align:center;color:#8ab4d4;">已到达最高阶段！</p>';
            return;
        }
        
        for (const evo of evolutions) {
            const div = document.createElement('div');
            div.className = 'evolution-option';
            
            let costText = '';
            for (const [resource, amount] of Object.entries(evo.cost)) {
                costText += `${this.evolution.getResourceName(resource)}: ${amount} `;
            }
            
            div.innerHTML = `
                <h4>→ ${evo.name}</h4>
                <p>${evo.description}</p>
                <div class="evolution-cost">消耗: ${costText}</div>
                <div style="font-size:0.85rem;color:#8ab4d4;margin-bottom:10px;">
                    属性: HP ${evo.stats.hp} | 速度 ${evo.stats.speed} | 容量 ${evo.stats.cargo}
                </div>
                <button class="action-btn" ${evo.canEvolve ? '' : 'disabled'} 
                    data-stage="${evo.stage}">
                    ${evo.canEvolve ? '进化' : evo.reason}
                </button>
            `;
            
            const btn = div.querySelector('button');
            if (evo.canEvolve) {
                btn.addEventListener('click', () => this.doEvolve(evo.stage));
            }
            
            options.appendChild(div);
        }
    }
    
    doEvolve(targetStage) {
        if (!this.player) return;
        
        const result = this.evolution.evolve(this.player, targetStage);
        
        if (result.success) {
            // 音效 + 粒子 + 任务追踪
            this.sound.evolve();
            this.particles.evolveEffect(this.player.x, this.player.y);
            const evolveQuests = this.quests.trackEvolve();
            if (evolveQuests.length > 0) {
                const rewards = this.quests.getRewards(evolveQuests);
                this.player.techPoints = (this.player.techPoints || 0) + rewards.techPoints;
                for (const q of evolveQuests) {
                    this.showFloatingText(`✅ ${q.name} +${q.reward.techPoints}科技`, '#00ff88');
                }
            }
            this.showFloatingText('🚀 进化成功！', '#00ff88');

            // Agent 反馈
            if (this.companion) {
                this.companion.addMessage(`🚀 太棒了！成功进化为${this.player.name}！我们的旅程更进一步了！`);
                this.companion.gainExp(50);
                this.companion.adaptPersonality('explore');
            }

            // 更新UI
            this.updateHUD();
            this.updateInventoryUI();
            this.updateWeaponUI();
            
            // 关闭面板
            this.hidePanel('evolution');
            
            // 显示AI事件
            if (result.event) {
                console.log('进化事件:', result.event.description);
            }
        } else {
            // 显示错误
            alert(result.reason);
        }
    }
    
    updateTechTreePanel() {
        if (!this.player) return;
        
        const content = document.getElementById('tech-tree-content');
        content.innerHTML = '';
        
        const techTree = this.evolution.getTechTree(this.player.stage);
        
        for (const [key, line] of Object.entries(techTree)) {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'tech-line';
            
            let stagesHtml = '';
            for (let i = 0; i < line.stages.length; i++) {
                const stage = line.stages[i];
                const stageData = CONFIG.STAGES[stage];
                const status = this.evolution.getStageStatus(stage, this.player.stage);
                
                let className = 'tech-stage';
                if (status === 'current') className += ' current';
                else if (status === 'locked') className += ' locked';
                
                stagesHtml += `<span class="${className}">${stageData ? stageData.name : stage}</span>`;
                
                if (i < line.stages.length - 1) {
                    stagesHtml += '<span class="tech-arrow">→</span>';
                }
            }
            
            lineDiv.innerHTML = `
                <h4>${line.name}</h4>
                <div class="tech-stages">${stagesHtml}</div>
            `;
            
            content.appendChild(lineDiv);
        }
    }
    
    updateBugPanel() {
        document.getElementById('bug-points').textContent = this.bugPoints;
    }
    
    reportBug() {
        const input = document.getElementById('bug-input');
        const description = input.value.trim();
        
        if (!description) {
            alert('请描述你发现的问题');
            return;
        }
        
        // 记录Bug
        this.reportedBugs.push({
            id: 'bug_' + Date.now(),
            description: description,
            timestamp: new Date().toISOString()
        });
        
        // 奖励
        this.bugPoints += 50;
        
        // 清空输入
        input.value = '';
        
        // 更新UI
        this.updateBugPanel();
        
        alert('Bug已报告！获得 +50 科技点 🎉');
        
        // 通知控制台
        console.log('Bug报告:', description);
    }
    
    updateQuestPanel() {
        const content = document.getElementById('quest-content');
        if (!content || !this.quests) return;
        
        let html = '<div style="padding:10px;">';
        html += `<p style="color:#4fc3f7;margin-bottom:10px;">✅ 已完成: ${this.quests.getCompletedCount()} / ${this.quests.getTotalCount()}</p>`;
        
        for (const quest of this.quests.quests) {
            const done = this.quests.isCompleted(quest.id);
            const progress = this.quests.getProgress(quest);
            const pct = Math.min(100, Math.round(progress / quest.target * 100));
            
            html += `<div class="quest-item" style="background:${done ? 'rgba(0,255,136,0.1)' : 'rgba(30,136,229,0.1)'};border:1px solid ${done ? 'rgba(0,255,136,0.3)' : 'rgba(30,136,229,0.3)'};border-radius:8px;padding:8px 10px;margin-bottom:6px;">`;
            html += `<div style="font-size:0.9rem;font-weight:bold;color:${done ? '#00ff88' : '#fff'};">${done ? '✅ ' : ''}${quest.name}</div>`;
            html += `<div style="font-size:0.75rem;color:#8ab4d4;margin-top:2px;">${quest.desc}</div>`;
            html += `<div style="margin-top:4px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">`;
            html += `<div style="height:100%;width:${pct}%;background:${done ? '#00ff88' : '#4fc3f7'};border-radius:2px;"></div>`;
            html += `</div>`;
            html += `<div style="font-size:0.7rem;color:#8ab4d4;margin-top:2px;">${progress}/${quest.target} | 奖励: +${quest.reward.techPoints}科技</div>`;
            html += `</div>`;
        }
        
        html += '</div>';
        content.innerHTML = html;
    }
    
    gameOver() {
        this.state = 'gameover';
        if (this.companion) {
            this.companion.addMessage("💀 船被摧毁了...不要灰心，下次我们一定能走得更远！");
        }
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    saveGame() {
        if (!this.player) return;

        const saveData = {
            player: this.player.getSaveData(),
            companion: this.companion ? this.companion.toJSON() : null,
            timestamp: new Date().toISOString(),
            version: '1.3.0'
        };

        localStorage.setItem('drift_evolution_save', JSON.stringify(saveData));
        console.log('游戏已保存');
    }

    loadGame() {
        const saveStr = localStorage.getItem('drift_evolution_save');
        if (!saveStr) {
            alert('没有找到存档');
            return;
        }

        try {
            const saveData = JSON.parse(saveStr);

            // 保存 companion 数据，startGame 时会加载
            this._savedCompanion = saveData.companion || null;

            this.startGame();
            this.player.loadSaveData(saveData.player);

            this.updateHUD();
            this.updateInventoryUI();
            this.updateWeaponUI();

            console.log('游戏已加载');
        } catch (e) {
            alert('存档加载失败');
            console.error(e);
        }
    }

    // 生成资源节点
    spawnResourceNode() {
        if (!this.player) return;
        
        const types = ['wood', 'food', 'water', 'metal'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 200;
        
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        const resource = {
            x, y,
            type,
            amount: 3 + Math.floor(Math.random() * 5),
            collected: false
        };
        
        if (!this.resourceNodes) this.resourceNodes = [];
        this.resourceNodes.push(resource);
    }
    
    // 更新资源节点
    updateResourceNodes(dt) {
        if (!this.resourceNodes || !this.player) return;
        
        for (let i = this.resourceNodes.length - 1; i >= 0; i--) {
            const node = this.resourceNodes[i];
            if (node.collected) {
                this.resourceNodes.splice(i, 1);
                continue;
            }
            
            const dx = this.player.x - node.x;
            const dy = this.player.y - node.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 50) {
                this.collectResource(node);
                node.collected = true;
            }
        }
        
        if (this.resourceNodes && this.resourceNodes.length > 10) {
            this.resourceNodes.shift();
        }
    }
    
    // 收集资源
    collectResource(node) {
        if (!this.player) return;
        
        switch(node.type) {
            case 'wood':
                this.player.inventory.wood = (this.player.inventory.wood || 0) + node.amount;
                this.showFloatingText(`+${node.amount} 🪵`, '#8B4513');
                break;
            case 'food':
                this.player.inventory.food = (this.player.inventory.food || 0) + node.amount;
                this.showFloatingText(`+${node.amount} 🍖`, '#ff6b6b');
                break;
            case 'water':
                this.player.inventory.water = (this.player.inventory.water || 0) + node.amount;
                this.showFloatingText(`+${node.amount} 💧`, '#4dabf7');
                break;
            case 'metal':
                this.player.inventory.metal = (this.player.inventory.metal || 0) + node.amount;
                this.showFloatingText(`+${node.amount} ⚙️`, '#868e96');
                break;
        }
        
        // 音效 + 粒子 + 任务追踪
        this.sound.collect();
        this.particles.collectEffect(node.x, node.y);
        const completed = this.quests.trackCollect(node.type);
        if (completed.length > 0) {
            const rewards = this.quests.getRewards(completed);
            this.player.techPoints = (this.player.techPoints || 0) + rewards.techPoints;
            for (const q of completed) {
                this.showFloatingText(`✅ ${q.name} +${q.reward.techPoints}科技`, '#00ff88');
                this.sound.levelUp();
            }
        }

        // Agent 反馈
        if (this.companion) {
            this.companion.gainExp(5);
            this.companion.adaptPersonality('collect');
        }

        this.updateInventoryUI();
    }
    
    // 渲染资源节点
    renderResourceNodes() {
        if (!this.resourceNodes) return;
        
        const ctx = this.ctx;
        
        for (const node of this.resourceNodes) {
            if (node.collected) continue;
            
            ctx.save();
            ctx.translate(node.x, node.y);
            
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            
            const icons = { wood: '🪵', food: '🍖', water: '💧', metal: '⚙️' };
            
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icons[node.type] || '📦', 0, 0);
            
            ctx.restore();
        }
    }

    // 生成宝藏箱
    spawnTreasure() {
        if (!this.player) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 400 + Math.random() * 300;
        
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        const treasures = [
            { type: 'wood', amount: 15, icon: '📦' },
            { type: 'food', amount: 10, icon: '🎁' },
            { type: 'water', amount: 10, icon: '🎀' },
            { type: 'rope', amount: 8, icon: '🎀' },
            { type: 'metal', amount: 5, icon: '💎' }
        ];
        
        const treasure = treasures[Math.floor(Math.random() * treasures.length)];
        
        const obj = {
            x, y,
            ...treasure,
            bobOffset: Math.random() * Math.PI * 2,
            collected: false,
            isTreasure: true
        };
        
        if (!this.treasures) this.treasures = [];
        this.treasures.push(obj);
    }
    
    // 生成礁石障碍
    spawnRock() {
        if (!this.player) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 350 + Math.random() * 250;
        
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        const obj = {
            x, y,
            type: 'rock',
            size: 20 + Math.random() * 25,
            isRock: true
        };
        
        if (!this.rocks) this.rocks = [];
        this.rocks.push(obj);
    }
    
    // 生成洋流区域
    spawnCurrentZone() {
        if (!this.player) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 400 + Math.random() * 200;
        
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        const type = Math.random() > 0.5 ? 'boost' : 'slow';
        
        const obj = {
            x, y,
            type,
            radius: 60 + Math.random() * 40,
            strength: type === 'boost' ? 2 : 0.4,
            duration: 10000 + Math.random() * 10000,
            age: 0,
            isCurrentZone: true
        };
        
        if (!this.currentZones) this.currentZones = [];
        this.currentZones.push(obj);
    }
    
    // 更新环境对象
    updateEnvironment(dt) {
        const ms = dt * 1000;
        
        // 更新宝藏箱
        if (this.treasures) {
            for (let i = this.treasures.length - 1; i >= 0; i--) {
                const t = this.treasures[i];
                if (t.collected) {
                    this.treasures.splice(i, 1);
                    continue;
                }
                
                if (this.player) {
                    const dx = this.player.x - t.x;
                    const dy = this.player.y - t.y;
                    if (Math.sqrt(dx*dx + dy*dy) < 45) {
                        this.collectTreasure(t);
                        t.collected = true;
                    }
                }
            }
        }
        
        if (this.treasures && this.treasures.length > 5) {
            this.treasures.shift();
        }
        
        // 更新礁石
        if (this.rocks) {
            for (let i = this.rocks.length - 1; i >= 0; i--) {
                const r = this.rocks[i];
                if (this.player) {
                    const dx = this.player.x - r.x;
                    const dy = this.player.y - r.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < r.size + 20) {
                        const pushForce = (r.size + 20 - dist) * 0.5;
                        const angle = Math.atan2(dy, dx);
                        this.player.x += Math.cos(angle) * pushForce;
                        this.player.y += Math.sin(angle) * pushForce;
                        this.player.takeDamage(5 * dt);
                        this.showFloatingText('⚠️ 礁石!', '#888');
                    }
                }
            }
        }
        
        if (this.rocks && this.rocks.length > 8) {
            this.rocks.shift();
        }
        
        // 更新洋流区域
        if (this.currentZones) {
            for (let i = this.currentZones.length - 1; i >= 0; i--) {
                const c = this.currentZones[i];
                c.age += ms;
                if (c.age > c.duration) {
                    this.currentZones.splice(i, 1);
                    continue;
                }
                
                if (this.player) {
                    const dx = this.player.x - c.x;
                    const dy = this.player.y - c.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < c.radius) {
                        const force = (1 - dist / c.radius) * c.strength * 50 * dt;
                        this.player.x += Math.cos(this.player.rotation) * force;
                        this.player.y += Math.sin(this.player.rotation) * force;
                    }
                }
            }
        }
        
        if (this.currentZones && this.currentZones.length > 3) {
            this.currentZones.shift();
        }
    }
    
    // 收集宝藏
    collectTreasure(t) {
        if (!this.player) return;
        
        switch(t.type) {
            case 'wood':
                this.player.inventory.wood = (this.player.inventory.wood || 0) + t.amount;
                this.showFloatingText(`+${t.amount} 🪵`, '#8B4513');
                break;
            case 'food':
                this.player.inventory.food = (this.player.inventory.food || 0) + t.amount;
                this.showFloatingText(`+${t.amount} 🍖`, '#ff6b6b');
                break;
            case 'water':
                this.player.inventory.water = (this.player.inventory.water || 0) + t.amount;
                this.showFloatingText(`+${t.amount} 💧`, '#4dabf7');
                break;
            case 'rope':
                this.player.inventory.rope = (this.player.inventory.rope || 0) + t.amount;
                this.showFloatingText(`+${t.amount} 🪢`, '#a0522d');
                break;
            case 'metal':
                this.player.inventory.metal = (this.player.inventory.metal || 0) + t.amount;
                this.showFloatingText(`+${t.amount} ⚙️`, '#868e96');
                break;
        }
        
        // 科技点加到玩家身上
        this.player.addTechPoints(2);
        this.updateInventoryUI();
        this.updateHUD();
    }
    
    // 渲染环境对象
    renderEnvironment() {
        const ctx = this.ctx;
        const time = Date.now() / 1000;
        
        // 渲染礁石
        if (this.rocks) {
            for (const r of this.rocks) {
                ctx.save();
                ctx.translate(r.x, r.y);
                
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 5;
                
                ctx.fillStyle = '#5a5a5a';
                ctx.beginPath();
                ctx.ellipse(0, 0, r.size, r.size * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#6e6e6e';
                ctx.beginPath();
                ctx.arc(-r.size*0.3, -r.size*0.2, r.size*0.3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        }
        
        // 渲染洋流区域
        if (this.currentZones) {
            for (const c of this.currentZones) {
                ctx.save();
                ctx.translate(c.x, c.y);
                
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, c.radius);
                if (c.type === 'boost') {
                    gradient.addColorStop(0, 'rgba(100, 255, 100, 0.3)');
                    gradient.addColorStop(1, 'rgba(100, 255, 100, 0)');
                } else {
                    gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
                }
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.rotate(time * 2);
                ctx.strokeStyle = c.type === 'boost' ? 'rgba(100,255,100,0.5)' : 'rgba(255,100,100,0.5)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(c.radius * 0.5, 0);
                    ctx.lineTo(c.radius * 0.7, 0);
                    ctx.stroke();
                    ctx.rotate(Math.PI / 2);
                }
                
                ctx.restore();
            }
        }
        
        // 渲染宝藏箱
        if (this.treasures) {
            for (const t of this.treasures) {
                if (t.collected) continue;
                
                ctx.save();
                ctx.translate(t.x, t.y);
                
                const bob = Math.sin(time * 3 + t.bobOffset) * 5;
                ctx.translate(0, bob);
                
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 15;
                
                ctx.font = '28px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(t.icon, 0, 0);
                
                ctx.restore();
            }
        }
    }
    
    // 检查成就
    checkAchievement(id) {
        if (!this.achievements) {
            this.achievements = {};
        }
        
        if (this.achievements[id]) return;
        
        const achievements = {
            treasure_hunter: { name: '寻宝猎人', desc: '收集5个宝藏', target: 5 },
            survivor: { name: '幸存者', desc: '存活5分钟', target: 300 },
            hunter: { name: '猎人', desc: '击败10个敌人', target: 10 },
            explorer: { name: '探险家', desc: '探索5000距离', target: 5000 }
        };
        
        const ach = achievements[id];
        if (!ach) return;
        
        this.achievements[id] = (this.achievements[id] || 0) + 1;
        
        if (this.achievements[id] >= ach.target) {
            this.showFloatingText(`🏆 成就解锁: ${ach.name}!`, '#ffd700');
        }
    }
    
    // 显示浮动文字
    showFloatingText(text, color) {
        if (!this.floatingTexts) this.floatingTexts = [];
        
        this.floatingTexts.push({
            text,
            color: color || '#fff',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            age: 0,
            duration: 2000
        });
    }
    
    // 更新浮动文字
    updateFloatingTexts(dt) {
        if (!this.floatingTexts) return;
        
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.age += dt * 1000;
            ft.y -= dt * 30;
            
            if (ft.age > ft.duration) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }
    
    // 渲染浮动文字
    renderFloatingTexts() {
        if (!this.floatingTexts) return;
        
        const ctx = this.ctx;
        
        for (const ft of this.floatingTexts) {
            const alpha = 1 - ft.age / ft.duration;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // 渲染其他玩家（多人模式）
    renderOtherPlayers(ctx) {
        if (!this.multiplayer) return;
        const others = this.multiplayer.getOtherPlayers();
        if (!others || others.size === 0) return;

        const now = Date.now();
        for (const [id, p] of others) {
            ctx.save();

            // 透明度：刚更新的玩家更不透明
            const age = now - (p.lastUpdate || 0);
            const alpha = age < 2000 ? 1.0 : (age < 10000 ? 0.7 : 0.4);
            ctx.globalAlpha = alpha;

            // 用 spriteManager 渲染他们的船
            if (window.spriteManager) {
                window.spriteManager.render(ctx, p.stage || 'raft', 0, p.x, p.y, p.rotation, 1);
            } else {
                // 回退
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.fillStyle = '#8888ff';
                ctx.fillRect(-20, -14, 40, 28);
            }

            ctx.restore();

            // 显示昵称
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.globalAlpha = alpha;
            ctx.fillText(p.nickname || '?', p.x, p.y - 30);

            // 显示 HP 条
            const hp = p.hp || 0;
            const maxHp = CONFIG.STAGES[p.stage || 'raft'] ? CONFIG.STAGES[p.stage || 'raft'].hp : 80;
            const hpPct = Math.max(0, Math.min(1, hp / maxHp));
            const barW = 36;
            const barH = 3;
            const barX = p.x - barW / 2;
            const barY = p.y - 26;
            ctx.fillStyle = 'rgba(50,50,80,0.8)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#f87171';
            ctx.fillRect(barX, barY, barW * hpPct, barH);

            ctx.restore();
        }
    }

    // 渲染调试信息
    renderDebug() {
        if (!this.player) return;

        const ctx = this.ctx;
        ctx.save();

        // 显示玩家位置和按键状态
        ctx.fillStyle = this._useInterval ? '#ff0' : '#0f0';
        ctx.font = '14px monospace';
        ctx.fillText(`Loop: ${this._useInterval ? 'setInterval' : 'RAF'} | FPS: ${Math.round(1/Math.max(this.deltaTime,0.001))}`, 10, 100);
        ctx.fillText(`Pos: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`, 10, 120);
        ctx.fillText(`Rot: ${Math.round(this.player.rotation * 180 / Math.PI)}°`, 10, 140);
        ctx.fillText(`Keys: ${this.keys.up?'↑':'_'} ${this.keys.down?'↓':'_'} ${this.keys.left?'←':'_'} ${this.keys.right?'→':'_'}`, 10, 160);
        ctx.fillText(`Vel: ${Math.round(this.player.vx)}, ${Math.round(this.player.vy)}`, 10, 180);

        // 多人模式信息
        if (this.multiplayer) {
            const mpColor = this.multiplayer.connected ? '#4ade80' : '#f87171';
            ctx.fillStyle = mpColor;
            const status = this.multiplayer.connected ? 'ONLINE' : 'OFFLINE';
            const count = this.multiplayer.playerCount || 0;
            ctx.fillText(`MP: ${status} | Players: ${count}`, 10, 200);
        }

        ctx.restore();
    }

    // ==================== AI 管理面板 / 船载 Agent ====================

    // AI 日志辅助方法
    _aiLog(msg) {
        const log = document.getElementById('ai-log');
        if (!log) return;
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        log.innerHTML = `<div style="margin-bottom:4px;"><span style="color:#4fc3f7;">[${time}]</span> ${msg}</div>` + log.innerHTML;
        // 限制日志条数
        const items = log.querySelectorAll('div');
        if (items.length > 50) {
            items[items.length - 1].remove();
        }
    }

    // 更新 Agent 聊天记录 UI
    _updateCompanionChatLog() {
        const chatLog = document.getElementById('companion-chat-log');
        if (!chatLog || !this.companion) return;

        const history = this.companion.chatHistory.slice(-15);
        chatLog.innerHTML = history.map(m => {
            const isAgent = m.from === 'agent';
            const time = new Date(m.time).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const align = isAgent ? 'left' : 'right';
            const color = isAgent ? '#4fc3f7' : '#a5d6a7';
            const name = isAgent ? `🤖 ${this.companion.name}` : '🧑 你';
            return `<div style="margin:4px 0;text-align:${align};">` +
                `<span style="font-size:0.65rem;color:#666;">${time}</span> ` +
                `<span style="color:${color};font-weight:bold;">${name}</span><br>` +
                `<span style="color:#ddd;">${m.text}</span></div>`;
        }).join('');

        // 滚动到底部
        chatLog.scrollTop = chatLog.scrollHeight;

        // 更新 Agent 名字和情绪显示
        const nameEl = document.getElementById('companion-name-display');
        const moodEl = document.getElementById('companion-mood');
        if (nameEl) nameEl.textContent = this.companion.name;
        if (moodEl) moodEl.textContent = this.companion.getMoodEmoji();

        // 更新模式按钮状态
        document.querySelectorAll('.btn-mode').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === this.companion.autoMode);
        });
    }

    // 更新 AI 面板状态摘要（集成 Agent 信息）
    updateAIPanel() {
        if (!this.player) return;

        const status = document.getElementById('ai-status');
        if (!status) return;

        const p = this.player;
        const hpPct = Math.round(p.getHpPercent() * 100);
        const enemyCount = this.enemies ? this.enemies.filter(e => !e.isDead).length : 0;
        const resourceCount = this.resourceNodes ? this.resourceNodes.length : 0;
        const treasureCount = this.treasures ? this.treasures.filter(t => !t.collected).length : 0;
        const questDone = this.quests ? this.quests.getCompletedCount() : 0;
        const questTotal = this.quests ? this.quests.getTotalCount() : 0;
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);

        // Agent 信息
        let agentHtml = '';
        if (this.companion) {
            const c = this.companion;
            const expPct = Math.round((c.exp / (c.level * 100)) * 100);
            agentHtml = `
                <div style="border-top:1px solid rgba(79,195,247,0.2);padding-top:6px;margin-top:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span>🤖 <strong>${c.name}</strong> Lv.${c.level}</span>
                        <span>${c.getMoodEmoji()} ${c.mood}</span>
                    </div>
                    <div style="margin-top:3px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
                        <div style="height:100%;width:${expPct}%;background:#4fc3f7;border-radius:2px;"></div>
                    </div>
                    <div style="font-size:0.7rem;color:#666;margin-top:2px;">EXP ${c.exp}/${c.level * 100} | 模式: ${c.autoMode}</div>
                </div>
            `;
        }

        status.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                <div>🚢 <strong>${p.name}</strong></div>
                <div>❤️ HP: ${hpPct}%</div>
                <div>📦 货物: ${p.getInventoryTotal()}/${p.cargo}</div>
                <div>🔧 科技点: ${p.techPoints}</div>
                <div>⚔️ 敌人: ${enemyCount}</div>
                <div>🪵 资源: ${resourceCount}</div>
                <div>🎁 宝箱: ${treasureCount}</div>
                <div>📋 任务: ${questDone}/${questTotal}</div>
                <div>⏱️ 时间: ${minutes}分${seconds}秒</div>
                <div>🌊 位置: (${Math.round(p.x)}, ${Math.round(p.y)})</div>
            </div>
            ${agentHtml}
        `;

        // 更新 Agent 性格详情（折叠面板内）
        const detailsEl = document.getElementById('companion-details');
        if (detailsEl && this.companion) {
            const c = this.companion;
            const p = c.personality;
            const sk = c.skills;
            const skillNames = {
                navigation: '🧭 导航', combat: '⚔️ 战斗',
                trading: '💰 交易', crafting: '🔨 制作', survival: '🛡️ 生存'
            };
            const personalityBars = Object.entries(p).map(([k, v]) => {
                const names = { cautious: '谨慎', aggressive: '攻击', explorer: '探索', social: '社交' };
                const colors = { cautious: '#fbbf24', aggressive: '#f87171', explorer: '#4ade80', social: '#818cf8' };
                return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
                    <span style="width:40px;font-size:0.7rem;">${names[k] || k}</span>
                    <div style="flex:1;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${v}%;background:${colors[k] || '#4fc3f7'};border-radius:3px;"></div>
                    </div>
                    <span style="font-size:0.65rem;width:25px;text-align:right;">${v}</span>
                </div>`;
            }).join('');
            const skillList = Object.entries(sk).map(([k, v]) =>
                `<span>${skillNames[k] || k}: Lv.${v}</span>`
            ).join(' ');

            detailsEl.innerHTML = `
                <div style="margin-bottom:6px;">${personalityBars}</div>
                <div style="color:#888;">技能: ${skillList}</div>
                <div style="color:#666;margin-top:4px;font-size:0.7rem;">建议数: ${c.stats.totalSuggestions} | 聊天数: ${c.stats.totalChats}</div>
            `;
        }

        // 更新聊天记录
        this._updateCompanionChatLog();
    }

    // AI 生成新内容（通过 Agent 传达）
    aiEvolve() {
        if (!this.player || this.state !== 'playing') return;

        // 使用 AIService 生成随机事件
        const event = this.ai.generateEvent({
            stage: this.player.stage,
            time: this.gameTime
        });

        // 通过 Agent 传达事件
        if (this.companion) {
            this.companion.addMessage(`📜 新事件：${event.description}`);
        }
        this._aiLog(`📜 事件: ${event.description}`);
        this._aiLog(`📌 类型: ${event.type === 'positive' ? '✅ 正面' : event.type === 'negative' ? '⚠️ 负面' : '➖ 中性'}`);

        // 应用事件效果
        if (event.effects) {
            if (event.effects.gained) {
                for (const [item, amount] of Object.entries(event.effects.gained)) {
                    const key = this._resourceNameToKey(item);
                    if (key) {
                        this.player.inventory[key] = (this.player.inventory[key] || 0) + amount;
                        this._aiLog(`🎁 获得: ${item} ×${amount}`);
                        this.showFloatingText(`+${amount} ${item}`, '#00ff88');
                    }
                }
            }
            if (event.effects.lost) {
                for (const [item, amount] of Object.entries(event.effects.lost)) {
                    const key = this._resourceNameToKey(item);
                    if (key) {
                        const current = this.player.inventory[key] || 0;
                        const lost = Math.min(current, amount);
                        this.player.inventory[key] = current - lost;
                        if (lost > 0) {
                            this._aiLog(`⚠️ 失去: ${item} ×${lost}`);
                            this.showFloatingText(`-${lost} ${item}`, '#f87171');
                        }
                    }
                }
            }
        }

        // 随机生成新敌人类型（本地模板）
        this._aiGenerateNewEnemy();

        // 随机生成新事件触发
        if (Math.random() < 0.4) {
            this._aiGenerateNewResourceNode();
        }

        // Agent 经验
        if (this.companion) {
            this.companion.gainExp(20);
            this.companion.adaptPersonality('explore');
        }

        this.updateInventoryUI();
        this.updateHUD();
        this._updateCompanionChatLog();
        this._aiLog('✅ 内容生成完毕');
    }

    // AI 分析并给出建议（通过 Agent 传达）
    aiAdvisor() {
        if (!this.player) return;

        // 使用 Agent 的建议系统
        if (this.companion) {
            this.companion.giveSuggestion();
            this.companion.gainExp(10);
            this._updateCompanionChatLog();
        }

        this._aiLog('💡 Agent 已给出建议');

        // 同时在日志中显示详细分析
        const p = this.player;
        const hpPct = p.getHpPercent();
        if (hpPct < 0.3) {
            this._aiLog('🔴 生命值过低！建议寻找食物回复或避免战斗');
        } else if (hpPct < 0.6) {
            this._aiLog('🟡 生命值偏低，注意收集食物');
        } else {
            this._aiLog('🟢 生命值充足，可以大胆探索');
        }

        const cargoPct = p.getInventoryTotal() / p.cargo;
        if (cargoPct > 0.8) {
            this._aiLog('📦 货物快满了，考虑进化消耗');
        }

        // 进化阶段建议
        try {
            const evolutions = this.evolution.getAvailableEvolutions(p);
            if (evolutions && evolutions.length > 0) {
                const canEvolve = evolutions.filter(e => e.canEvolve);
                if (canEvolve.length > 0) {
                    this._aiLog(`🌟 可以进化为: ${canEvolve.map(e => e.name).join('、')}`);
                }
            }
        } catch (e) {}
    }

    // AI 状态分析（通过 Agent 传达）
    aiStatus() {
        if (!this.player) return;

        const p = this.player;

        // 通过 Agent 分析
        if (this.companion) {
            const summary = this.companion.getStatusSummary();
            this.companion.addMessage(`📊 状态分析：HP ${Math.round(p.getHpPercent() * 100)}%，${p.name}，科技${p.techPoints}`);
            this.companion.gainExp(10);
            this._updateCompanionChatLog();
        }

        this._aiLog('📊 AI 开始全面分析...');

        // 载具状态
        this._aiLog(`🚢 载具: ${p.name} (阶段 ${p.stage})`);
        this._aiLog(`❤️ HP: ${Math.floor(p.hp)}/${p.maxHp} (${Math.round(p.getHpPercent() * 100)}%)`);
        this._aiLog(`🚀 速度: ${p.speed}`);
        this._aiLog(`📦 容量: ${p.getInventoryTotal()}/${p.cargo}`);

        // 资源详情
        const inv = p.inventory;
        const resources = ['wood', 'food', 'water', 'metal', 'rope'];
        const resNames = { wood: '🪵木材', food: '🍖食物', water: '💧淡水', metal: '⚙️金属', rope: '🪢绳索' };
        let resLog = '📦 资源: ';
        for (const r of resources) {
            if (inv[r] && inv[r] > 0) {
                resLog += `${resNames[r]}:${inv[r]} `;
            }
        }
        this._aiLog(resLog);

        // 武器
        const weapon = p.getCurrentWeapon ? p.getCurrentWeapon() : null;
        this._aiLog(`⚔️ 武器: ${weapon ? weapon.name : '无'}`);

        // 技能
        if (this.skillSystem) {
            const skills = this.skillSystem.getSkillsPanelData();
            this._aiLog(`⚡ 技能数: ${skills.length}`);
            const readySkills = skills.filter(s => !s.onCooldown);
            if (readySkills.length > 0) {
                this._aiLog(`✅ 可用技能: ${readySkills.map(s => s.name).join('、')}`);
            }
        }

        // 任务进度
        if (this.quests) {
            const done = this.quests.getCompletedCount();
            const total = this.quests.getTotalCount();
            this._aiLog(`📋 任务: ${done}/${total} 完成`);
        }

        // 战斗统计
        const enemyCount = this.enemies ? this.enemies.filter(e => !e.isDead).length : 0;
        this._aiLog(`⚔️ 当前敌人: ${enemyCount}`);

        // 洋流状态
        this._aiLog(`🌊 洋流: x=${this.drift.x.toFixed(1)}, y=${this.drift.y.toFixed(1)}`);

        // Agent 信息
        if (this.companion) {
            const c = this.companion;
            this._aiLog(`🤖 Agent: ${c.name} Lv.${c.level} | ${c.getMoodEmoji()}${c.mood} | 建议${c.stats.totalSuggestions}次`);
        }

        this._aiLog('✅ 分析完毕');
    }

    // 辅助：中文资源名转英文 key
    _resourceNameToKey(name) {
        const map = {
            '木材': 'wood', '木头': 'wood',
            '金属': 'metal', '矿石': 'metal',
            '布料': 'rope', '绳索': 'rope',
            '食物': 'food',
            '淡水': 'water', '水': 'water',
            '燃料': 'wood'
        };
        return map[name] || null;
    }

    // AI 生成新敌人（本地模板，增强玩法多样性）
    _aiGenerateNewEnemy() {
        if (!this.player) return;

        // 根据游戏阶段生成不同难度的敌人
        const stageMultipliers = {
            raft: 1, canoe: 1.2, sailboat: 1.5, steamship: 2, battleship: 2.5
        };
        const mult = stageMultipliers[this.player.stage] || 1;

        // 随机选择敌人类型
        const types = Object.keys(CONFIG.ENEMIES);
        const type = types[Math.floor(Math.random() * types.length)];

        // 在玩家周围随机位置生成
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;

        const enemy = new Enemy(x, y, type);

        // 根据阶段强化
        enemy.maxHp = Math.floor(enemy.maxHp * mult);
        enemy.hp = enemy.maxHp;
        enemy.damage = Math.floor(enemy.damage * mult);

        this.enemies.push(enemy);
        this._aiLog(`👾 新增敌人: ${enemy.name} (HP:${enemy.maxHp} DMG:${enemy.damage})`);
    }

    // AI 生成新资源节点
    _aiGenerateNewResourceNode() {
        if (!this.player) return;

        const types = ['wood', 'food', 'water', 'metal'];
        const type = types[Math.floor(Math.random() * types.length)];
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 350;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;

        const resource = {
            x, y,
            type,
            amount: 5 + Math.floor(Math.random() * 10),
            collected: false
        };

        if (!this.resourceNodes) this.resourceNodes = [];
        this.resourceNodes.push(resource);

        const icons = { wood: '🪵', food: '🍖', water: '💧', metal: '⚙️' };
        this._aiLog(`📍 新资源: ${icons[type]} ×${resource.amount}`);
    }
}

// 启动游戏
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        window.game = new Game();
    });
} else {
    // DOM已经加载完成，直接初始化
    window.game = new Game();
}
