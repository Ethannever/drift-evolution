// ============================================================
// 像素精灵管理器 - 漂流进化 v3.0
// 每个进化阶段用 Canvas API 绘制像素风格精灵
// 精灵预渲染到离屏 Canvas，运行时直接 drawImage
// ============================================================

// 通用颜色常量 - 像素复古风调色板
var PC = {
    LIGHT_WOOD: '#D2B48C',  // 浅木色
    MED_WOOD: '#CD853F',    // 中木色
    WOOD: '#A0522D',        // 木色
    DARK_WOOD: '#8B6914',   // 深木色
    VDARK_WOOD: '#5D4037',  // 极深木色
    HULL_RED: '#A0522D',    // 红棕船体
    SAIL: '#F5DEB3',        // 帆布色
    MIL_GREEN: '#556B2F',   // 军绿
    DK_GREEN: '#3B4A1F',    // 深军绿
    GRAY: '#708090',        // 灰色
    DK_GRAY: '#4A4A4A',     // 深灰
    LT_GRAY: '#909090',     // 浅灰
    NAVY: '#2F4F4F',        // 深蓝灰
    DECK_GRAY: '#505050',   // 甲板灰
    METAL: '#888888',       // 金属
    DK_METAL: '#555555',    // 深金属
    CANNON: '#333333',      // 炮管黑
    RED: '#CC3333',         // 红色
    ORANGE: '#FF6600',      // 橙色
    RUNWAY: '#FFFF88',      // 跑道黄
    WATER: '#4488CC',       // 水花蓝
    LT_WATER: '#66AADD'     // 浅水花
};

// ============================================================
// 各阶段精灵绘制函数
// 接口: draw(ctx, w, h, frame)
//   frame: 0=静止1, 1=静止2(上浮1px), 2=移动1, 3=移动2
//   船头朝右，俯视角
// ============================================================

// --- 木筏(raft) 16x16: 棕色木板+草绳+小桨 ---
function drawRaft(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;

    // 4条横向木板
    var bw = 12, bh = 3;
    var sx = cx - Math.floor(bw / 2);
    var sy = cy - 6 + by;
    for (var r = 0; r < 4; r++) {
        var yy = sy + r * 4;
        ctx.fillStyle = PC.DARK_WOOD;
        ctx.fillRect(sx, yy, bw, bh);
        ctx.fillStyle = PC.LIGHT_WOOD;
        ctx.fillRect(sx + 2, yy + 1, bw - 4, 1);
    }
    // 草绳绑扎
    ctx.fillStyle = '#7B8B3A';
    ctx.fillRect(sx - 1, sy + 4 + by, bw + 2, 1);
    ctx.fillRect(sx - 1, sy + 9 + by, bw + 2, 1);
    // 左侧船桨动画
    var px = sx - 3;
    var py = cy - 1 + by;
    if (frame === 2) py = cy - 3 + by;
    else if (frame === 3) py = cy + 1 + by;
    ctx.fillStyle = PC.VDARK_WOOD;
    ctx.fillRect(px, py - 3, 1, 7);
    ctx.fillStyle = PC.MED_WOOD;
    ctx.fillRect(px - 1, py + 3, 3, 2);
    // 船头标记
    ctx.fillStyle = PC.ORANGE;
    ctx.fillRect(sx + bw, cy - 1 + by, 1, 3);
    ctx.fillRect(sx + bw + 1, cy + by, 1, 1);
}

// --- 独木舟(canoe) 20x20: 红棕船体+布帆 ---
function drawCanoe(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;
    // 船体
    ctx.fillStyle = PC.HULL_RED;
    ctx.fillRect(cx + 6, cy - 1 + by, 3, 3);
    ctx.fillRect(cx - 4, cy - 2 + by, 10, 5);
    ctx.fillRect(cx - 8, cy - 3 + by, 5, 7);
    ctx.fillRect(cx - 6, cy - 2 + by, 3, 5);
    // 船体边缘
    ctx.fillStyle = PC.VDARK_WOOD;
    ctx.fillRect(cx - 8, cy - 3 + by, 15, 1);
    ctx.fillRect(cx - 8, cy + 3 + by, 15, 1);
    ctx.fillRect(cx + 9, cy + by, 1, 1);
    // 中心隔板
    ctx.fillStyle = PC.WOOD;
    ctx.fillRect(cx - 3, cy - 1 + by, 8, 3);
    // 布帆+桅杆
    ctx.fillStyle = PC.SAIL;
    ctx.fillRect(cx, cy - 5 + by, 5, 4);
    ctx.fillStyle = PC.VDARK_WOOD;
    ctx.fillRect(cx + 2, cy - 6 + by, 1, 6);
    // 桨动画
    if (frame >= 2) {
        var off = (frame === 2) ? -2 : 2;
        ctx.fillStyle = PC.WOOD;
        ctx.fillRect(cx - 5, cy - 4 + by + off, 1, 2);
        ctx.fillRect(cx - 5, cy + 3 + by - off, 1, 2);
    }
}

