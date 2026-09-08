#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源 - v4 精确版
基于调试图片分析，先裁剪玩家角色，验证后再继续
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources.jpg')
print(f"图片尺寸: {img.size}")

# 创建输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped'
os.makedirs(output_dir, exist_ok=True)

# 清空目录（保留调试图片）
for f in os.listdir(output_dir):
    if not f.startswith('_debug'):
        os.remove(os.path.join(output_dir, f))

# ========== 玩家角色 ==========
# 基于调试图片分析：
# 调试图片从x=30, y=100开始
# 大展示图在调试图片中x=50-300, y=150-450
# 所以在原图中x=80-330, y=250-550

# 大展示图
player_big = img.crop((80, 250, 330, 550))
player_big.save(f'{output_dir}/player_big.png')
print(f"裁剪: player_big.png {player_big.size}")

# 行走动画帧
# 第一行（正面）：原图中x=380-730, y=250-400
# 第二行（侧面）：原图中x=380-730, y=430-580
# 第三行（背面）：原图中x=380-730, y=610-760
# 每帧宽度约87.5像素 (350/4)，角色图像约80x80，文字在下方

frame_size = 80  # 只裁剪角色图像部分，不包含文字
start_x = 385
gap_x = 87.5
rows_y = [255, 435, 615]  # 每行的y起始位置

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
