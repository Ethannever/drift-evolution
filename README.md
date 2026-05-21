# 漂流进化 (Drift Evolution)

> 开局一块木筏，开放式海洋地图，漂流收集物资，从木筏进化到航空母舰或机甲。

**当前状态：文档完成，Godot Demo 骨架完成，待导入 Godot 4 验证**

---

## 📁 项目结构

```
drift-evolution/
├── docs/
│   ├── GDD.md                    # ✅ 游戏设计文档 v0.1
│   └── system-architecture.md     # ✅ 系统架构设计
├── godot/
│   ├── project.godot              # ✅ Godot 项目配置
│   ├── assets/icon.svg            # ✅ 项目图标
│   ├── scenes/world/
│   │   └── main_world.tscn        # ✅ 主世界场景
│   └── scripts/
│       ├── core/
│       │   ├── game_manager.gd    # ✅ 全局管理器（Autoload）
│       │   ├── world_manager.gd   # ✅ 世界管理（洋流/物资生成）
│       │   ├── vehicle_data.gd    # ✅ 载具数据资源
│       │   ├── item_data.gd       # ✅ 物资数据资源
│       │   ├── recipe_data.gd     # ✅ 合成配方资源
│       │   └── attachment_data.gd  # ✅ 配件数据资源
│       ├── vehicle/
│       │   ├── vehicle.gd         # ✅ 载具实体（CharacterBody2D）
│       │   └── floating_item.gd   # ✅ 漂流物资节点
│       └── ui/
│           └── hud.gd             # ✅ 游戏HUD界面
└── SPEC.md                       # 项目规格说明
```

---

## 🎮 玩法设计

### 三条进化线

```
海洋线: 木筏 → 皮划艇 → 渔船 → 炮艇 → 驱逐舰 → 巡洋舰 → 航母
陆地线: 炮艇+ → 气垫船 → 两栖突击 → 坦克 → 机械兽 → 陆地战舰
天空线: 航母+ → 水上飞机 → 直升机 → 喷气机 → 轰炸机 → 星际战舰
```

### 核心循环

```
漂流 → 发现物资 → 收集 → 合成进化 → 遭遇PvP → 战斗/逃跑 → 配件掉落
```

### 已设计内容

| 系统 | 状态 |
|------|------|
| 载具数据（7种载具） | ✅ |
| 物资类型（7种） | ✅ |
| 进化配方（3条进化链） | ✅ |
| 洋流系统（30秒换向） | ✅ |
| 物资刷新规则 | ✅ |
| 战斗碰撞伤害公式 | ✅ |
| 品质/掉落系统 | ✅ |
| HUD界面 | ✅ |

---

## 🚀 运行方式

### 1. 下载 Godot 4.2+

https://godotengine.org/download

### 2. 导入项目

1. 打开 Godot 4.x
2. 点击「导入」
3. 选择 `godot/project.godot`
4. 点击「导入 & 编辑」

### 3. 运行游戏

- 按 **F5** 或点击 ▶️ 运行
- **WASD** 移动木筏
- **空格** 开启帆（皮划艇后可用）
- **E** 打开/关闭进化面板
- **鼠标滚轮** 缩放视野

### 4. 验证核心循环

1. 木筏随洋流漂流 ✅
2. 靠近彩色方块（物资）自动拾取 ✅
3. 积累材料（右上角显示）
4. 按 **E** 打开进化面板，点「进化」
5. 木筏 → 皮划艇，视野自动扩大 ✅

---

## 📊 数值设计（简化版MVP）

```python
# 载具属性
RAFT:     HP=50,  速度=0.3, 容量=5
CANOE:    HP=100, 速度=0.6, 容量=10, 可用帆
FISHER:   HP=200, 速度=0.5, 容量=25, 货舱+2
GUNBOAT:  HP=350, 速度=0.7, 容量=30, 可开炮

# 进化配方
RAFT→CANOE:   木材x20 + 布料x5
CANOE→FISHER: 木材x50 + 金属x15 + 布料x10
FISHER→GUNBOAT: 金属x40 + 布料x15

# 物资刷新
每3秒生成3个物资，最多50个
权重: 木材60% / 金属20% / 布料10% / 电子5% / 燃料3% / 稀有2%
品质: 普通60% / 优秀30% / 稀有10%
```

---

## 🔧 开发路线图

| 阶段 | 内容 | 文件 |
|------|------|------|
| v0.1 | 漂流+收集+进化（MVP） | 已完成骨架 |
| v0.2 | 碰撞伤害+战斗 | `combat/` 待完善 |
| v0.3 | 像素美术资源 | `game-cog` 技能支持 |
| v0.4 | 洋流可视化 | WorldManager 扩展 |
| v0.5 | 多人P2P联机 | Photon/Godot Relay |
| v0.6 | 炮艇武器系统 | `weapon.gd` 待创建 |
| v0.7 | 陆地分支线 | 新场景 `land_world.tscn` |
| v0.8 | 天空分支线 | 新场景 `air_world.tscn` |

---

## 🛠️ 技能工具

已安装以下技能增强开发能力：

| 技能 | 用途 |
|------|------|
| `game-designer-toolkit` | GDD创作、系统设计 |
| `game-architect` | 游戏架构设计 |
| `game-cog` | AI生成像素美术/精灵图 |
| `game-numeric-design` | 数值策划、成长曲线 |
| `game-ai` | NPC AI、行为树 |
| `game-quality-gates` | 开发质量检查清单 |
| `godot-dev-guide` | Godot 4.x 开发参考 |
| `godot-project-checklist-skill` | Godot 项目检查清单 |

---

*文档创建: 2026-05-02 | 版本: v0.1*
