// 船载 AI Agent - 小舵
// Companion system: explore → discover → suggest → player decides → execute → feedback

class CompanionAgent {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        this.name = "小舵";
        this.level = 1;
        this.exp = 0;

        // 性格特征 (0-100)
        this.personality = {
            cautious: 50,    // 谨慎度：高则更多避战建议
            aggressive: 50,  // 攻击性：高则更多战斗建议
            explorer: 50,    // 探索欲：高则更多探索建议
            social: 50       // 社交性：高则更多交易建议
        };

        // 情绪状态
        this.mood = "neutral"; // neutral/happy/worried/excited/tired
        this.moodValue = 50;   // 0-100

        // 技能
        this.skills = {
            navigation: 1,   // 导航：发现远处目标
            combat: 1,       // 战斗：提高命中率
            trading: 1,      // 交易：更好的价格
            crafting: 1,     // 制作：降低进化成本
            survival: 1      // 生存：提高恢复速度
        };

        // 聊天记录
        this.chatHistory = [];
        this.lastMessage = "";
        this.lastMessageTime = 0;

        // 自主行为状态
        this.autoMode = "balanced"; // balanced/explore/combat/collect
        this.suggestionCooldown = 0;
        this.suggestionInterval = 15; // 每15秒给一次建议

        // 浮动消息（显示在船附近）
        this.floatingMessages = [];

