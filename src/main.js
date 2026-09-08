import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { CharacterScene } from './scenes/CharacterScene.js';
import { EquipmentScene } from './scenes/EquipmentScene.js';
import { BestiaryScene, SkillBestiaryScene } from './scenes/BestiaryScenes.js';
import { SettingsScene } from './scenes/SettingsScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1, // 关键：按设备像素比渲染，文字清晰
    scene: [MenuScene, GameScene, LevelScene, UpgradeScene, CharacterScene, EquipmentScene, BestiaryScene, SkillBestiaryScene, SettingsScene],
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
        antialiasGL: true, // WebGL抗锯齿
        pixelArt: false,
        roundPixels: false, // 文字渲染需要关闭圆整像素，否则可能模糊
        powerPreference: 'high-performance'
    }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

console.log('割草传说 Phaser版 启动 - 完整版');
