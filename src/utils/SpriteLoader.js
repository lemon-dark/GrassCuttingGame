import { SpriteSheets, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT, SPRITE_FRAME_COUNT } from '../assets/spritesheets.js';
import { PlayerCartoonSheets, PLAYER_CARTOON_FRAME_WIDTH, PLAYER_CARTOON_FRAME_HEIGHT, PLAYER_CARTOON_FRAME_COUNT } from '../assets/player_cartoon_sheets.js';

// 角色和怪物 sprite sheet 加载器
export class SpriteLoader {
    // 加载所有 sprite sheet，完成后调用 callback
    static loadAll(scene, callback) {
        console.log('SpriteLoader.loadAll 被调用');
        const keys = ['player', 'enemy_normal', 'enemy_fast', 'enemy_tank', 'enemy_elite', 'enemy_boss'];
        let loadedCount = 0;
        let failedCount = 0;
        let callbackCalled = false;
        
        const checkComplete = () => {
            if (callbackCalled) return;
            if (loadedCount + failedCount >= keys.length) {
                callbackCalled = true;
                console.log(`Sprite sheet 加载完成: 成功${loadedCount}, 失败${failedCount}`);
                if (callback) callback();
            }
        };
        
        // 超时兜底：5秒后强制完成，避免永远卡住
        scene.time.delayedCall(5000, () => {
            if (!callbackCalled) {
                console.warn('Sprite sheet 加载超时，强制继续');
                callbackCalled = true;
                if (callback) callback();
            }
        });
        
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
                        const frameRate = key === 'player' ? 12 : 8;
                        scene.anims.create({
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(key, { start: 0, end: SPRITE_FRAME_COUNT - 1 }),
                            frameRate: frameRate,
                            repeat: -1
                        });
                    }
                    
                    loadedCount++;
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
        
        // 加载玩家角色卡通图片（三个方向）
        SpriteLoader.loadPlayerCartoon(scene);
    }
    
    // 加载玩家角色卡通图片（正面、侧面、背面，各5帧）
    static loadPlayerCartoon(scene) {
        const directions = ['front', 'side', 'back'];
        console.log('开始加载玩家角色卡通图片...');
        
        for (const direction of directions) {
            const key = 'player_cartoon_' + direction;
            const data = PlayerCartoonSheets[direction];
            if (!data) {
                console.error('玩家角色卡通图片数据不存在:', direction);
                continue;
            }
            
            const img = new Image();
            img.onload = () => {
                try {
                    // 添加到 Phaser 纹理管理器（和以前完全一样的方式）
                    if (!scene.textures.exists(key)) {
                        scene.textures.addImage(key, img);
                        // 添加 sprite sheet 帧
                        const texture = scene.textures.get(key);
                        for (let i = 0; i < PLAYER_CARTOON_FRAME_COUNT; i++) {
                            texture.add(i, 0, i * PLAYER_CARTOON_FRAME_WIDTH, 0, PLAYER_CARTOON_FRAME_WIDTH, PLAYER_CARTOON_FRAME_HEIGHT);
                        }
                    }
                    
                    // 创建行走动画（和以前完全一样的方式）
                    const animKey = key + '_walk';
                    if (!scene.anims.exists(animKey)) {
                        scene.anims.create({
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(key, { start: 0, end: PLAYER_CARTOON_FRAME_COUNT - 1 }),
                            frameRate: 10,
                            repeat: -1
                        });
                    }
                    
                    console.log('玩家角色卡通图片加载完成:', direction, img.width + 'x' + img.height);
                } catch (e) {
                    console.error('玩家角色卡通图片处理失败:', direction, e);
                }
            };
            img.onerror = () => {
                console.error('玩家角色卡通图片加载失败:', direction);
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
    
    // 创建玩家角色卡通sprite（支持三个方向动画）
    static createPlayerCartoonSprite(scene, x, y) {
        // 创建sprite，先使用透明纹理
        const sprite = scene.add.sprite(x, y, '__DEFAULT');
        sprite.setAlpha(0); // 先隐藏
        // 延迟设置纹理，确保玩家角色卡通纹理加载完成
        scene.time.delayedCall(2000, () => {
            if (scene.textures.exists('player_cartoon_side')) {
                sprite.setTexture('player_cartoon_side');
                sprite.setFrame(0);
                sprite.setAlpha(1); // 显示
                console.log('玩家角色sprite纹理已设置');
            } else {
                console.warn('玩家角色卡通纹理不存在');
            }
        });
        return sprite;
    }
    
    // 切换玩家角色动画方向
    static setPlayerDirection(scene, sprite, direction, isMoving) {
        const animKey = 'player_cartoon_' + direction + '_walk';
        if (scene.anims.exists(animKey)) {
            if (isMoving) {
                if (!sprite.anims.isPlaying || sprite.anims.getCurrentKey() !== animKey) {
                    sprite.play(animKey);
                }
            } else {
                if (sprite.anims.isPlaying) {
                    sprite.stop();
                    sprite.setFrame(0);
                }
            }
        }
    }
}
