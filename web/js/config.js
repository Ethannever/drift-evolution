// 游戏配置 - 漂流进化 Web版

const CONFIG = {

    // 进化阶段
    STAGES: {
        raft: {
            name: '木筏',
            description: '最初的漂流工具',
            hp: 80,  // 增加起始HP
            speed: 100,
            cargo: 8,  // 增加容量
            defense: 0,
            weapons: [],
            next: ['canoe']
        },
        canoe: {
            name: '独木舟',
            description: '更加坚固，速度提升',
            hp: 150,
            speed: 120,
            cargo: 12,
            defense: 3,
            weapons: ['paddle'],
            next: ['fisher']
        },
        fisher: {
            name: '渔船',
            description: '可以捕鱼获取食物',
            hp: 250,
            speed: 100,
            cargo: 25,
            defense: 5,
            weapons: ['slingshot'],
            next: ['gunboat']
        },
        gunboat: {
            name: '炮艇',
            description: '装备武器，可攻击敌人',
            hp: 400,
            speed: 140,
            cargo: 30,
            defense: 12,
            weapons: ['spear', 'bow'],
            next: ['destroyer']
        },
        destroyer: {
            name: '驱逐舰',
            description: '高速战斗舰艇',
            hp: 700,
            speed: 180,
            cargo: 45,
            defense: 25,
            weapons: ['spear', 'bow'],
            next: ['cruiser']
        },
        cruiser: {
            name: '巡洋舰',
            description: '远洋作战主力',
            hp: 1200,
            speed: 160,
            cargo: 80,
            defense: 40,
            weapons: ['spear', 'bow'],
            next: ['carrier']
        },
        carrier: {
            name: '航母',
            description: '终极形态，海洋霸主',
            hp: 2000,
            speed: 140,
            cargo: 150,
            defense: 60,
            weapons: ['spear', 'bow'],
            next: []
        }
    },

    // 进化消耗
    EVOLUTION_COSTS: {
        canoe: { wood: 20, rope: 5, tech: 0 },  // 降低进化门槛
        fisher: { wood: 30, metal: 10, rope: 8, tech: 30 },
        gunboat: { metal: 60, wood: 20, rope: 10, tech: 100 },
        destroyer: { metal: 150, electronic: 30, tech: 300 },
        cruiser: { metal: 400, electronic: 100, fuel: 80, tech: 800 },
        carrier: { metal: 800, electronic: 250, fuel: 150, tech: 1500 }
    },

    // 武器
    WEAPONS: {
        paddle: { name: '船桨', type: 'melee', damage: 8, range: 60, fireRate: 1.2 },
        slingshot: { name: '弹弓', type: 'ranged', damage: 12, range: 250, fireRate: 0.8, ammoCost: 1 },
        spear: { name: '长矛', type: 'melee', damage: 18, range: 90, fireRate: 1.5, knockback: 100 },
        bow: { name: '弓箭', type: 'ranged', damage: 22, range: 350, fireRate: 0.6, ammoCost: 1 }
    },

    // 敌人 - 降低初期难度
    ENEMIES: {
        hostile_raft: { name: '敌对木筏', hp: 25, damage: 8, speed: 50, behavior: 'chase', drops: { wood: 8, rope: 3 } },
        shark: { name: '鲨鱼', hp: 40, damage: 15, speed: 90, behavior: 'chase', drops: { food: 15 } },
        pirate_canoe: { name: '海盗独木舟', hp: 60, damage: 12, speed: 70, behavior: 'patrol', drops: { wood: 20, food: 10 } }
    },

    // 游戏设置 - 调整平衡
    SETTINGS: {
        spawnInterval: 20000,  // 敌人生成间隔从30s增加到20s，但初始有保护
        spawnDistance: 500,     // 生成距离稍远
        invulnerabilityTime: 800,  // 受伤无敌时间增加
        driftStrength: 8,       // 洋流强度降低
        initialInvulnerable: 5000,  // 初始5秒保护时间
    },

    // 技能配置
    SKILLS: {
        swift_current: { name: '顺流', type: 'passive', desc: 'Speed +15%', effect: { speedBonus: 0.15 } },
        hardened_hull: { name: '加固船体', type: 'passive', desc: 'Defense +5', effect: { defenseBonus: 5 } },
        large_cargo: { name: '大容量', type: 'passive', desc: 'Cargo +50%', effect: { cargoBonus: 0.5 } },
        speed_boost: { name: '加速冲刺', type: 'active', desc: 'Speed x2 for 3s', cooldown: 10, duration: 3, effect: { speedMultiplier: 2 } },
        shield: { name: '护盾', type: 'active', desc: 'Invulnerable 3s', cooldown: 15, duration: 3, effect: { invulnerable: true } },
        repair: { name: '紧急维修', type: 'active', desc: 'Heal 30% HP', cooldown: 20, effect: { healPercent: 0.3 } },
        ram: { name: '冲撞', type: 'attack', desc: 'Damage x1.5', cooldown: 5, damageBonus: 1.5 },
        whirlpool: { name: '漩涡', type: 'attack', desc: 'AOE Attack', cooldown: 8, aoe: true, damageMod: 0.7 },
        lightning: { name: '雷击', type: 'attack', desc: 'Range +50%', cooldown: 12, range: 400, damageBonus: 1.5 },
        tsunami: { name: '海啸', type: 'ultimate', desc: 'Screen AOE', cooldown: 60, aoe: true, damageMod: 0.5 }
    },

    // 道具配置
    ITEMS: {
        wood_bundle: { name: 'Wood', type: 'resource', value: 10, icon: '🪵' },
        rope: { name: 'Rope', type: 'resource', value: 5, icon: '🪢' },
        food: { name: 'Food', type: 'consumable', effect: { heal: 25 }, icon: '🍖' },
        water: { name: 'Water', type: 'consumable', effect: { restoreStamina: 30 }, icon: '💧' },
        metal_scrap: { name: 'Metal', type: 'resource', value: 15, icon: '⚙️' },
        gem: { name: 'Gem', type: 'rare', value: 100, icon: '💎' },
        better_sail: { name: 'Better Sail', type: 'equip', slot: 'sail', effect: { speedBonus: 0.25 }, icon: '⛵' },
        iron_armor: { name: 'Iron Armor', type: 'equip', slot: 'armor', effect: { defenseBonus: 15 }, icon: '🛡️' }
    },

    // 天气系统
    WEATHER: {
        clear: { name: 'Clear', effect: {}, duration: [60, 120] },
        rain: { name: 'Rain', effect: { visibility: 0.7, speedMod: 0.8 }, duration: [30, 60], icon: '🌧️' },
        storm: { name: 'Storm', effect: { visibility: 0.4, speedMod: 0.5, driftMod: 2 }, duration: [15, 30], icon: '⛈️' },
        fog: { name: 'Fog', effect: { visibility: 0.3, speedMod: 0.7 }, duration: [20, 45], icon: '🌫️' },
        night: { name: 'Night', effect: { visibility: 0.5 }, duration: [45, 90], icon: '🌙' }
    }
};