// --- 渔船(fisher) 24x24: 浅黄木船+甲板+桅杆 ---
function drawFisher(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;
    // 船体
    ctx.fillStyle = PC.MED_WOOD;
    ctx.fillRect(cx + 8, cy - 2 + by, 3, 5);
    ctx.fillRect(cx + 11, cy - 1 + by, 2, 3);
    ctx.fillRect(cx + 13, cy + by, 1, 1);
    ctx.fillRect(cx - 4, cy - 4 + by, 12, 9);
    ctx.fillRect(cx - 9, cy - 3 + by, 6, 7);
    // 船体边缘
    ctx.fillStyle = PC.VDARK_WOOD;
    ctx.fillRect(cx - 9, cy - 4 + by, 24, 1);
    ctx.fillRect(cx - 9, cy + 4 + by, 24, 1);
    // 甲板
    ctx.fillStyle = PC.LIGHT_WOOD;
    ctx.fillRect(cx - 2, cy - 2 + by, 8, 5);
    // 船舱
    ctx.fillStyle = PC.WOOD;
    ctx.fillRect(cx - 5, cy - 2 + by, 4, 5);
    ctx.fillStyle = PC.DK_METAL;
    ctx.fillRect(cx - 4, cy - 1 + by, 2, 3);
    // 桅杆+渔旗
    ctx.fillStyle = PC.VDARK_WOOD;
    ctx.fillRect(cx + 3, cy - 7 + by, 1, 7);
    ctx.fillStyle = '#BBAAAA';
    ctx.fillRect(cx + 4, cy - 6 + by, 3, 3);
    // 桨动画
    if (frame >= 2) {
        var off = (frame === 2) ? -2 : 2;
        ctx.fillStyle = PC.WOOD;
        ctx.fillRect(cx, cy - 5 + by + off, 1, 2);
        ctx.fillRect(cx, cy + 4 + by - off, 1, 2);
    }
}

// --- 炮艇(gunboat) 28x28: 军绿+甲板炮台 ---
function drawGunboat(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;
    // 船体
    ctx.fillStyle = PC.MIL_GREEN;
    ctx.fillRect(cx + 8, cy - 2 + by, 3, 5);
    ctx.fillRect(cx + 11, cy - 1 + by, 2, 3);
    ctx.fillRect(cx + 13, cy + by, 1, 1);
    ctx.fillRect(cx - 6, cy - 4 + by, 14, 9);
    ctx.fillRect(cx - 10, cy - 3 + by, 5, 7);
    ctx.fillRect(cx - 12, cy - 2 + by, 3, 5);
    // 船体边缘
    ctx.fillStyle = PC.DK_GREEN;
    ctx.fillRect(cx - 12, cy - 4 + by, 27, 1);
    ctx.fillRect(cx - 12, cy + 4 + by, 27, 1);
    // 舰桥
    ctx.fillStyle = PC.DK_GREEN;
    ctx.fillRect(cx - 3, cy - 2 + by, 5, 5);
    ctx.fillStyle = '#667788';
    ctx.fillRect(cx - 2, cy - 1 + by, 3, 3);
    // 主炮台+炮管
    ctx.fillStyle = PC.CANNON;
    ctx.fillRect(cx + 4, cy - 1 + by, 4, 3);
    ctx.fillRect(cx + 8, cy + by, 3, 1);
    // 螺旋桨水花
    if (frame >= 2) {
        var off = (frame === 2) ? -1 : 1;
        ctx.fillStyle = PC.WATER;
        ctx.fillRect(cx - 13, cy - 1 + by + off, 2, 1);
        ctx.fillRect(cx - 13, cy + 1 + by - off, 2, 1);
        ctx.fillStyle = PC.LT_WATER;
        ctx.fillRect(cx - 14, cy + by, 1, 1);
    }
}

