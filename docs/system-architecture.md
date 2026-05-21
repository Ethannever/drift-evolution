# 漂流进化 — 系统架构设计

## 系统分层

```
┌─────────────────────────────────────────────────────────┐
│                     应用层 (App Layer)                   │
│  [主菜单] [设置] [商城] [排行榜] [联盟]                   │
├─────────────────────────────────────────────────────────┤
│                     游戏逻辑层 (Game Logic)               │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐   │
│  │ 漂流系统 │ │ 战斗系统  │ │进化系统│ │ 物资经济系统│   │
│  │ DriftSrv│ │ CombatSys│ │EvolSys │ │  EconomySys │   │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └─────┬──────┘   │
│       └───────────┴───────────┴────────────┘            │
│                       ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │              洋流系统 (Ocean Current)              │   │
│  │         全球被动漂流 + 帆/桨/引擎主动控制           │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                    实体层 (Entity Layer)                 │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │Vehicle │ │  Item    │ │Projectile│ │ Attachment │  │
│  │载具实体 │ │ 物资实体  │ │ 抛射体实体│ │ 配件实体     │  │
│  └────────┘ └──────────┘ └────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                   基础设施层 (Foundation)                │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐    │
│  │ 物理引擎│ │ 动画系统  │ │ 音效系统 │ │ 存档系统   │    │
│  │ GodotPh│ │ SpriteAni│ │AudioStr│ │ SaveSystem│    │
│  └────────┘ └──────────┘ └────────┘ └────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 核心模块详细设计

### 1. 漂流系统 (DriftSystem)

```gdscript
# drift_system.gd
class_name DriftSystem
extends Node

# 洋流区域定义
var current_zones: Array[CurrentZone] = []
var current_time: float = 0.0
const CURRENT_REFRESH_INTERVAL := 30.0  # 每30秒刷新洋流

func _process(delta: float):
    current_time += delta
    if current_time >= CURRENT_REFRESH_INTERVAL:
        _refresh_currents()
        current_time = 0.0
    _apply_drift_to_all_vehicles(delta)

func _apply_drift_to_all_vehicles(delta: float):
    for vehicle: Vehicle in get_tree().get_nodes_in_group("vehicles"):
        var current := _get_current_at(vehicle.global_position)
        var drift_force := current.direction * current.speed * delta
        vehicle.apply_drift(drift_force)
```

### 2. 载具实体 (Vehicle)

```gdscript
# vehicle.gd
class_name Vehicle
extends CharacterBody2D

@export var vehicle_data: VehicleData  # 载具属性定义

var current_hp: float
var attachments: Array[Attachment] = []
var inventory: Array[Item] = []
var evolution_stage: int = 0
var current_zone: String = ""

func _ready():
    current_hp = vehicle_data.max_hp
    add_to_group("vehicles")

func take_damage(dmg: float, source: Node2D) -> Dictionary:
    var actual_dmg := _calculate_damage(dmg)
    current_hp -= actual_dmg
    
    # 检查掉落
    var dropped := _try_drop_attachment(actual_dmg)
    
    if current_hp <= 0:
        _on_destroyed(source)
    
    return {"damage": actual_dmg, "dropped": dropped}

func evolve(new_type: String) -> bool:
    var recipe := _get_evolution_recipe(new_type)
    if not _has_materials(recipe):
        return false
    _consume_materials(recipe)
    _transform_to(new_type)
    return true
```

### 3. 战斗系统 (CombatSystem)

```gdscript
# combat_system.gd
class_name CombatSystem
extends Node

var weapons: Array[Weapon] = []
var collision_damage_multiplier := 1.0

func _physics_process(delta: float):
    _process_weapon_cooldowns(delta)
    _process_projectiles(delta)

func fire_weapon(weapon: Weapon, from: Vehicle, target_pos: Vector2) -> bool:
    if not weapon.can_fire():
        return false
    
    var projectile := _create_projectile(weapon, from, target_pos)
    get_parent().add_child(projectile)
    weapon.start_cooldown()
    return true

func calculate_collision_damage(attacker: Vehicle, defender: Vehicle) -> float:
    var attacker_momentum := attacker.velocity.length() * attacker.mass
    var defender_momentum := defender.velocity.length() * defender.mass
    var damage := (attacker_momentum - defender_momentum) / 100.0
    return clamp(damage, 1.0, 50.0)
```

### 4. 物资系统 (ItemSystem)

```gdscript
# item_data.gd
class_name ItemData
extends Resource

enum ItemType {WOOD, METAL, CLOTH, ELECTRONIC, FUEL, RARE, ARTIFACT}
enum Quality {COMMON, UNCOMMON, RARE, EPIC, LEGENDARY}

@export var item_name: String
@export var type: ItemType
@export var quality: Quality
@export var value: int  # 材料点数

const QUALITY_MULTIPLIERS := {
    Quality.COMMON: 1.0,
    Quality.UNCOMMON: 1.5,
    Quality.RARE: 3.0,
    Quality.EPIC: 5.0,
    Quality.LEGENDARY: 10.0
}