        // 经验统计
        this.stats = {
            totalSuggestions: 0,
            totalChats: 0,
            resourcesCollected: 0,
            enemiesDetected: 0,
            evolutionsNotified: 0
        };
    }

    // === 主更新循环 ===
    update(dt) {
        // 更新情绪
        this.updateMood(dt);
        // 更新建议冷却
        this.suggestionCooldown -= dt;
        // 给出建议
        if (this.suggestionCooldown <= 0) {
            this.giveSuggestion();
            this.suggestionCooldown = this.suggestionInterval;
        }
        // 更新浮动消息
        this.updateFloatingMessages(dt);
        // 自主行为
        this.autoBehavior(dt);
    }

    // === 情绪系统 ===
    updateMood(dt) {
        const hp = this.player.hp / this.player.maxHp;
        const enemyNear = (this.game.enemies || []).some(e => {
            if (e.isDead) return false;
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            return Math.sqrt(dx * dx + dy * dy) < 200;
        });

        if (hp < 0.3) {
            this.mood = "worried";
            this.moodValue = Math.max(0, this.moodValue - dt * 10);
        } else if (enemyNear) {
            this.mood = "excited";
            this.moodValue = Math.min(100, this.moodValue + dt * 5);
        } else if (hp > 0.8) {
            this.mood = "happy";
            this.moodValue = Math.min(100, this.moodValue + dt * 2);
        } else {
            this.mood = "neutral";
            this.moodValue = 50;
        }
    }

    // === 建议系统 ===
    giveSuggestion() {
        if (this.game.state !== 'playing') return;

        const suggestions = [];

        // 检查资源
        const inv = this.player.inventory || {};
        if ((inv.wood || 0) < 5) {
            suggestions.push({
                text: "🪵 木材不足！注意收集漂流的木材。",
                priority: 80,
                action: "collect_wood"
            });
        }

        if ((inv.food || 0) < 3) {
            suggestions.push({
                text: "🍖 食物储备不足，注意寻找食物来源。",
                priority: 70,
                action: "collect_food"
            });
        }

        if ((inv.water || 0) < 2) {
            suggestions.push({
                text: "💧 淡水不足，寻找水源补给！",
                priority: 65,
                action: "collect_water"
            });
        }

        // 检查HP
        const hpPct = this.player.hp / this.player.maxHp;
        if (hpPct < 0.3) {
            suggestions.push({
                text: "⚠️ 生命值过低！建议暂时回避战斗，寻找恢复物品。",
                priority: 95,
                action: "retreat"
            });
        } else if (hpPct < 0.5) {
            suggestions.push({
                text: "💛 生命值偏低，注意收集食物恢复。",
                priority: 75,
                action: "heal"
            });
        }

        // 检查附近敌人
        const nearEnemies = (this.game.enemies || []).filter(e => {
            if (e.isDead) return false;
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            return Math.sqrt(dx * dx + dy * dy) < 200;
        });

        if (nearEnemies.length > 0) {
            const nearest = nearEnemies[0];
            const dist = Math.round(Math.sqrt(
                (nearest.x - this.player.x) ** 2 +
                (nearest.y - this.player.y) ** 2
            ));

            if (nearEnemies.length >= 4) {
                suggestions.push({
                    text: `🚨 多个敌人逼近！建议全速撤离！`,
                    priority: 92,
                    action: "flee"
                });
            } else if (this.personality.cautious > 60) {
                suggestions.push({
                    text: `👀 发现${nearest.name || '敌人'}在${dist}距离处，小心行驶。`,
                    priority: 85,
                    action: "avoid"
                });
            } else if (this.personality.aggressive > 60) {
                suggestions.push({
                    text: `⚔️ 发现${nearest.name || '敌人'}！可以尝试击败它获取资源。`,
                    priority: 75,
                    action: "attack"
                });
            } else {
                suggestions.push({
                    text: `👀 附近有${nearEnemies.length}个敌人，注意警戒。`,
                    priority: 70,
                    action: "alert"
                });
            }
            this.stats.enemiesDetected++;
        }

        // 检查进化条件
        if (this.game.evolution) {
            try {
                const available = this.game.evolution.getAvailableEvolutions(this.player);
                if (available && available.length > 0) {
                    const canEvolve = available.filter(e => e.canEvolve);
                    if (canEvolve.length > 0) {
                        suggestions.push({
                            text: `🚀 已满足进化条件！可以进化为${canEvolve[0].name}。`,
                            priority: 98,
                            action: "evolve"
                        });
                        this.stats.evolutionsNotified++;
                    }
                }
            } catch (e) {
                // evolution system might not be ready
            }
        }

        // 检查附近资源点
        const nearResource = (this.game.resourceNodes || []).find(r => {
            if (r.collected) return false;
            const dx = r.x - this.player.x;
            const dy = r.y - this.player.y;
            return Math.sqrt(dx * dx + dy * dy) < 300;
        });
        if (nearResource && this.personality.explorer > 50) {
            const icons = { wood: '🪵木材', food: '🍖食物', water: '💧淡水', metal: '⚙️金属' };
            suggestions.push({
                text: `📍 发现${icons[nearResource.type] || '资源'}点，可以前往收集！`,
                priority: 55,
                action: "collect"
            });
        }

        // 检查附近宝藏
        const nearTreasure = (this.game.treasures || []).find(t => {
            if (t.collected) return false;
            const dx = t.x - this.player.x;
            const dy = t.y - this.player.y;
            return Math.sqrt(dx * dx + dy * dy) < 250;
        });
        if (nearTreasure) {
            suggestions.push({
                text: `🎁 附近有宝箱！快去开启获取丰厚奖励！`,
                priority: 88,
                action: "treasure"
            });
        }

        // 检查任务进度
        if (this.game.quests) {
            const nearlyDone = this.game.quests.quests.filter(q => {
                if (this.game.quests.isCompleted(q.id)) return false;
                const progress = this.game.quests.getProgress(q);
                return progress / q.target > 0.8;
            });
            if (nearlyDone.length > 0) {
                suggestions.push({
                    text: `📋 任务"${nearlyDone[0].name}"即将完成！再努力一点！`,
                    priority: 82,
                    action: "quest"
                });
            }
        }

        // 选择最高优先级建议
        if (suggestions.length > 0) {
            suggestions.sort((a, b) => b.priority - a.priority);
            this.addMessage(suggestions[0].text);
            this.stats.totalSuggestions++;
        }

        // 根据性格给随机鼓励
        if (suggestions.length === 0 && Math.random() < 0.3) {
            const moodTexts = {
                happy: ["一切顺利！继续探索吧~", "今天航行很顺利呢！", "心情不错，继续前进！"],
                worried: ["要小心一点...", "注意安全...", "我有点担心..."],
                excited: ["好刺激！", "战斗来了！准备好了！", "心跳加速！"],
                neutral: ["继续航行中...", "周围平静无事。", "保持警戒。"],
                tired: ["有点累了...", "需要休息一下...", "体力下降了..."]
            };
            const texts = moodTexts[this.mood] || moodTexts.neutral;
            this.addMessage(texts[Math.floor(Math.random() * texts.length)]);
        }
    }

    // === 聊天系统 ===
    // HTML转义防XSS
    _escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    addMessage(text) {
        this.lastMessage = text;
        this.lastMessageTime = Date.now();
        this.chatHistory.push({
            text: this._escapeHtml(text),
            time: Date.now(),
            from: "agent"
        });
        if (this.chatHistory.length > 50) this.chatHistory.shift();
        this.addFloatingMessage(text);
    }

    chat(playerMessage) {
        this.chatHistory.push({
            text: this._escapeHtml(playerMessage),
            time: Date.now(),
            from: "player"
        });
        if (this.chatHistory.length > 50) this.chatHistory.shift();

        this.stats.totalChats++;

        // 智能回复
        const response = this.generateResponse(playerMessage);
        this.addMessage(response);
        return response;
    }

    generateResponse(input) {
        const lower = input.toLowerCase();

        if (lower.includes("你好") || lower.includes("hi") || lower.includes("hello") || lower.includes("嗨")) {
            const greetings = [
                `你好！我是${this.name}，你的船载AI助手。有什么需要帮忙的？`,
                `嗨！今天航海愉快！我在随时待命~`,
                `你好呀！海面状况不错，准备出发了吗？`
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }

        if (lower.includes("状态") || lower.includes("status") || lower.includes("情况")) {
            const inv = this.player.inventory || {};
            return `📊 当前状态：HP ${Math.round(this.player.hp)}/${this.player.maxHp}，` +
                `阶段：${this.player.name}，情绪：${this.getMoodEmoji()}${this.mood}，` +
                `资源：木${inv.wood || 0} 食${inv.food || 0} 水${inv.water || 0} 金${inv.metal || 0}`;
        }

        if (lower.includes("建议") || lower.includes("help") || lower.includes("怎么办") || lower.includes("做什么")) {
            this.giveSuggestion();
            return this.lastMessage;
        }

        if (lower.includes("进化") || lower.includes("evolve") || lower.includes("升级")) {
            try {
                const available = this.game.evolution?.getAvailableEvolutions(this.player) || [];
                if (available.length > 0) {
                    const info = available.map(e => {
                        const costStr = Object.entries(e.cost)
                            .map(([k, v]) => `${this.game.evolution.getResourceName(k)}:${v}`)
                            .join(' ');
                        return `${e.name}(${e.canEvolve ? '✅可进化' : costStr})`;
                    }).join('、');
                    return `🚀 可选进化：${info}`;
                }
            } catch (e) {}
            return "暂时无法进化，继续收集资源吧！坚持就是胜利~";
        }

        if (lower.includes("敌人") || lower.includes("enemy") || lower.includes("危险")) {
            const near = (this.game.enemies || []).filter(e => {
                if (e.isDead) return false;
                const dx = e.x - this.player.x;
                const dy = e.y - this.player.y;
                return Math.sqrt(dx * dx + dy * dy) < 400;
            });
            if (near.length > 0) {
                const nearest = near[0];
                const dist = Math.round(Math.sqrt(
                    (nearest.x - this.player.x) ** 2 + (nearest.y - this.player.y) ** 2
                ));
                return `⚔️ 附近有${near.length}个敌人，最近的"${nearest.name || '未知'}"在${dist}距离处。${this.personality.cautious > 60 ? '建议小心回避！' : '可以考虑迎战！'}`;
            }
            return "✅ 目前附近没有敌人，可以安全探索。";
        }

        if (lower.includes("资源") || lower.includes("resource") || lower.includes("背包") || lower.includes("inventory")) {
            const inv = this.player.inventory || {};
            const items = [];
            if (inv.wood) items.push(`🪵木材:${inv.wood}`);
            if (inv.food) items.push(`🍖食物:${inv.food}`);
            if (inv.water) items.push(`💧淡水:${inv.water}`);
            if (inv.metal) items.push(`⚙️金属:${inv.metal}`);
            if (inv.rope) items.push(`🪢绳索:${inv.rope}`);
            return `📦 当前资源：${items.length > 0 ? items.join('，') : '空空如也'}。容量：${this.player.getInventoryTotal()}/${this.player.cargo}`;
        }

        if (lower.includes("任务") || lower.includes("quest")) {
            if (this.game.quests) {
                const done = this.game.quests.getCompletedCount();
                const total = this.game.quests.getTotalCount();
                const active = this.game.quests.quests.filter(q => !this.game.quests.isCompleted(q.id));
                if (active.length > 0) {
                    const q = active[0];
                    const progress = this.game.quests.getProgress(q);
                    return `📋 任务进度：${done}/${total}完成。当前任务"${q.name}"：${progress}/${q.target}`;
                }
                return `📋 所有${total}个任务已完成！🎉`;
            }
            return "📋 任务系统暂未加载。";
        }

        if (lower.includes("技能") || lower.includes("skill")) {
            if (this.game.skillSystem) {
                const skills = this.game.skillSystem.getSkillsPanelData();
                const ready = skills.filter(s => !s.onCooldown);
                return `⚡ 已学技能${skills.length}个，${ready.length}个可用：${ready.map(s => s.name).join('、') || '无'}`;
            }
            return "⚡ 技能系统暂未加载。";
        }

        if (lower.includes("天气") || lower.includes("weather") || lower.includes("洋流")) {
            const drift = this.game.drift || { x: 0, y: 0 };
            const strength = Math.sqrt(drift.x * drift.x + drift.y * drift.y);
            const dir = strength < 0.5 ? '平静' : drift.x > 0 ? '向东' : '向西';
            return `🌊 洋流状态：${dir}（强度${strength.toFixed(1)}），注意航行方向。`;
        }

        if (lower.includes("你的") || lower.includes("名字") || lower.includes("name") || lower.includes("你是谁")) {
            return `🤖 我是${this.name}，Lv.${this.level}船载AI助手。我的性格倾向：谨慎${this.personality.cautious}、攻击${this.personality.aggressive}、探索${this.personality.explorer}、社交${this.personality.social}。`;
        }

        if (lower.includes("性格") || lower.includes("personality")) {
            return `🧠 我的性格：谨慎度${this.personality.cautious}/100，攻击性${this.personality.aggressive}/100，探索欲${this.personality.explorer}/100，社交性${this.personality.social}/100。`;
        }

        if (lower.includes("模式") || lower.includes("mode") || lower.includes("切换")) {
            const modes = ['balanced', 'explore', 'combat', 'collect'];
            const modeNames = { balanced: '平衡', explore: '探索', combat: '战斗', collect: '收集' };
            const idx = (modes.indexOf(this.autoMode) + 1) % modes.length;
            this.autoMode = modes[idx];
            return `🔄 已切换为${modeNames[this.autoMode]}模式！`;
        }

        if (lower.includes("加油") || lower.includes("鼓励") || lower.includes("fight")) {
            this.moodValue = Math.min(100, this.moodValue + 20);
            const cheers = [
                "💪 谢谢鼓励！我会更加努力的！",
                "🎉 一起加油！我们一定能走得更远！",
                "⭐ 有你这句话，我动力满满！",
                "🔥 冲冲冲！向着大海的尽头前进！"
            ];
            return cheers[Math.floor(Math.random() * cheers.length)];
        }

        // 默认回复
        const defaults = [
            "收到！我会继续观察周围环境。",
            "明白了，让我想想...",
            "好的，我会注意的。",
            "了解！有什么需要随时告诉我。",
            "嗯嗯，我会帮你留意的~",
            "没问题！我在时刻关注着周围。"
        ];
        return defaults[Math.floor(Math.random() * defaults.length)];
    }

    getMoodEmoji() {
        const emojis = {
            happy: '😊',
            worried: '😰',
            excited: '⚡',
            neutral: '😐',
            tired: '😴'
        };
        return emojis[this.mood] || '😐';
    }

    // === 浮动消息 ===
    addFloatingMessage(text) {
        this.floatingMessages.push({
            text: text.substring(0, 40) + (text.length > 40 ? "..." : ""),
            x: this.player.x,
            y: this.player.y - 45,
            alpha: 1,
            life: 4
        });
        if (this.floatingMessages.length > 3) this.floatingMessages.shift();
    }

    updateFloatingMessages(dt) {
        for (let i = this.floatingMessages.length - 1; i >= 0; i--) {
            const msg = this.floatingMessages[i];
            msg.life -= dt;
            msg.y -= dt * 15;
            msg.alpha = Math.max(0, msg.life / 4);
            if (msg.life <= 0) this.floatingMessages.splice(i, 1);
        }
    }

    renderFloatingMessages(ctx) {
        for (const msg of this.floatingMessages) {
            ctx.save();
            ctx.globalAlpha = msg.alpha;

            // 背景气泡
            ctx.font = "bold 11px 'Microsoft YaHei', sans-serif";
            const metrics = ctx.measureText(msg.text);
            const padding = 6;
            const bw = metrics.width + padding * 2;
            const bh = 20;

            ctx.fillStyle = "rgba(10, 30, 60, 0.75)";
            ctx.beginPath();
            ctx.roundRect(msg.x - bw / 2, msg.y - bh / 2 - 2, bw, bh, 6);
            ctx.fill();

            // 边框
            ctx.strokeStyle = "rgba(79, 195, 247, 0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // 文字
            ctx.fillStyle = "#4fc3f7";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(msg.text, msg.x, msg.y - 2);

            // 小三角
            ctx.fillStyle = "rgba(10, 30, 60, 0.75)";
            ctx.beginPath();
            ctx.moveTo(msg.x - 4, msg.y + bh / 2 - 2);
            ctx.lineTo(msg.x + 4, msg.y + bh / 2 - 2);
            ctx.lineTo(msg.x, msg.y + bh / 2 + 4);
            ctx.fill();

            ctx.restore();
        }
    }

    // === 自主行为 ===
    autoBehavior(dt) {
        if (this.autoMode === "collect") {
            // 自动收集附近资源 - 给予提示
            const near = (this.game.resourceNodes || []).find(r => {
                if (r.collected) return false;
                const dx = r.x - this.player.x;
                const dy = r.y - this.player.y;
                return Math.sqrt(dx * dx + dy * dy) < 100;
            });
            if (near) {
                const icons = { wood: '🪵', food: '🍖', water: '💧', metal: '⚙️' };
                // 给出方向提示
                const dx = near.x - this.player.x;
                const dy = near.y - this.player.y;
                const dir = Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? '→右方' : '←左方')
                    : (dy > 0 ? '↓下方' : '↑上方');
                if (Math.random() < 0.02) {
                    this.addMessage(`${icons[near.type] || '📦'} 资源在${dir}，靠近即可收集！`);
                }
            }
        }

        if (this.autoMode === "explore") {
            // 探索模式：提示远处的资源和宝藏
            const far = (this.game.treasures || []).find(t => {
                if (t.collected) return false;
                const dx = t.x - this.player.x;
                const dy = t.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist > 200 && dist < 500;
            });
            if (far && Math.random() < 0.01) {
                this.addMessage("🔭 远方似乎有宝箱的光芒！往那边看看？");
            }
        }
    }

    // === 成长系统 ===
    gainExp(amount) {
        this.exp += amount;
        const needed = this.level * 100;
        if (this.exp >= needed) {
            this.exp -= needed;
            this.level++;
            this.addMessage(`🎉 升级了！我现在${this.level}级了！`);
            // 随机提升一个技能
            const skillKeys = Object.keys(this.skills);
            const randomSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
            this.skills[randomSkill]++;
            const skillNames = {
                navigation: '🧭 导航', combat: '⚔️ 战斗',
                trading: '💰 交易', crafting: '🔨 制作', survival: '🛡️ 生存'
            };
            this.addMessage(`技能提升：${skillNames[randomSkill] || randomSkill} → Lv.${this.skills[randomSkill]}`);
        }
    }

    // === 适应性格 ===
    adaptPersonality(action) {
        switch (action) {
            case "attack":
                this.personality.aggressive = Math.min(100, this.personality.aggressive + 2);
                this.personality.cautious = Math.max(0, this.personality.cautious - 1);
                break;
            case "flee":
                this.personality.cautious = Math.min(100, this.personality.cautious + 2);
                this.personality.aggressive = Math.max(0, this.personality.aggressive - 1);
                break;
            case "explore":
                this.personality.explorer = Math.min(100, this.personality.explorer + 2);
                break;
            case "trade":
                this.personality.social = Math.min(100, this.personality.social + 2);
                break;
            case "collect":
                this.personality.explorer = Math.min(100, this.personality.explorer + 1);
                break;
        }
    }

    // === 获取状态摘要 ===
    getStatusSummary() {
        const inv = this.player.inventory || {};
        return {
            name: this.name,
            level: this.level,
            exp: this.exp,
            expNeeded: this.level * 100,
            mood: this.mood,
            moodEmoji: this.getMoodEmoji(),
            moodValue: Math.round(this.moodValue),
            autoMode: this.autoMode,
            personality: { ...this.personality },
            skills: { ...this.skills },
            stats: { ...this.stats },
            resources: {
                wood: inv.wood || 0,
                food: inv.food || 0,
                water: inv.water || 0,
                metal: inv.metal || 0,
                rope: inv.rope || 0
            }
        };
    }

    // === 序列化 ===
    toJSON() {
        return {
            name: this.name,
            level: this.level,
            exp: this.exp,
            personality: this.personality,
            skills: this.skills,
            autoMode: this.autoMode,
            stats: this.stats
        };
    }

    static fromJSON(data, player, game) {
        const agent = new CompanionAgent(player, game);
        if (data) {
            agent.name = data.name || "小舵";
            agent.level = data.level || 1;
            agent.exp = data.exp || 0;
            if (data.personality) {
                agent.personality = { ...agent.personality, ...data.personality };
            }
            if (data.skills) {
                agent.skills = { ...agent.skills, ...data.skills };
            }
            agent.autoMode = data.autoMode || "balanced";
            if (data.stats) {
                agent.stats = { ...agent.stats, ...data.stats };
            }
        }
        return agent;
    }
}
