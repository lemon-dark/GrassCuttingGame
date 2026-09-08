// 音效系统（Web Audio API 程序化生成 + 真实语音文件）
import { VoiceClips } from '../assets/voices.js';

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.voiceGain = null;
        this.initialized = false;
        this.voicesLoaded = false;
        this.voiceBuffers = {};
        this.voiceCooldowns = {
            attack: 0,
            hurt: 0,
            kill: 0,
            levelup: 0,
            lowhp: 0,
            ultimate: 0
        };
        this.voiceCooldownTimes = {
            attack: 2.5,    // 攻击语音每2.5秒最多一次
            hurt: 0.8,      // 受伤语音每0.8秒最多一次
            kill: 1.5,      // 击杀语音每1.5秒最多一次
            levelup: 0,     // 升级无冷却
            lowhp: 8,       // 低血量语音每8秒最多一次
            ultimate: 0     // 大招无冷却
        };
        this.settings = {
            masterVolume: 0.8,
            sfxVolume: 0.7,
            musicVolume: 0.5,
            pickupVolume: 0.5,
            voiceVolume: 0.7
        };
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.settings.masterVolume;
            this.masterGain.connect(this.ctx.destination);
            
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.settings.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.settings.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            this.voiceGain = this.ctx.createGain();
            this.voiceGain.gain.value = this.settings.voiceVolume;
            this.voiceGain.connect(this.masterGain);
            
            this.initialized = true;
            console.log('SoundManager initialized');
            
            // 异步加载语音
            this.loadVoices();
        } catch (e) {
            console.error('音频初始化失败', e);
        }
    }
    
    // 异步解码所有语音文件（直接解码base64，不用fetch）
    async loadVoices() {
        if (this.voicesLoaded) return;
        console.log('开始加载角色语音...');
        try {
            const keys = Object.keys(VoiceClips);
            for (const key of keys) {
                try {
                    const dataUri = VoiceClips[key];
                    // 从 data URI 中提取 base64 数据
                    const base64 = dataUri.split(',')[1];
                    // 解码 base64 为二进制字符串
                    const binaryString = atob(base64);
                    // 转换为 ArrayBuffer
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    // 解码音频
                    const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer);
                    this.voiceBuffers[key] = audioBuffer;
                    console.log(`语音加载成功: ${key} (${audioBuffer.duration.toFixed(1)}秒)`);
                } catch (e) {
                    console.error(`语音加载失败: ${key}`, e);
                }
            }
            this.voicesLoaded = true;
            console.log('角色语音全部加载完成:', Object.keys(this.voiceBuffers).length, '/', keys.length, '个');
        } catch (e) {
            console.error('语音加载过程出错:', e);
        }
    }
    
    // 播放真实语音（带冷却）
    playVoice(type) {
        if (!this.initialized || !this.voicesLoaded) return;
        
        // 冷却检查
        const now = this.ctx.currentTime;
        if (this.voiceCooldowns[type] > now) return;
        const cooldown = this.voiceCooldownTimes[type] || 0;
        if (cooldown > 0) {
            this.voiceCooldowns[type] = now + cooldown;
        }
        
        const buffer = this.voiceBuffers[type];
        if (!buffer) {
            console.warn('语音不存在:', type);
            return;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.voiceGain);
        source.start(0);
    }
    
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        if (this.initialized) {
            this.masterGain.gain.value = this.settings.masterVolume;
            this.sfxGain.gain.value = this.settings.sfxVolume;
            this.musicGain.gain.value = this.settings.musicVolume;
        }
    }
    
    // 播放简单音调
    playTone(freq, duration, type = 'sine', volume = 0.3, target = null) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(target || this.sfxGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    
    // 播放音效
    play(type, volume = 1.0) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        
        switch (type) {
            case 'shoot':
                this.playTone(800, 0.08, 'square', 0.15 * volume);
                this.playTone(400, 0.05, 'sawtooth', 0.1 * volume);
                break;
            case 'hit':
                this.playTone(200, 0.1, 'square', 0.2 * volume);
                this.playTone(150, 0.08, 'sawtooth', 0.15 * volume);
                break;
            case 'hurt':
                // 网游风格受伤音效：低频冲击 + 短噪声"啪"声，快速衰减
                this.playTone(90, 0.12, 'sine', 0.35 * volume);
                this.playTone(140, 0.08, 'sine', 0.2 * volume);
                this.playNoise(0.06, 0.15 * volume);
                break;
            case 'pickup':
                this.playTone(1200, 0.05, 'sine', 0.1 * this.settings.pickupVolume * volume);
                this.playTone(1600, 0.08, 'sine', 0.08 * this.settings.pickupVolume * volume);
                break;
            case 'death':
                this.playTone(300, 0.15, 'sawtooth', 0.2 * volume);
                this.playTone(200, 0.2, 'square', 0.15 * volume);
                break;
            case 'warning':
                this.playTone(440, 0.1, 'square', 0.2 * volume);
                setTimeout(() => this.playTone(440, 0.1, 'square', 0.2 * volume), 150);
                break;
            case 'levelup':
                this.playTone(523, 0.1, 'sine', 0.25 * volume);
                setTimeout(() => this.playTone(659, 0.1, 'sine', 0.25 * volume), 100);
                setTimeout(() => this.playTone(784, 0.15, 'sine', 0.25 * volume), 200);
                setTimeout(() => this.playTone(1047, 0.2, 'sine', 0.3 * volume), 300);
                break;
            case 'victory':
                const notes = [523, 659, 784, 1047, 784, 1047];
                notes.forEach((n, i) => {
                    setTimeout(() => this.playTone(n, 0.2, 'sine', 0.3 * volume), i * 150);
                });
                break;
            case 'explosion':
                // 噪声爆炸
                this.playNoise(0.3, 0.3 * volume);
                this.playTone(80, 0.3, 'sawtooth', 0.2 * volume);
                break;
            case 'lightning':
                this.playTone(2000, 0.05, 'sawtooth', 0.15 * volume);
                this.playTone(1000, 0.1, 'square', 0.1 * volume);
                this.playNoise(0.1, 0.1 * volume);
                break;
            case 'fireball':
                this.playTone(300, 0.2, 'sawtooth', 0.15 * volume);
                this.playNoise(0.15, 0.1 * volume);
                break;
            case 'missile':
                this.playTone(500, 0.1, 'square', 0.1 * volume);
                break;
            case 'ice':
                this.playTone(1500, 0.1, 'sine', 0.15 * volume);
                this.playTone(2000, 0.15, 'sine', 0.1 * volume);
                break;
            case 'slash':
                this.playTone(600, 0.05, 'sawtooth', 0.15 * volume);
                this.playTone(400, 0.08, 'square', 0.1 * volume);
                break;
            case 'aura':
                this.playTone(200, 0.1, 'sine', 0.05 * volume);
                break;
            case 'click':
                this.playTone(800, 0.05, 'square', 0.1 * volume);
                break;
            case 'coin':
                this.playTone(1000, 0.05, 'sine', 0.15 * volume);
                setTimeout(() => this.playTone(1400, 0.1, 'sine', 0.15 * volume), 50);
                break;
            case 'boss':
                this.playTone(100, 0.5, 'sawtooth', 0.3 * volume);
                this.playTone(80, 0.6, 'square', 0.25 * volume);
                break;
            default:
                this.playTone(440, 0.1, 'sine', 0.2 * volume);
        }
    }
    
    // 播放噪声（用于爆炸等）
    playNoise(duration, volume) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
    }
    
    // 播放背景音乐（简单循环旋律）
    playMusic() {
        if (!this.initialized) this.init();
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;
        
        const melody = [262, 294, 330, 349, 392, 440, 494, 523];
        let index = 0;
        
        const playNext = () => {
            if (!this.musicPlaying) return;
            this.playTone(melody[index % melody.length], 0.3, 'sine', 0.08, this.musicGain);
            index++;
            setTimeout(playNext, 400);
        };
        playNext();
    }
    
    stopMusic() {
        this.musicPlaying = false;
    }
}

// 单例
export const soundManager = new SoundManager();