// --- 驱逐舰(destroyer) 36x20: 灰色+双炮台+鱼雷管 ---
function drawDestroyer(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;
    // 船体
    ctx.fillStyle = PC.GRAY;
    ctx.fillRect(cx + 10, cy - 2 + by, 3, 5);
    ctx.fillRect(cx + 13, cy - 1 + by, 2, 3);
    ctx.fillRect(cx + 15, cy + by, 1, 1);
    ctx.fillRect(cx - 8, cy - 5 + by, 18, 11);
    ctx.fillRect(cx - 14, cy - 3 + by, 7, 7);
    ctx.fillRect(cx - 16, cy - 2 + by, 3, 5);
    // 船体边缘
    ctx.fillStyle = PC.DK_GRAY;
    ctx.fillRect(cx - 16, cy - 5 + by, 33, 1);
    ctx.fillRect(cx - 16, cy + 5 + by, 33, 1);
    // 前炮台+炮管
    ctx.fillStyle = PC.DK_GRAY;
    ctx.fillRect(cx + 5, cy - 2 + by, 4, 5);
    ctx.fillStyle = PC.CANNON;
    ctx.fillRect(cx + 9, cy + by, 4, 1);
    // 后炮台+炮管
    ctx.fillStyle = PC.DK_GRAY;
    ctx.fillRect(cx - 8, cy - 2 + by, 4, 5);
    ctx.fillStyle = PC.CANNON;
    ctx.fillRect(cx - 12, cy + by, 4, 1);
    // 鱼雷管(上下各一)
    ctx.fillStyle = PC.DK_METAL;
    ctx.fillRect(cx - 2, cy - 4 + by, 3, 1);
    ctx.fillRect(cx - 2, cy + 4 + by, 3, 1);
    // 舰桥
    ctx.fillStyle = PC.DK_GRAY;
    ctx.fillRect(cx - 2, cy - 1 + by, 5, 3);
    ctx.fillStyle = '#667788';
    ctx.fillRect(cx - 1, cy + by, 3, 1);
    // 螺旋桨水花
    if (frame >= 2) {
        var off = (frame === 2) ? -1 : 1;
        ctx.fillStyle = PC.WATER;
        ctx.fillRect(cx - 17, cy - 2 + by + off, 2, 1);
        ctx.fillRect(cx - 17, cy + 2 + by - off, 2, 1);
        ctx.fillStyle = PC.LT_WATER;
        ctx.fillRect(cx - 18, cy - 1 + by, 1, 1);
        ctx.fillRect(cx - 18, cy + 1 + by, 1, 1);
    }
}

