#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources.jpg')
print(f"图片尺寸: {img.size}")

# 创建输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped'
os.makedirs(output_dir, exist_ok=True)

# ========== 玩家角色 ==========
# 大展示图 (左上角)
player_big = img.crop((40, 140, 260, 360))
player_big.save(f'{output_dir}/player_big.png')
print(f"裁剪: player_big.png {player_big.size}")

# 行走动画帧 (大展示图右边，3行4列)
# 第一行: 正面行走1-4
# 第二行: 侧面行走1-4
# 第三行: 背面行走1-4
frame_w, frame_h = 110, 110
start_x, start_y = 300, 140
gap_x, gap_y = 120, 120

for row in range(3):
    for col in range(4):
        x = start_x + col * gap_x
        y = start_y + row * gap_y
        frame = img.crop((x, y, x + frame_w, y + frame_h))
        direction = ['front', 'side', 'back'][row]
        frame.save(f'{output_dir}/player_{direction}_{col+1}.png')
        print(f"裁剪: player_{direction}_{col+1}.png {frame.size}")

# ========== 怪物 ==========
# 史莱姆1 (绿色)
slime1 = img.crop((40, 430, 180, 560))
slime1.save(f'{output_dir}/enemy_slime1.png')
print(f"裁剪: enemy_slime1.png {slime1.size}")

# 史莱姆2 (绿色)
slime2 = img.crop((190, 430, 330, 560))
slime2.save(f'{output_dir}/enemy_slime2.png')
print(f"裁剪: enemy_slime2.png {slime2.size}")

# 红色蝙蝠
bat_red = img.crop((380, 420, 540, 540))
bat_red.save(f'{output_dir}/enemy_bat_red.png')
print(f"裁剪: enemy_bat_red.png {bat_red.size}")

# 紫色蝙蝠
bat_purple = img.crop((550, 420, 710, 540))
bat_purple.save(f'{output_dir}/enemy_bat_purple.png')
print(f"裁剪: enemy_bat_purple.png {bat_purple.size}")

# 蓝色石头人
golem = img.crop((1050, 150, 1350, 340))
golem.save(f'{output_dir}/enemy_golem.png')
print(f"裁剪: enemy_golem.png {golem.size}")

# 紫色精英恶魔
demon = img.crop((1500, 140, 1850, 340))
demon.save(f'{output_dir}/enemy_demon.png')
print(f"裁剪: enemy_demon.png {demon.size}")

# 橙色BOSS
boss = img.crop((1000, 380, 1400, 580))
boss.save(f'{output_dir}/enemy_boss.png')
print(f"裁剪: enemy_boss.png {boss.size}")

# ========== 草地瓦片 ==========
for i in range(4):
    x = 50 + i * 160
    grass = img.crop((x, 620, x + 140, 720))
    grass.save(f'{output_dir}/grass_{i+1}.png')
    print(f"裁剪: grass_{i+1}.png {grass.size}")

# ========== 背景元素 ==========
# 小树
tree1 = img.crop((300, 740, 420, 850))
tree1.save(f'{output_dir}/tree_small.png')
print(f"裁剪: tree_small.png {tree1.size}")

# 大树
tree2 = img.crop((430, 740, 560, 850))
tree2.save(f'{output_dir}/tree_big.png')
print(f"裁剪: tree_big.png {tree2.size}")

# 石头
rock1 = img.crop((580, 750, 680, 840))
rock1.save(f'{output_dir}/rock1.png')
print(f"裁剪: rock1.png {rock1.size}")

rock2 = img.crop((690, 750, 790, 840))
rock2.save(f'{output_dir}/rock2.png')
print(f"裁剪: rock2.png {rock2.size}")

# 花朵
for i in range(5):
    x = 50 + i * 80
    flower = img.crop((x, 870, x + 60, 940))
    flower.save(f'{output_dir}/flower_{i+1}.png')
    print(f"裁剪: flower_{i+1}.png {flower.size}")

# 小房子
house1 = img.crop((1450, 830, 1650, 950))
house1.save(f'{output_dir}/house_wood.png')
print(f"裁剪: house_wood.png {house1.size}")

house2 = img.crop((1660, 830, 1860, 950))
house2.save(f'{output_dir}/house_stone.png')
print(f"裁剪: house_stone.png {house2.size}")

# ========== UI元素 ==========
# 按钮 (圆形)
for i, color in enumerate(['blue', 'orange1', 'orange2', 'green', 'blue2', 'red']):
    x = 50 + i * 100
    btn = img.crop((x, 1050, x + 80, 1130))
    btn.save(f'{output_dir}/button_{color}.png')
    print(f"裁剪: button_{color}.png {btn.size}")

# 血条
hp_bar = img.crop((1400, 400, 1900, 440))
hp_bar.save(f'{output_dir}/ui_hp_bar.png')
print(f"裁剪: ui_hp_bar.png {hp_bar.size}")

# 经验条
xp_bar = img.crop((1400, 450, 1900, 490))
xp_bar.save(f'{output_dir}/ui_xp_bar.png')
print(f"裁剪: ui_xp_bar.png {xp_bar.size}")

# 图标
icons = ['sword', 'coin', 'gem', 'exp', 'star']
for i, icon in enumerate(icons):
    x = 1400 + i * 90
    icon_img = img.crop((x, 500, x + 70, 570))
    icon_img.save(f'{output_dir}/icon_{icon}.png')
    print(f"裁剪: icon_{icon}.png {icon_img.size}")

# ========== 特效元素 ==========
# 爆炸
explosion1 = img.crop((40, 750, 140, 850))
explosion1.save(f'{output_dir}/effect_explosion1.png')
print(f"裁剪: effect_explosion1.png {explosion1.size}")

explosion2 = img.crop((140, 750, 240, 850))
explosion2.save(f'{output_dir}/effect_explosion2.png')
print(f"裁剪: effect_explosion2.png {explosion2.size}")

# 星星/粒子
particles = ['star1', 'star2', 'diamond', 'shield', 'medal']
for i, p in enumerate(particles):
    x = 1000 + i * 100
    particle = img.crop((x, 630, x + 80, 720))
    particle.save(f'{output_dir}/particle_{p}.png')
    print(f"裁剪: particle_{p}.png {particle.size}")

# ========== 道具 ==========
# 金币
coin = img.crop((1000, 1050, 1100, 1140))
coin.save(f'{output_dir}/item_coin.png')
print(f"裁剪: item_coin.png {coin.size}")

# 药水
for i, color in enumerate(['purple', 'green']):
    x = 1120 + i * 90
    potion = img.crop((x, 1050, x + 70, 1150))
    potion.save(f'{output_dir}/item_potion_{color}.png')
    print(f"裁剪: item_potion_{color}.png {potion.size}")

# 宝箱
chest1 = img.crop((1400, 1030, 1600, 1160))
chest1.save(f'{output_dir}/item_chest_wood.png')
print(f"裁剪: item_chest_wood.png {chest1.size}")

chest2 = img.crop((1610, 1030, 1810, 1160))
chest2.save(f'{output_dir}/item_chest_gold.png')
print(f"裁剪: item_chest_gold.png {chest2.size}")

print("\n========== 裁剪完成 ==========")
print(f"输出目录: {output_dir}")
print(f"文件数量: {len(os.listdir(output_dir))}")
