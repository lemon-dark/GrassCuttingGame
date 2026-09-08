#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源 v2 - 基于新的AI生成图片
布局清晰，一次性裁剪所有元素
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources_v2.png')
print(f"图片尺寸: {img.size}")

# 创建输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped_v2'
os.makedirs(output_dir, exist_ok=True)

# ========== 玩家角色 ==========
# 大展示图
player_big = img.crop((15, 45, 95, 135))
player_big.save(f'{output_dir}/player_big.png')
print(f"裁剪: player_big.png {player_big.size}")

# 正面行走（4帧）
for i in range(4):
    x = 105 + i * 60
    frame = img.crop((x, 45, x + 55, 125))
    frame.save(f'{output_dir}/player_front_{i+1}.png')
    print(f"裁剪: player_front_{i+1}.png {frame.size}")

# 侧面行走（4帧）
for i in range(4):
    x = 105 + i * 60
    frame = img.crop((x, 135, x + 55, 215))
    frame.save(f'{output_dir}/player_side_{i+1}.png')
    print(f"裁剪: player_side_{i+1}.png {frame.size}")

# 背面行走（4帧）
for i in range(4):
    x = 105 + i * 60
    frame = img.crop((x, 225, x + 55, 305))
    frame.save(f'{output_dir}/player_back_{i+1}.png')
    print(f"裁剪: player_back_{i+1}.png {frame.size}")

# ========== 怪物 ==========
# 普通小怪（史莱姆）2帧
for i in range(2):
    y = 50 + i * 110
    slime = img.crop((400, y, 490, y + 100))
    slime.save(f'{output_dir}/enemy_slime_{i+1}.png')
    print(f"裁剪: enemy_slime_{i+1}.png {slime.size}")

# 快速怪（红色小蝙蝠）2帧
for i in range(2):
    y = 50 + i * 110
    bat = img.crop((510, y, 630, y + 100))
    bat.save(f'{output_dir}/enemy_bat_{i+1}.png')
    print(f"裁剪: enemy_bat_{i+1}.png {bat.size}")

# 坦克怪（蓝色石头人）2帧
for i in range(2):
    y = 50 + i * 110
    golem = img.crop((650, y, 810, y + 100))
    golem.save(f'{output_dir}/enemy_golem_{i+1}.png')
    print(f"裁剪: enemy_golem_{i+1}.png {golem.size}")

# 精英怪（紫色恶魔）2帧
for i in range(2):
    y = 50 + i * 110
    demon = img.crop((830, y, 990, y + 100))
    demon.save(f'{output_dir}/enemy_demon_{i+1}.png')
    print(f"裁剪: enemy_demon_{i+1}.png {demon.size}")

# BOSS（巨型怪兽）2帧
for i in range(2):
    y = 30 + i * 130
    boss = img.crop((1010, y, 1240, y + 120))
    boss.save(f'{output_dir}/enemy_boss_{i+1}.png')
    print(f"裁剪: enemy_boss_{i+1}.png {boss.size}")

print("\n========== 玩家角色和怪物裁剪完成 ==========")
print(f"输出目录: {output_dir}")
print(f"文件数量: {len(os.listdir(output_dir))}")
