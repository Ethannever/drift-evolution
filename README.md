# 🌊 漂流进化 (Drift Evolution)

> 开局一块木筏，开放式海洋地图，漂流收集物资，从木筏进化到航空母舰或机甲。

一款基于 HTML5 Canvas 的 2D 海洋生存进化游戏，支持单人和多人模式。

---

## 🎮 游戏特色

- **三条进化线**：海洋 → 陆地 → 天空，每条线路独特载具和技能
- **16 个任务/成就系统**：探索、战斗、进化多维度目标
- **技能系统**：加速、护盾、磁铁等主动/被动技能
- **敌人 AI**：巡逻、追逐、逃跑多种行为模式
- **粒子特效**：爆炸、拾取、升级等视觉反馈
- **音效系统**：Web Audio API 实现，沉浸式体验
- **多人联机**：WebSocket 实时对战

## 🚀 快速开始

### 前置要求

- Node.js 16+
- npm

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/Ethannever/drift-evolution.git
cd drift-evolution/web

# 安装依赖
npm install

# 启动服务器
node server.js
```

打开浏览器访问 `http://localhost:3000`

### 操作说明

| 按键 | 功能 |
|------|------|
| **WASD** | 移动 |
| **空格** | 使用帆（皮划艇后可用） |
| **E** | 打开进化面板 |
| **鼠标滚轮** | 缩放视野 |
| **1-4** | 使用技能 |

## 📁 项目结构

```
drift-evolution/
├── web/                    # Web 版游戏主体
│   ├── index.html          # 入口页面
│   ├── server.js           # Node.js 服务器
│   ├── js/
│   │   ├── game.js         # 游戏主循环
│   │   ├── player.js       # 玩家逻辑
│   │   ├── enemy.js        # 敌人 AI
│   │   ├── evolution.js    # 进化系统
│   │   ├── skills.js       # 技能系统
│   │   ├── combat.js       # 战斗系统
│   │   ├── quests.js       # 任务系统
│   │   ├── particles.js    # 粒子特效
│   │   ├── sound.js        # 音效系统
│   │   ├── renderer.js     # 渲染引擎
│   │   ├── multiplayer.js  # 多人联机
│   │   ├── companion.js    # 伙伴系统
│   │   ├── ai.js           # AI 决策
│   │   ├── config.js       # 配置参数
│   │   └── sprites.js      # 精灵图管理
│   └── multiplayer_server.js  # 多人服务器
├── godot/                  # Godot 版（早期原型）
├── docs/                   # 设计文档
├── specs/                  # 规格说明
└── assets/                 # 资源文件
```

## 🎯 进化路线

```
海洋线: 木筏 → 皮划艇 → 渔船 → 炮艇 → 驱逐舰 → 巡洋舰 → 航母
陆地线: 炮艇+ → 气垫船 → 两栖突击 → 坦克 → 机械兽 → 陆地战舰
天空线: 航母+ → 水上飞机 → 直升机 → 喷气机 → 轰炸机 → 星际战舰
```

## 🛠️ 技术栈

- **前端**: HTML5 Canvas + 原生 JavaScript
- **后端**: Node.js + WebSocket (ws)
- **音效**: Web Audio API
- **渲染**: 自定义 2D 渲染引擎，支持精灵图、粒子、相机系统

## 📊 开发状态

| 版本 | 内容 | 状态 |
|------|------|------|
| v2.0.0 | Web 版重写 + 音效 + 粒子 + 16 任务 | ✅ |
| v3.3 | 像素美术升级 + 崩溃保护 + P0 修复 | ✅ |
| v3.4 | 碎石伤害调低 + 严格模式修复 | 🔧 进行中 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

---

*用 ❤️ 和 ☕ 构建*
