#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源 - v5 精确版
调整y坐标和裁剪尺寸
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources.jpg')
print(f"图片尺寸: {img.size}")

# 创建输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped'
os.makedirs(output_dir, exist_ok=True)

# 清空玩家角色图片（保留调试图片）
for f in os.listdir(output_dir):
    if f.startswith('player_'):
        os.remove(os.path.join(output_dir, f))

# ========== 玩家角色 ==========
# 调整：y坐标往下移，frame_size增加到100

# 大展示图
player_big = img.crop((80, 250, 330, 550))
player_big.save(f'{output_dir}/player_big.png')
print(f"裁剪: player_big.png {player_big.size}")

# 行走动画帧
# 调整：y往下移30像素，frame_size=100
frame_size = 100
start_x = 380
gap_x = 87.5
rows_y = [275, 455, 635]  # 每行的y起始位置，往下移20像素

for row_idx, start_y in enumerate(rows_y):
    for col in range(4):
        x = int(start_x + col * gap_x)
        y = start_y
        frame = img.crop((x, y, x + frame_size, y + frame_size))
        direction = ['front', 'side', 'back'][row_idx]
        frame.save(f'{output_dir}/player_{direction}_{col+1}.png')
        print(f"裁剪: player_{direction}_{col+1}.png {frame.size} 位置: ({x},{y})")

print("\n========== 玩家角色裁剪完成 ==========")
print("请验证player_*.png的裁剪效果")