func get_actual_value() -> int:
    return int(value * QUALITY_MULTIPLIERS[quality])
```

### 5. 合成配方 (RecipeData)

```gdscript
# recipe_data.gd
class_name RecipeData
extends Resource

@export var result_vehicle_type: String
@export var required_materials: Dictionary  # {item_type: count}
@export var required_stage: int  # 当前进化阶段要求

func can_craft(inventory: Array[ItemData]) -> bool:
    var temp_inventory := inventory.duplicate()
    for item_type: String in required_materials.keys():
        var needed := required_materials[item_type]
        var found := temp_inventory.filter(func(i): return i.type == item_type)
        if found.size() < needed:
            return false
    return true
```

### 6. 网络同步设计 (Multiplayer)

```
架构: 房间制 P2P（Godot Relay / Photon）
每个房间最多20人同屏

同步策略:
┌──────────────────────────────────────────────┐
│ 状态同步（全量）                               │
│ - 载具位置/速度/朝向 (60Hz)                   │
│ - HP变化                                      │
│ - 进化/变形状态                               │
├──────────────────────────────────────────────┤
│ 事件同步（触发式）                             │
│ - 开火事件 (触发时同步)                        │
│ - 伤害结算事件                                 │
│ - 物品拾取事件                                │
│ - 掉落事件                                    │
├──────────────────────────────────────────────┤
│ 物资刷新（服务器权威）                         │
│ - 服务端每60秒广播物资刷新                     │
│ - 客户端只负责拾取请求                         │
└──────────────────────────────────────────────┘

同步帧率:
  本地移动: 60FPS (physics process)
  位置同步: 20FPS ( snapshots)
  战斗事件: 即时同步
```

### 7. 存档系统

```gdscript
# save_system.gd
class_name SaveSystem
extends Node

const SAVE_PATH := "user://save_%d.dat"

func save_game(slot: int, player_data: Dictionary) -> bool:
    var file := FileAccess.open(SAVE_PATH % slot, FileAccess.WRITE)
    if file == null:
        return false
    var json := JSON.new()
    json.stringify(player_data)
    file.store_line(json.get_parsed_text())
    file.close()
    return true

func load_game(slot: int) -> Dictionary:
    var file := FileAccess.open(SAVE_PATH % slot, FileAccess.READ)
    if file == null:
        return {}
    var json := JSON.new()
    json.parse(file.get_line())
    file.close()
    return json.get_data()
```

### 8. AI 增强层 (AI Enhancement Layer)

```
┌─────────────────────────────────────────────────────────┐
│                    AI 服务入口 (AIService)               │
│  - 四层降级: 缓存 → 本地生成 → API → 硬编码默认          │
│  - 统一 API: generate_event(), generate_dialogue() 等   │
│  - 内容缓存: 相同种子+prompt 命中缓存                   │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    生成器 (Generators)                    │
│  ┌─────────────────┐ ┌─────────────────┐              │
│  │NarrativeGenerator│ │DialogueGenerator│              │
│  │  - 随机事件      │ │  - NPC对话       │              │
│  │  - 任务简报      │ │  - 交易对话      │              │
│  │  - 物品背景      │ │  - 战斗喊话      │              │
│  └─────────────────┘ └─────────────────┘              │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    Providers (可扩展)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │LocalProvider │ │ miniMax API  │ │  OpenAI API  │   │
│  │ (离线备选)   │ │ (需配置API)  │ │ (需配置API)  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 核心文件

```
scripts/ai/
├── ai_service.gd           # AI 服务入口（四层降级+缓存）
├── local_provider.gd       # 本地规则生成器（离线可用）
├── narrative_generator.gd  # 剧情/事件生成高级包装
├── dialogue_generator.gd   # NPC 对话管理
└── providers/
    ├── minimax_provider.gd # miniMax API
    └── openai_provider.gd   # OpenAI/Claude API
```

#### API 配置 (project.godot)

```ini
[config]

[ai.minimax]
api_key = "your-api-key"
api_base = "https://api.minimaxi.chat/v1"
model = "abab6.5s-chat"

[ai.openai]
api_key = "your-api-key"
api_base = "https://api.openai.com/v1"
model = "gpt-4o-mini"
```

#### 使用示例

```gdscript
# 获取 AI 服务单例
var ai = get_node("/root/AIService")

# 生成随机事件
var event = ai.generate_event_description({
    "situation": "海面上发现了什么东西",
    "player_stage": "raft",
    "resources": {"wood": 10, "food": 5}
})

# 生成 NPC 对话
var dialogue = ai.generate_dialogue({
    "role": "trader",
    "name": "老船长",
    "personality": "精明"
}, "greet")

# 生成物品背景
var lore = ai.generate_item_lore({
    "item_name": "神秘罗盘",
    "item_type": "tool",
    "player_stage": "canoe"
})
```

