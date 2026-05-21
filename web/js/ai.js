// AI 内容生成服务 - Web版
// 本地规则生成 + 可扩展API

class AIService {
    constructor() {
        this.cache = {};
        this.eventTemplates = [
            { template: '海面上发现了一个漂浮的箱子，获得了{resource}', type: 'positive' },
            { template: '遭遇了突如其来的风暴，损失了部分物资', type: 'negative' },
            { template: '在礁石旁发现了野生的{source}，采集了{amount}单位', type: 'positive' },
            { template: '遇到了一艘废弃的{vehicle}，可以拆解利用', type: 'positive' },
            { template: '被一群海上强盗发现了，战斗中损失了{loss}', type: 'negative' },
            { template: '发现了一个神秘的小岛，上面有古老的遗迹', type: 'neutral' },
            { template: '海面平静，捕到了大量的鱼', type: 'positive' }
        ];
        
        this.loreTemplates = [
            '这块碎片来自一艘沉没的古船，上面刻着神秘的符文。',
            '在一次风暴后被冲上了岸，似乎已经漂流了很久。',
            '这是上古文明的遗物，拥有不凡的力量。',
            '曾经属于一位勇敢的航海家，如今传承到你手中。',
            '在废弃的灯塔里发现的，不知是谁将它留在这里。'
        ];
        
        this.dialogueTemplates = {
            trader: {
                greet: ['哟，旅行者，想要做点交易吗？', '稀客啊，想要点什么？'],
                accept: ['成交！这可是我给出的最高价了。', '好说，好说。'],
                reject: ['不划算？那下次再来吧。', '也许以后会有更好的机会。']
            },
            survivor: {
                greet: ['还有人活着！太好了...', '你是...幸存者吗？'],
                accept: ['太感谢了！我永远不会忘记你的恩情。', '谢谢你陌生人...']
            },
            raider: {
                greet: ['哟，又一个送财童子...', '这片海域是我们的，识相的就留下买路财！']
            }
        };
    }
    
    // 生成随机事件
    generateEvent(context = {}) {
        const key = 'event_' + JSON.stringify(context);
        if (this.cache[key]) return this.cache[key];
        
        const template = this.eventTemplates[Math.floor(Math.random() * this.eventTemplates.length)];
        let text = template.template;
        
        // 替换变量
        const replacements = {
            resource: this.randomResource(),
            source: this.randomSource(),
            amount: Math.floor(Math.random() * 50) + 10,
            vehicle: this.randomVehicle(),
            loss: this.randomLoss()
        };
        
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace('{' + k + '}', v);
        }
        
        const result = {
            description: text,
            type: template.type,
            effects: this.generateEventEffects(template.type)
        };
        
        this.cache[key] = result;
        return result;
    }
    
    // 生成事件效果
    generateEventEffects(type) {
        const effects = { gained: {}, lost: {} };
        
        if (type === 'positive') {
            const resource = this.randomResource();
            effects.gained[resource] = Math.floor(Math.random() * 30) + 10;
        } else if (type === 'negative') {
            const resource = this.randomLossResource();
            effects.lost[resource] = Math.floor(Math.random() * 20) + 5;
        } else {
            if (Math.random() < 0.5) {
                effects.gained[this.randomResource()] = Math.floor(Math.random() * 10) + 1;
            } else {
                effects.lost[this.randomLossResource()] = Math.floor(Math.random() * 10) + 1;
            }
        }
        
        return effects;
    }
    
    // 生成物品背景
    generateItemLore(itemName, itemType) {
        const templates = this.loreTemplates;
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    // 生成NPC对话
    generateDialogue(role, action) {
        const roleTemplates = this.dialogueTemplates[role] || this.dialogueTemplates.trader;
        const lines = roleTemplates[action] || roleTemplates.greet;
        return lines[Math.floor(Math.random() * lines.length)];
    }
    
    // 辅助方法
    randomResource() {
        const resources = ['木材', '金属', '布料', '食物', '淡水', '燃料', '矿石'];
        return resources[Math.floor(Math.random() * resources.length)];
    }
    
    randomSource() {
        const sources = ['海藻', '浮木', '贝壳', '海棉', '珊瑚'];
        return sources[Math.floor(Math.random() * sources.length)];
    }
    
    randomVehicle() {
        const vehicles = ['渔船', '货船', '游艇', '帆船', '木筏'];
        return vehicles[Math.floor(Math.random() * vehicles.length)];
    }
    
    randomLoss() {
        const losses = ['部分食物', '淡水储备', '修船材料', '渔网'];
        return losses[Math.floor(Math.random() * losses.length)];
    }
    
    randomLossResource() {
        const resources = ['食物', '淡水', '燃料', '木材'];
        return resources[Math.floor(Math.random() * resources.length)];
    }
    
    // 清除缓存
    clearCache() {
        this.cache = {};
    }
}

// 导出
window.AIService = AIService;
