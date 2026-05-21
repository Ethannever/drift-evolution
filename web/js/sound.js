// 音效系统 - Web Audio API
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
        // BGM 相关状态
        this.bgmEnabled = true;     // BGM 开关
        this.bgmGain = null;        // BGM 音量节点
        this.bgmNodes = [];         // BGM 振荡器节点列表（用于停止）
        this.bgmStarted = false;    // BGM 是否已启动
        this._init();
    }

    _init() {
        // 延迟初始化（需要用户交互后才能创建 AudioContext）
        const initAudio = () => {
            if (this.ctx) return;
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.3;
                this.masterGain.connect(this.ctx.destination);

                // 初始化 BGM 音量节点
                this.bgmGain = this.ctx.createGain();
                this.bgmGain.gain.value = 0.18; // BGM 音量 0.18，不喧宾夺主
                this.bgmGain.connect(this.masterGain);

                // 如果 BGM 已请求启动，延迟启动
                if (this.bgmEnabled && !this.bgmStarted) {
                    this.startBGM();
                }
            } catch(e) {
                this.enabled = false;
            }
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
        document.addEventListener('touchstart', initAudio, { once: false });
        document.addEventListener('click', initAudio, { once: false });
        document.addEventListener('keydown', initAudio, { once: false });
    }

    _tone(freq, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = volume;
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }

    // 收集物资 - 清脆叮咚
    collect() {
        this._tone(880, 0.1, 'sine', 0.2);
        setTimeout(() => this._tone(1320, 0.15, 'sine', 0.15), 50);
    }

    // 进化 - 上升和弦
    evolve() {
        const notes = [523, 659, 784, 1047]; // C E G C
        notes.forEach((n, i) => {
            setTimeout(() => this._tone(n, 0.3, 'sine', 0.2), i * 100);
        });
    }

    // 受到伤害 - 低沉冲击
    hit() {
        this._tone(150, 0.15, 'sawtooth', 0.3);
        this._tone(80, 0.2, 'square', 0.2);
    }

    // 射击 - 射击声
    fire() {
        this._tone(400, 0.08, 'square', 0.15);
        setTimeout(() => this._tone(200, 0.1, 'sawtooth', 0.1), 30);
    }

    // 升级/获得科技点
    levelUp() {
        this._tone(440, 0.15, 'sine', 0.2);
        setTimeout(() => this._tone(554, 0.15, 'sine', 0.2), 100);
        setTimeout(() => this._tone(659, 0.2, 'sine', 0.25), 200);
    }

    // 按钮点击
    click() {
        this._tone(600, 0.05, 'sine', 0.1);
    }

    // 敌人死亡
    enemyDeath() {
        this._tone(300, 0.1, 'sawtooth', 0.2);
        setTimeout(() => this._tone(200, 0.15, 'sawtooth', 0.15), 50);
        setTimeout(() => this._tone(100, 0.2, 'sawtooth', 0.1), 100);
    }

    // 宝箱开启
    treasure() {
        const notes = [392, 494, 587, 784]; // G B D G
        notes.forEach((n, i) => {
            setTimeout(() => this._tone(n, 0.2, 'triangle', 0.2), i * 80);
        });
    }

    // 警告
    warning() {
        this._tone(200, 0.2, 'square', 0.2);
        setTimeout(() => this._tone(200, 0.2, 'square', 0.2), 250);
    }

    // 启动背景音乐 - 多层氛围海浪风格 BGM
    // 低音 drone(双层) + 中音旋律(双声部) + 高音海鸟 + 海浪噪声涌动
    startBGM() {
        if (!this.ctx || this.bgmStarted) return;

        // 现代浏览器 AudioContext 需要 resume 才能出声
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.bgmStarted = true;
        const now = this.ctx.currentTime;

        // === 低音 drone 1 - 持续低频底噪 (A1) ===
        const drone = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        drone.type = 'sine';
        drone.frequency.value = 55; // A1
        droneGain.gain.value = 0.07;
        drone.connect(droneGain);
        droneGain.connect(this.bgmGain);
        drone.start(now);
        this.bgmNodes.push(drone);

        // === 低音 drone 2 - 五度音程 (E2) 增加厚度 ===
        const drone2 = this.ctx.createOscillator();
        const drone2Gain = this.ctx.createGain();
        drone2.type = 'sine';
        drone2.frequency.value = 82.41; // E2
        drone2Gain.gain.value = 0.04;
        drone2.connect(drone2Gain);
        drone2Gain.connect(this.bgmGain);
        drone2.start(now);
        this.bgmNodes.push(drone2);

        // === LFO 调制 - 海浪涌动感 (慢速) ===
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.12; // ~8秒一个周期，更慢
        lfoGain.gain.value = 0.035;
        lfo.connect(lfoGain);
        lfoGain.connect(droneGain.gain);
        lfo.start(now);
        this.bgmNodes.push(lfo);

        // === LFO2 - 为 drone2 提供反相涌动 ===
        const lfo2 = this.ctx.createOscillator();
        const lfo2Gain = this.ctx.createGain();
        lfo2.type = 'sine';
        lfo2.frequency.value = 0.09; // ~11秒，比lfo更慢
        lfo2Gain.gain.value = 0.025;
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(drone2Gain.gain);
        lfo2.start(now);
        this.bgmNodes.push(lfo2);

        // === 旋律层 - 五声音阶双声部 ===
        const scaleMain = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 D4 E4 G4 A4 C5
        const scaleHigh = [523.25, 587.33, 659.25, 783.99, 880.00];          // C5 D5 E5 G5 A5
        let noteIndex = 0;

        const playNote = () => {
            if (!this.bgmStarted || !this.ctx) return;

            const t = this.ctx.currentTime;

            // 主旋律
            const osc = this.ctx.createOscillator();
            const noteGain = this.ctx.createGain();
            osc.type = 'triangle'; // 三角波，比正弦更有质感
            osc.frequency.value = scaleMain[noteIndex % scaleMain.length];
            noteGain.gain.setValueAtTime(0, t);
            noteGain.gain.linearRampToValueAtTime(0.05, t + 0.4);
            noteGain.gain.linearRampToValueAtTime(0, t + 2.0);
            osc.connect(noteGain);
            noteGain.connect(this.bgmGain);
            osc.start(t);
            osc.stop(t + 2.0);

            // 高声部点缀 (每隔几个音触发)
            if (noteIndex % 3 === 0) {
                const osc2 = this.ctx.createOscillator();
                const noteGain2 = this.ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.value = scaleHigh[noteIndex % scaleHigh.length];
                noteGain2.gain.setValueAtTime(0, t + 0.5);
                noteGain2.gain.linearRampToValueAtTime(0.025, t + 0.8);
                noteGain2.gain.linearRampToValueAtTime(0, t + 2.5);
                osc2.connect(noteGain2);
                noteGain2.connect(this.bgmGain);
                osc2.start(t + 0.5);
                osc2.stop(t + 2.5);
            }

            noteIndex++;
            this._bgmTimer = setTimeout(playNote, 2000 + Math.random() * 800);
        };

        // === 高音点缀 - 海鸟声 (多声) ===
        const playBird = () => {
            if (!this.bgmStarted || !this.ctx) return;

            const birdScale = [783.99, 880.00, 1046.50, 1174.66]; // G5 A5 C6 D6
            const freq = birdScale[Math.floor(Math.random() * birdScale.length)];
            const t = this.ctx.currentTime;

            const osc = this.ctx.createOscillator();
            const birdGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // 短促滑音效果
            osc.frequency.setValueAtTime(freq * 0.9, t);
            osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);

            birdGain.gain.setValueAtTime(0, t);
            birdGain.gain.linearRampToValueAtTime(0.025, t + 0.05);
            birdGain.gain.linearRampToValueAtTime(0, t + 0.4);

            osc.connect(birdGain);
            birdGain.connect(this.bgmGain);
            osc.start(t);
            osc.stop(t + 0.4);

            // 偶尔双声鸟叫
            if (Math.random() < 0.3) {
                setTimeout(() => {
                    if (!this.bgmStarted || !this.ctx) return;
                    const f2 = birdScale[Math.floor(Math.random() * birdScale.length)];
                    const osc2 = this.ctx.createOscillator();
                    const g2 = this.ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.value = f2;
                    const t2 = this.ctx.currentTime;
                    g2.gain.setValueAtTime(0, t2);
                    g2.gain.linearRampToValueAtTime(0.02, t2 + 0.05);
                    g2.gain.linearRampToValueAtTime(0, t2 + 0.35);
                    osc2.connect(g2);
                    g2.connect(this.bgmGain);
                    osc2.start(t2);
                    osc2.stop(t2 + 0.35);
                }, 150 + Math.random() * 200);
            }

            this._birdTimer = setTimeout(playBird, 4000 + Math.random() * 6000);
        };

        // === 海浪噪声涌动 (用 oscillator 模拟) ===
        const playWave = () => {
            if (!this.bgmStarted || !this.ctx) return;

            const t = this.ctx.currentTime;

            // 低通滤波后的白噪声模拟海浪
            const bufferSize = this.ctx.sampleRate * 3; // 3秒缓冲
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.5;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 300;
            filter.Q.value = 0.7;

            const waveGain = this.ctx.createGain();
            waveGain.gain.setValueAtTime(0, t);
            waveGain.gain.linearRampToValueAtTime(0.025, t + 1.0);
            waveGain.gain.linearRampToValueAtTime(0.015, t + 2.0);
            waveGain.gain.linearRampToValueAtTime(0, t + 3.0);

            noise.connect(filter);
            filter.connect(waveGain);
            waveGain.connect(this.bgmGain);
            noise.start(t);
            noise.stop(t + 3.0);

            this._waveTimer = setTimeout(playWave, 5000 + Math.random() * 4000);
        };

        setTimeout(playNote, 500);
        setTimeout(playBird, 3000);
        setTimeout(playWave, 1500);
        console.log('🌊 BGM 已启动 - 多层氛围海浪');
    }

    // 停止背景音乐
    stopBGM() {
        this.bgmStarted = false;
        clearTimeout(this._bgmTimer);
        clearTimeout(this._birdTimer);
        clearTimeout(this._waveTimer);
        for (const node of this.bgmNodes) {
            try { node.stop(); } catch(e) {}
        }
        this.bgmNodes = [];
    }

    // 切换 BGM 开关
    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        if (this.bgmEnabled) {
            this.startBGM();
            if (this.bgmGain) {
                this.bgmGain.gain.value = 0.18;
            }
        } else {
            this.stopBGM();
        }
        return this.bgmEnabled;
    }

    // 切换静音（同时控制音效和BGM）
    toggleMute() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.3 : 0;
        }
        return this.enabled;
    }
}