#### 降级策略

| 层级 | 来源 | 优先级 | 适用场景 |
|------|------|--------|----------|
| L1 缓存 | `user://ai_cache/` | 最高 | 相同 prompt 避免重复生成 |
| L2 本地 | `local_provider.gd` | 高 | 无网络 / API 不可用 |
| L3 API | miniMax/OpenAI | 中 | 需要高质量生成 |
| L4 默认 | 硬编码字符串 | 低 | 所有方案都失败 |

#### 内容缓存

```
user://ai_cache/
├── index.cfg       # 缓存索引
└── content/        # 可选：缓存具体内容
```

缓存按 prompt hash 索引，支持跨 session 复用。

---

### 9. 自主进化系统 (Game Evolution System)

```
┌─────────────────────────────────────────────────────────┐
│            游戏自主进化系统 (GameEvolutionSystem)          │
├─────────────────────────────────────────────────────────┤
│  监控模块              │  进化触发器      │  内容生成器   │
│  - 玩家阶段            │  - 阶段突破时    │  - 新物品     │
│  - 游戏时长            │  - 探索新区域    │  - 新敌人     │
│  - 事件计数            │  - 特定时间      │  - 新事件     │
│  - 死亡次数            │  - 玩家请求      │  - 新进化分支 │
└─────────────────────────────────────────────────────────┘
```

#### 进化触发条件

| 触发类型 | 条件 | 冷却时间 |
|---------|------|---------|
| stage_advance | 玩家突破到新阶段 | 5分钟 |
| time_based | 每10分钟 | 10分钟 |
| exploration | 发现新区域 | 无 |
| player_request | 玩家主动请求 | 1分钟 |
| death_based | 每死亡5次 | 无 |

#### 核心文件

```
scripts/core/
├── game_evolution_system.gd  # 自主进化引擎
├── content_registry.gd      # 内容注册中心
├── game_state.gd            # 游戏状态
└── main_controller.gd       # 主控制器
```

#### 生成内容类型

- **items**: AI 生成新物品（名称、属性、背景故事）
- **enemies**: AI 生成新敌人（属性、行为、掉落表）
- **events**: AI 生成新事件（描述、效果）
- **evolutions**: 解锁新进化分支

#### 持久化

```
user://generated_content/
├── items.cfg      # AI 生成的物品
├── enemies.cfg    # AI 生成的敌人
├── events.cfg     # AI 生成的事件
└── evolutions.cfg # 解锁的进化分支
```

---

## 演化线详细定义

### 海洋线

```
Stage 0: RAFT（木筏）
  Sprite: 64x64, 4帧漂浮动画
  HP: 50 | 速度: 0.3 | 容量: 5
  武器: 无
  被动: 只能漂流
  特殊: 可被任何载具撞击摧毁

Stage 1: CANOE（皮划艇）
  Sprite: 64x96, 划桨动画
  HP: 100 | 速度: 0.6 | 容量: 10
  武器: 船桨（碰撞+5伤害）
  特殊: 可用桨短暂逆流

Stage 2: FISHER（渔船）
  Sprite: 128x128, 撒网动画
  HP: 200 | 速度: 0.5 | 容量: 25
  武器: 无主动武器
  特殊: 撒网可减速附近载具5秒

Stage 3: GUNBOAT（炮艇）
  Sprite: 128x192, 炮塔动画
  HP: 350 | 速度: 0.7 | 容量: 30
  武器: 1x轻炮（2s CD, 15伤害）
  特殊: 引擎不受洋流限制

Stage 4: DESTROYER（驱逐舰）
  Sprite: 192x256, 双炮动画
  HP: 600 | 速度: 0.9 | 容量: 50
  武器: 2x轻炮 + 1x鱼雷（8s CD, 50伤害追踪）
  特殊: 雷达范围+50%

Stage 5: CRUISER（巡洋舰）
  Sprite: 256x320, 三炮+防空动画
  HP: 1000 | 速度: 0.8 | 容量: 80
  武器: 3x重炮 + 2x防空炮
  特殊: 装甲片效果x1.5

Stage 6: CARRIER（航母）
  Sprite: 320x448, 飞行甲板动画
  HP: 1500 | 速度: 0.6 | 容量: 150
  武器: 4x防空炮 + 舰载机（30s波次，80伤害）
  特殊: 可停靠/放飞空中单位
```

---

## 像素美术规格

```
画布尺寸基准: 512x512 px（整图）
单像素尺寸: 4px（游戏内像素）
帧率: 8 FPS（动画循环）

载具精灵帧数:
  - 漂浮/停泊: 4帧（上下浮动）
  - 移动: 6帧（波浪感）
  - 受损: 2帧（闪烁）
  - 进化变形: 8帧（闪光→新形态）

UI 像素规格:
  - 图标: 32x32
  - 物品框: 48x48
  - 按钮: 64x32
  - 血条: 96x12
```

---

*系统架构版本: v0.1 | 日期: 2026-05-02*
