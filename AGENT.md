# AGENT.md - 漂流进化项目指南

> Agent 读这个文件就能上手，不用每次重新问。

## 项目概述
- **类型**: HTML5 Canvas + Node.js 多人生存游戏
- **端口**: 3333，nginx /game/ 反代
- **版本**: v3.3 稳定，v3.4 开发中
- **代码规模**: 14 个 JS 文件，~6000 行（game.js 2511 行）

## 代码结构
```
web/
  index.html        # 入口
  js/
    game.js         # 主循环（2511行，尽量别改，要改先备份）
    player.js       # 玩家逻辑
    companion.js    # 跟随者系统
    skills.js       # 技能效果（speedBoost/invulnerable）
    ai.js           # AI 敌人
    ...
server.js           # Node.js 多人服务器
```

## 关键教训（血的教训）
1. **子任务不能改代码** — 子任务改代码会删关键变量，靠 .bak 文件才救回来
2. **改 game.js 前必须 cp 备份** — .bak 是救命稻草
3. **修改后必须重启服务** — 不是只刷新浏览器
4. **用 Python 脚本编辑 HTML** — edit 工具空白字符匹配经常失败

## 已知 P2 问题
- player.js:78-85 dx/dy 严格模式未声明（会抛 ReferenceError）
- setInterval fallback 无 cleanup（game.js:89）
- innerHTML 10 处未统一使用 _escapeHtml
- companion.js 冷却在暂停时累积

## 编码规范
- 玩家速度用 `this.speed`，不要硬编码数字
- 用户输入必须过 `_escapeHtml()` 转义
- 敌人上限 MAX_ENEMIES=50
- 技能效果必须在 player.update() 中读取

## 本地测试
```bash
cd /root/.openclaw/workspace/projects/drift-evolution
node server.js
# 访问 http://localhost:3333
```