// --- 巡洋舰(cruiser) 42x20: 深灰+重武装+舰桥 ---
function drawCruiser(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;
    // 船体(更宽更长)
    ctx.fillStyle = PC.DK_GRAY;
    ctx.fillRect(cx + 12, cy - 3 + by, 3, 7);
    ctx.fillRect(cx + 15, cy - 2 + by, 2, 5);
    ctx.fillRect(cx + 17, cy - 1 + by, 2, 3);
    ctx.fillRect(cx + 19, cy + by, 1, 1);
    ctx.fillRect(cx - 10, cy - 6 + by, 22, 13);
    ctx.fillRect(cx - 16, cy - 4 + by, 7, 9);
    ctx.fillRect(cx - 18, cy - 3 + by, 3, 7);
    // 船体边缘
    ctx.fillStyle = '#333333';
    ctx.fillRect(cx - 18, cy - 6 + by, 39, 1);
    ctx.fillRect(cx - 18, cy + 6 + by, 39, 1);
    // 前主炮(双联装)
    ctx.fillStyle = '#333333';
    ctx.fillRect(cx + 7, cy - 3 + by, 5, 7);
    ctx.fillStyle = PC.CANNON;
    ctx.fillRect(cx + 12, cy - 1 + by, 4, 1);
    ctx.fillRect(cx + 12, cy + 1 + by, 4, 1);
    // 后主炮
    ctx.fillStyle = '#333333';
    ctx.fillRect(cx - 12, cy - 2 + by, 5, 5);
    ctx.fillStyle = PC.CANNON;
    ctx.fillRect(cx - 16, cy + by, 4, 1);
    // 舰桥(大型上层建筑)
    ctx.fillStyle = '#333333';
    ctx.fillRect(cx - 3, cy - 3 + by, 8, 7);
    ctx.fillStyle = PC.LT_GRAY;
    ctx.fillRect(cx - 1, cy - 1 + by, 4, 3);
    // 桅杆
    ctx.fillStyle = PC.DK_METAL;
    ctx.fillRect(cx + 1, cy - 5 + by, 1, 3);
    // 导弹发射架
    ctx.fillStyle = PC.DK_METAL;
    ctx.fillRect(cx - 6, cy - 5 + by, 2, 2);
    ctx.fillRect(cx - 6, cy + 4 + by, 2, 2);
    // 螺旋桨水花
    if (frame >= 2) {
        var off = (frame === 2) ? -1 : 1;
        ctx.fillStyle = PC.WATER;
        ctx.fillRect(cx - 19, cy - 2 + by + off, 2, 1);
        ctx.fillRect(cx - 19, cy + 2 + by - off, 2, 1);
        ctx.fillStyle = PC.LT_WATER;
        ctx.fillRect(cx - 20, cy - 1 + by, 1, 2);
    }
}

// --- 航母(carrier) 48x24: 深蓝灰+平甲板+跑道线 ---
function drawCarrier(ctx, w, h, frame) {
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    var by = (frame === 1) ? -1 : 0;
    // 船体(宽大平甲板)
    ctx.fillStyle = PC.NAVY;
    ctx.fillRect(cx + 16, cy - 4 + by, 3, 9);
    ctx.fillRect(cx + 19, cy - 3 + by, 2, 7);
    ctx.fillRect(cx + 21, cy - 2 + by, 1, 5);
    ctx.fillRect(cx - 12, cy - 8 + by, 28, 17);
    ctx.fillRect(cx - 18, cy - 6 + by, 7, 13);
    ctx.fillRect(cx - 20, cy - 5 + by, 3, 11);
    // 船体边缘
    ctx.fillStyle = '#1A2A2A';
    ctx.fillRect(cx - 20, cy - 8 + by, 43, 1);
    ctx.fillRect(cx - 20, cy + 8 + by, 43, 1);
    // 飞行甲板
    ctx.fillStyle = PC.DECK_GRAY;
    ctx.fillRect(cx - 16, cy - 6 + by, 34, 13);
    // 跑道中线(虚线)
    ctx.fillStyle = PC.RUNWAY;
    for (var i = -14; i < 16; i += 4) {
        ctx.fillRect(cx + i, cy + by, 2, 1);
    }
    // 甲板边缘跑道线
    ctx.fillStyle = PC.RUNWAY;
    ctx.fillRect(cx - 14, cy - 5 + by, 30, 1);
    ctx.fillRect(cx - 14, cy + 5 + by, 30, 1);
    // 岛式舰桥(偏右)
    ctx.fillStyle = PC.NAVY;
    ctx.fillRect(cx + 8, cy - 7 + by, 6, 4);
    ctx.fillStyle = '#88AACC';
    ctx.fillRect(cx + 9, cy - 6 + by, 4, 2);
    ctx.fillStyle = PC.DK_METAL;
    ctx.fillRect(cx + 11, cy - 9 + by, 1, 3);
    // 甲板飞机轮廓
    ctx.fillStyle = PC.LT_GRAY;
    ctx.fillRect(cx - 8, cy - 3 + by, 3, 1);
    ctx.fillRect(cx - 9, cy - 2 + by, 5, 1);
    ctx.fillRect(cx - 8, cy - 1 + by, 3, 1);
    ctx.fillRect(cx + 2, cy + 2 + by, 3, 1);
    ctx.fillRect(cx + 1, cy + 3 + by, 5, 1);
    ctx.fillRect(cx + 2, cy + 4 + by, 3, 1);
    // 螺旋桨水花
    if (frame >= 2) {
        var off = (frame === 2) ? -1 : 1;
        ctx.fillStyle = PC.WATER;
        ctx.fillRect(cx - 21, cy - 3 + by + off, 2, 1);
        ctx.fillRect(cx - 21, cy + 3 + by - off, 2, 1);
        ctx.fillStyle = PC.LT_WATER;
        ctx.fillRect(cx - 22, cy - 2 + by, 1, 1);
        ctx.fillRect(cx - 22, cy + 2 + by, 1, 1);
    }
}

