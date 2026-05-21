// 任务/成就系统 - 给玩家目标感
class QuestSystem {
    constructor() {
        this.quests = this._getDefaultQuests();
        this.completed = {};
        this.stats = {
            collected: {},     // 收集统计 {wood: 10, food: 5, ...}
            enemiesKilled: 0,
            evolved: 0,
            survived: 0,       // 存活时间（秒）
            distanceTraveled: 0,
            damageDealt: 0,
            damageTaken: 0,
            treasuresOpened: 0,
            bugsReported: 0
        };
    }

    _getDefaultQuests() {
        return [
            // 生存任务
            { id: 'survive_60', name: '🌊 海上生存者', desc: '存活 60 秒', type: 'survive', target: 60, reward: { techPoints: 10 }, icon: '🌊' },
            { id: 'survive_180', name: '⚓ 老水手', desc: '存活 3 分钟', type: 'survive', target: 180, reward: { techPoints: 25 }, icon: '⚓' },
            { id: 'survive_300', name: '🧭 航海家', desc: '存活 5 分钟', type: 'survive', target: 300, reward: { techPoints: 50 }, icon: '🧭' },

            // 收集任务
            { id: 'collect_wood_10', name: '📦 木材收集者', desc: '收集 10 个木材', type: 'collect', resource: 'wood', target: 10, reward: { techPoints: 10 }, icon: '📦' },
            { id: 'collect_wood_50', name: '🪵 木材大亨', desc: '收集 50 个木材', type: 'collect', resource: 'wood', target: 50, reward: { techPoints: 30 }, icon: '🪵' },
            { id: 'collect_any_30', name: '🎣 资源猎手', desc: '收集任意 30 个物资', type: 'collect_any', target: 30, reward: { techPoints: 20 }, icon: '🎣' },
            { id: 'collect_any_100', name: '💎 资源大师', desc: '收集任意 100 个物资', type: 'collect_any', target: 100, reward: { techPoints: 50 }, icon: '💎' },

            // 战斗任务
            { id: 'kill_5', name: '⚔️ 初次战斗', desc: '击败 5 个敌人', type: 'kill', target: 5, reward: { techPoints: 15 }, icon: '⚔️' },
            { id: 'kill_20', name: '🗡️ 海上战士', desc: '击败 20 个敌人', type: 'kill', target: 20, reward: { techPoints: 40 }, icon: '🗡️' },
            { id: 'kill_50', name: '🏴‍☠️ 海盗王', desc: '击败 50 个敌人', type: 'kill', target: 50, reward: { techPoints: 80 }, icon: '🏴‍☠️' },

            // 进化任务
            { id: 'evolve_1', name: '🚀 第一次进化', desc: '进化到下一阶段', type: 'evolve', target: 1, reward: { techPoints: 20 }, icon: '🚀' },
            { id: 'evolve_3', name: '⭐ 进化之路', desc: '累计进化 3 次', type: 'evolve', target: 3, reward: { techPoints: 50 }, icon: '⭐' },
            { id: 'evolve_5', name: '👑 进化大师', desc: '累计进化 5 次', type: 'evolve', target: 5, reward: { techPoints: 100 }, icon: '👑' },

            // 特殊任务
            { id: 'treasure_1', name: '🎁 宝藏猎人', desc: '打开 1 个宝箱', type: 'treasure', target: 1, reward: { techPoints: 15 }, icon: '🎁' },
            { id: 'treasure_5', name: '💰 宝藏大师', desc: '打开 5 个宝箱', type: 'treasure', target: 5, reward: { techPoints: 40 }, icon: '💰' },
            { id: 'bug_1', name: '🐛 Bug猎手', desc: '报告 1 个 Bug', type: 'bug', target: 1, reward: { techPoints: 50 }, icon: '🐛' },
        ];
    }

    // 记录事件
    trackCollect(resource) {
        if (!this.stats.collected[resource]) this.stats.collected[resource] = 0;
        this.stats.collected[resource]++;
        return this._checkQuests();
    }

    trackKill() {
        this.stats.enemiesKilled++;
        return this._checkQuests();
    }

    trackEvolve() {
        this.stats.evolved++;
        return this._checkQuests();
    }

    trackSurvived(seconds) {
        this.stats.survived = seconds;
        return this._checkQuests();
    }

    trackTreasure() {
        this.stats.treasuresOpened++;
        return this._checkQuests();
    }

    trackBug() {
        this.stats.bugsReported++;
        return this._checkQuests();
    }

    // 检查哪些任务完成了
    _checkQuests() {
        const newlyCompleted = [];
        for (const quest of this.quests) {
            if (this.completed[quest.id]) continue;

            let progress = 0;
            switch (quest.type) {
                case 'survive':
                    progress = this.stats.survived;
                    break;
                case 'collect':
                    progress = this.stats.collected[quest.resource] || 0;
                    break;
                case 'collect_any':
                    progress = Object.values(this.stats.collected).reduce((a, b) => a + b, 0);
                    break;
                case 'kill':
                    progress = this.stats.enemiesKilled;
                    break;
                case 'evolve':
                    progress = this.stats.evolved;
                    break;
                case 'treasure':
                    progress = this.stats.treasuresOpened;
                    break;
                case 'bug':
                    progress = this.stats.bugsReported;
                    break;
            }

            if (progress >= quest.target) {
                this.completed[quest.id] = {
                    time: Date.now(),
                    reward: quest.reward
                };
                newlyCompleted.push(quest);
            }
        }
        return newlyCompleted;
    }

    // 获取任务进度
    getProgress(quest) {
        let current = 0;
        switch (quest.type) {
            case 'survive': current = this.stats.survived; break;
            case 'collect': current = this.stats.collected[quest.resource] || 0; break;
            case 'collect_any': current = Object.values(this.stats.collected).reduce((a, b) => a + b, 0); break;
            case 'kill': current = this.stats.enemiesKilled; break;
            case 'evolve': current = this.stats.evolved; break;
            case 'treasure': current = this.stats.treasuresOpened; break;
            case 'bug': current = this.stats.bugsReported; break;
        }
        return Math.min(current, quest.target);
    }

    isCompleted(questId) {
        return !!this.completed[questId];
    }

    getCompletedCount() {
        return Object.keys(this.completed).length;
    }

    getTotalCount() {
        return this.quests.length;
    }

    // 获取新完成的任务奖励总和
    getRewards(newlyCompleted) {
        let techPoints = 0;
        for (const q of newlyCompleted) {
            techPoints += q.reward.techPoints || 0;
        }
        return { techPoints };
    }
}
