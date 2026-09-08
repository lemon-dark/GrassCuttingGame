import { SpriteSheets, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT, SPRITE_FRAME_COUNT } from '../assets/spritesheets.js';

// 角色和怪物 sprite sheet 加载器
export class SpriteLoader {
    // 加载所有 sprite sheet，完成后调用 callback
    static loadAll(scene, callback) {
        const keys = ['player', 'enemy_normal', 'enemy_fast', 'enemy_tank', 'enemy_elite', 'enemy_boss'];
        let loadedCount = 0;
        let failedCount = 0;
        
        const checkComplete = () => {
            if (loadedCount + failedCount >= keys.length) {
                console.log(`Sprite sheet 加载完成: 成功${loadedCount}, 失败${failedCount}`);
                if (callback) callback();
            }
        };
        
        for (const key of keys) {
            const data = SpriteSheets[key];
            if (!data) {
                console.error('Sprite sheet 数据不存在:', key);
                failedCount++;
                checkComplete();
                continue;
            }
            
            const img = new Image();
            img.onload = () => {
                try {
                    // 添加到 Phaser 纹理管理器
                    if (!scene.textures.exists(key)) {
                        scene.textures.addImage(key, img);
                        // 添加 sprite sheet 帧
                        const texture = scene.textures.get(key);
                        for (let i = 0; i < SPRITE_FRAME_COUNT; i++) {
                            texture.add(i, 0, i * SPRITE_FRAME_WIDTH, 0, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT);
                        }
                    }
                    
                    // 创建行走动画（如果还没创建）
                    const animKey = key + '_walk';
                    if (!scene.anims.exists(animKey)) {
                        const frameRate = key === 'player' ? 12 : 8; // 玩家12帧/秒，怪物8帧/秒
                        scene.anims.create({
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(key, { start: 0, end: SPRITE_FRAME_COUNT - 1 }),
                            frameRate: frameRate,
                            repeat: -1
                        });
                        console.log('动画创建成功:', animKey, '帧率:', frameRate + 'fps');
                    }
                    
                    loadedCount++;
                    console.log('Sprite sheet 加载成功:', key, img.width + 'x' + img.height);
                } catch (e) {
                    console.error('Sprite sheet 处理失败:', key, e);
                    failedCount++;
                }
                checkComplete();
            };
            img.onerror = () => {
                console.error('Sprite sheet 加载失败:', key);
                failedCount++;
                checkComplete();
            };
            img.src = data;
        }
    }
    
    // 创建带动画的 sprite（必须在 loadAll 完成后调用）
    static createAnimatedSprite(scene, x, y, key) {
        const sprite = scene.add.sprite(x, y, key);
        const animKey = key + '_walk';
        if (scene.anims.exists(animKey)) {
            sprite.play(animKey);
        }
        return sprite;
    }
}