// ============================================================
// 精灵阶段定义: 画布尺寸、缩放倍数、绘制函数
// ============================================================
var SPRITE_DEFS = {
    raft:      { w: 16, h: 16, scale: 3.0, draw: drawRaft },
    canoe:     { w: 20, h: 20, scale: 2.8, draw: drawCanoe },
    fisher:    { w: 24, h: 24, scale: 2.5, draw: drawFisher },
    gunboat:   { w: 28, h: 28, scale: 2.3, draw: drawGunboat },
    destroyer: { w: 36, h: 20, scale: 2.5, draw: drawDestroyer },
    cruiser:   { w: 42, h: 20, scale: 2.5, draw: drawCruiser },
    carrier:   { w: 48, h: 24, scale: 2.5, draw: drawCarrier }
};

// ============================================================
// SpriteManager - 像素精灵管理器
// 预渲染所有精灵帧到离屏Canvas，管理动画
// ============================================================
function SpriteManager() {
    this.sprites = {};       // stage -> { frames: Canvas[], scale }
    this.animTime = 0;       // 动画累计时间
    this.frame = 0;          // 当前帧 0-3
    this.frameDuration = 0.25;  // 每帧持续(秒)
    this._init();
}

// 初始化: 为每个阶段预渲染4帧精灵到离屏Canvas
SpriteManager.prototype._init = function() {
    var stages = Object.keys(SPRITE_DEFS);
    for (var i = 0; i < stages.length; i++) {
        var name = stages[i];
        var def = SPRITE_DEFS[name];
        var frames = [];
        for (var f = 0; f < 4; f++) {
            var c = document.createElement('canvas');
            c.width = def.w;
            c.height = def.h;
            var ctx2d = c.getContext('2d');
            ctx2d.clearRect(0, 0, def.w, def.h);
            ctx2d.imageSmoothingEnabled = false;
            def.draw(ctx2d, def.w, def.h, f);
            frames.push(c);
        }
        this.sprites[name] = { frames: frames, scale: def.scale };
    }
};

// 更新动画计时器(游戏循环每帧调用)
SpriteManager.prototype.update = function(dt) {
    this.animTime += dt;
    if (this.animTime >= this.frameDuration) {
        this.animTime -= this.frameDuration;
        this.frame = (this.frame + 1) % 4;
    }
};

// 获取精灵数据
SpriteManager.prototype.getDrawData = function(stage) {
    return this.sprites[stage] || null;
};

// 绘制精灵到目标Canvas
// ctx: 目标上下文, stage: 阶段名, frame: 帧0-3
// x,y: 屏幕坐标(中心点), rotation: 旋转弧度, scale: 额外缩放
SpriteManager.prototype.render = function(ctx, stage, frame, x, y, rotation, scale) {
    var data = this.sprites[stage];
    if (!data) return;
    var spriteCanvas = data.frames[frame] || data.frames[0];
    var spriteScale = data.scale * (scale || 1.0);
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = false;
    var dw = spriteCanvas.width * spriteScale;
    var dh = spriteCanvas.height * spriteScale;
    ctx.drawImage(spriteCanvas, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
};

// 获取阶段的显示尺寸(像素)
SpriteManager.prototype.getSize = function(stage) {
    var data = this.sprites[stage];
    if (!data) return { w: 0, h: 0 };
    return {
        w: SPRITE_DEFS[stage].w * data.scale,
        h: SPRITE_DEFS[stage].h * data.scale
    };
};

// ============================================================
// 全局精灵管理器实例
// player.js 和 enemy.js 通过 window.spriteManager 访问
// ============================================================
window.spriteManager = new SpriteManager();
window.SpriteManager = SpriteManager;
