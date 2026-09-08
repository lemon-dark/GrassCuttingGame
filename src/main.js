import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { CharacterScene } from './scenes/CharacterScene.js';
import { EquipmentScene } from './scenes/EquipmentScene.js';
import { BestiaryScene, SkillBestiaryScene } from './scenes/BestiaryScenes.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { ProgressionScene } from './scenes/ProgressionScene.js';
import { ErrorLogScene } from './scenes/ErrorLogScene.js';

// === 全局错误捕获系统 ===
// 捕获所有未处理的错误，保存到localStorage，方便在游戏内查看
const ErrorLogger = {
    errors: [],
    maxErrors: 20,
    
    init() {
        // 从localStorage加载历史错误
        try {
            const saved = localStorage.getItem('game_errors');
            if (saved) {
                this.errors = JSON.parse(saved);
            }
        } catch (e) {}
        
        // 捕获全局错误
        window.onerror = (msg, url, line, col, error) => {
            this.addError('Global Error', msg, error ? error.stack : `at ${url}:${line}:${col}`);
            return false;
        };
        
        // 捕获未处理的Promise rejection
        window.onunhandledrejection = (event) => {
            const reason = event.reason;
            this.addError('Unhandled Promise', reason ? reason.message : String(reason), reason ? reason.stack : '');
        };
        
        // 捕获console.error
        const originalError = console.error;
        console.error = (...args) => {
            this.addError('Console Error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), '');
            originalError.apply(console, args);
        };
        
        console.log('错误日志系统已启动，历史错误数:', this.errors.length);
    },
    
    addError(type, message, stack) {
        const errorEntry = {
            type: type,
            message: String(message).substring(0, 500),
            stack: String(stack).substring(0, 2000),
            time: new Date().toLocaleString(),
            timestamp: Date.now()
        };
        
        this.errors.unshift(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }
        
        try {
            localStorage.setItem('game_errors', JSON.stringify(this.errors));
        } catch (e) {}
        
        console.log('=== 错误已记录 ===');
        console.log('类型:', type);
        console.log('消息:', message);
        if (stack) console.log('堆栈:', stack);
    },
    
    getErrors() {
        return this.errors;
    },
    
    clearErrors() {
        this.errors = [];
        try {
            localStorage.removeItem('game_errors');
        } catch (e) {}
    },
    
    hasErrors() {
        return this.errors.length > 0;
    }
};

ErrorLogger.init();
window.ErrorLogger = ErrorLogger;

// 关键：设置文本对象的默认渲染分辨率为设备像素比
// 这样文字会清晰锐利，且不会影响游戏对象的坐标系统
const dpr = window.devicePixelRatio || 1;
Phaser.GameObjects.Text.DEFAULT_RESOLUTION = dpr;
console.log('设备像素比:', dpr, '文本默认分辨率已设置');

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [MenuScene, GameScene, LevelScene, UpgradeScene, CharacterScene, EquipmentScene, BestiaryScene, SkillBestiaryScene, SettingsScene, ProgressionScene, ErrorLogScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
        powerPreference: 'high-performance'
    }
};

const game = new Phaser.Game(config);

// 暴露游戏实例到window，方便自动化测试
window.game = game;

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

console.log('割草传说 Phaser版 启动 - 完整版');
