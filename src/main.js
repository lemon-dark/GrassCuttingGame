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
    scene: [MenuScene, GameScene, LevelScene, UpgradeScene, CharacterScene, EquipmentScene, BestiaryScene, SkillBestiaryScene, SettingsScene, ProgressionScene],
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

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

console.log('割草传说 Phaser版 启动 - 完整版');
