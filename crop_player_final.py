#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源 - v9 最终精确版
基于测试图片确认的准确位置：x=390, y=180, 大小140x220
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources.jpg')
print(f"图片尺寸: {img.size}")

# 创建输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped'
os.makedirs(output_dir, exist_ok=True)

# 清空玩家角色图片（保留调试图片和测试图片）
for f in os.listdir(output_dir):
    if f.startswith('player_') and f != 'player_test.png':
        os.remove(os.path.join(output_dir, f))

# ========== 玩家角色 ==========
# 准确位置：x=390, y=180, 大小140x220
# 每帧间距100像素
# 三行：正面y=180, 侧面y=360, 背面y=540

frame_w = 140
frame_h = 220
start_x = 390
gap_x = 100
rows_y = [180, 360, 540]

for row_idx, start_y in enumerate(rows_y):
    for col in range(4):
        x = start_x + col * gap_x
        y = start_y
        frame = img.crop((x, y, x + frame_w, y + frame_h))
        direction = ['front', 'side', 'back'][row_idx]
        frame.save(f'{output_dir}/player_{direction}_{col+1}.png')
        print(f"裁剪: player_{direction}_{col+1}.png {frame.size} 位置: ({x},{y})")

# 大展示图
player_big = img.crop((80, 250, 330, 550))
player_big.save(f'{output_dir}/player_big.png')
print(f"裁剪: player_big.png {player_big.size}")

print("\n========== 玩家角色裁剪完成 ==========")
print("请验证player_*.png的裁剪效果")
