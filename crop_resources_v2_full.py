#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源 v2 - 完整版
裁剪所有元素：背景、UI、特效、道具
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources_v2.png')
print(f"图片尺寸: {img.size}")

# 输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped_v2'
os.makedirs(output_dir, exist_ok=True)

# ========== 背景元素 ==========
# 草地瓦片（4种）
grass_positions = [(20, 385), (90, 385), (20, 455), (90, 455)]
for i, (x, y) in enumerate(grass_positions):
    grass = img.crop((x, y, x + 60, y + 60))
    grass.save(f'{output_dir}/grass_{i+1}.png')
    print(f"裁剪: grass_{i+1}.png {grass.size}")

# 树木（3种）
tree_sizes = [(55, 70), (70, 85), (90, 100)]
tree_x = [185, 245, 320]
for i in range(3):
    x = tree_x[i]
    w, h = tree_sizes[i]
    tree = img.crop((x, 400 - h + 70, x + w, 470))
    tree.save(f'{output_dir}/tree_{i+1}.png')
    print(f"裁剪: tree_{i+1}.png {tree.size}")

# 石头（3种）
stone_sizes = [(35, 30), (50, 45), (65, 60)]
stone_x = [410, 455, 515]
for i in range(3):
    x = stone_x[i]
    w, h = stone_sizes[i]
    stone = img.crop((x, 470 - h, x + w, 470))
    stone.save(f'{output_dir}/stone_{i+1}.png')
    print(f"裁剪: stone_{i+1}.png {stone.size}")

# 花朵（5种）
flower_colors = ['white', 'yellow', 'red', 'blue', 'purple']
flower_x = [575, 615, 655, 575, 615]
flower_y = [390, 390, 390, 440, 440]
for i in range(5):
    x = flower_x[i]
    y = flower_y[i]
    flower = img.crop((x, y, x + 35, y + 35))
    flower.save(f'{output_dir}/flower_{flower_colors[i]}.png')
    print(f"裁剪: flower_{flower_colors[i]}.png {flower.size}")

# 灌木丛（2种）
bush_x = [730, 730]
bush_y = [400, 450]
for i in range(2):
    x = bush_x[i]
    y = bush_y[i]
    bush = img.crop((x, y, x + 60, y + 50))
    bush.save(f'{output_dir}/bush_{i+1}.png')
    print(f"裁剪: bush_{i+1}.png {bush.size}")

# 建筑物（3种）
building_x = [830, 930, 1030]
for i in range(3):
    x = building_x[i]
    building = img.crop((x, 380, x + 90, 480))
    building.save(f'{output_dir}/building_{i+1}.png')
    print(f"裁剪: building_{i+1}.png {building.size}")

# ========== UI元素 ==========
# 圆地按钮（6种）- 蓝色3个 + 橙色3个
button_colors = ['blue_normal', 'blue_hover', 'blue_press', 'orange_normal', 'orange_hover', 'orange_press']
button_x = [20, 100, 180, 20, 100, 180]
button_y = [590, 590, 590, 660, 660, 660]
for i in range(6):
    x = button_x[i]
    y = button_y[i]
    button = img.crop((x, y, x + 70, y + 50))
    button.save(f'{output_dir}/ui_button_{button_colors[i]}.png')
    print(f"裁剪: ui_button_{button_colors[i]}.png {button.size}")

# 血条
hp_bar = img.crop((280, 590, 460, 625))
hp_bar.save(f'{output_dir}/ui_hp_bar.png')
print(f"裁剪: ui_hp_bar.png {hp_bar.size}")

# 经验条
exp_bar = img.crop((280, 660, 460, 695))
exp_bar.save(f'{output_dir}/ui_exp_bar.png')
print(f"裁剪: ui_exp_bar.png {exp_bar.size}")

# 升级卡片（3种）- 普通、稀有、史诗
card_types = ['common', 'rare', 'epic']
card_x = [500, 590, 680]
for i in range(3):
    x = card_x[i]
    card = img.crop((x, 590, x + 80, 700))
    card.save(f'{output_dir}/ui_card_{card_types[i]}.png')
    print(f"裁剪: ui_card_{card_types[i]}.png {card.size}")

# 图标（10种）
icon_names = ['weapon', 'shield', 'potion', 'coin', 'exp', 'skill', 'settings', 'pause', 'shop', 'backpack']
icon_x = [770, 840, 910, 980, 1050, 770, 840, 910, 980, 1050]
icon_y = [590, 590, 590, 590, 590, 660, 660, 660, 660, 660]
for i in range(10):
    x = icon_x[i]
    y = icon_y[i]
    icon = img.crop((x, y, x + 55, y + 55))
    icon.save(f'{output_dir}/ui_icon_{icon_names[i]}.png')
    print(f"裁剪: ui_icon_{icon_names[i]}.png {icon.size}")

# ========== 特效元素 ==========
# 爆炸效果（3种）- 小、中、大
explosion_sizes = ['small', 'medium', 'large']
explosion_x = [20, 80, 160]
for i in range(3):
    x = explosion_x[i]
    w = 50 + i * 20
    explosion = img.crop((x, 810, x + w, 810 + w))
    explosion.save(f'{output_dir}/effect_explosion_{explosion_sizes[i]}.png')
    print(f"裁剪: effect_explosion_{explosion_sizes[i]}.png {explosion.size}")

# 击中效果（2帧）
for i in range(2):
    x = 250 + i * 70
    hit = img.crop((x, 810, x + 60, 870))
    hit.save(f'{output_dir}/effect_hit_{i+1}.png')
    print(f"裁剪: effect_hit_{i+1}.png {hit.size}")

# 升级效果 - 星星 + 光芒
upgrade_star = img.crop((390, 810, 450, 870))
upgrade_star.save(f'{output_dir}/effect_upgrade_star.png')
print(f"裁剪: effect_upgrade_star.png {upgrade_star.size}")

upgrade_light = img.crop((460, 810, 530, 880))
upgrade_light.save(f'{output_dir}/effect_upgrade_light.png')
print(f"裁剪: effect_upgrade_light.png {upgrade_light.size}")

# 拾取效果 - 光环 + 闪光
pickup_ring = img.crop((560, 820, 630, 880))
pickup_ring.save(f'{output_dir}/effect_pickup_ring.png')
print(f"裁剪: effect_pickup_ring.png {pickup_ring.size}")

pickup_sparkle = img.crop((640, 810, 690, 880))
pickup_sparkle.save(f'{output_dir}/effect_pickup_sparkle.png')
print(f"裁剪: effect_pickup_sparkle.png {pickup_sparkle.size}")

# 粒子（10种）
particle_names = ['circle', 'star', 'spark', 'smoke', 'bubble', 'leaf', 'drop', 'lightning', 'heart', 'purple']
particle_x = [720, 780, 840, 900, 960, 720, 780, 840, 900, 960]
particle_y = [810, 810, 810, 810, 810, 870, 870, 870, 870, 870]
for i in range(10):
    x = particle_x[i]
    y = particle_y[i]
    particle = img.crop((x, y, x + 50, y + 50))
    particle.save(f'{output_dir}/effect_particle_{particle_names[i]}.png')
    print(f"裁剪: effect_particle_{particle_names[i]}.png {particle.size}")

# ========== 道具 ==========
# 金币（3帧）
for i in range(3):
    x = 20 + i * 70
    coin = img.crop((x, 1010, x + 60, 1070))
    coin.save(f'{output_dir}/item_coin_{i+1}.png')
    print(f"裁剪: item_coin_{i+1}.png {coin.size}")

# 经验宝石（3种）- 蓝色、绿色、紫色
gem_colors = ['blue', 'green', 'purple']
gem_x = [250, 330, 410]
for i in range(3):
    x = gem_x[i]
    gem = img.crop((x, 1010, x + 60, 1080))
    gem.save(f'{output_dir}/item_gem_{gem_colors[i]}.png')
    print(f"裁剪: item_gem_{gem_colors[i]}.png {gem.size}")

# 药水（3种）- 血、蓝、毒
potion_colors = ['red', 'blue', 'green']
potion_x = [500, 580, 660]
for i in range(3):
    x = potion_x[i]
    potion = img.crop((x, 1010, x + 60, 1080))
    potion.save(f'{output_dir}/item_potion_{potion_colors[i]}.png')
    print(f"裁剪: item_potion_{potion_colors[i]}.png {potion.size}")

# 宝箱（2种）- 普通、金色
chest_types = ['normal', 'gold']
chest_x = [750, 850]
for i in range(2):
    x = chest_x[i]
    chest = img.crop((x, 1010, x + 90, 1080))
    chest.save(f'{output_dir}/item_chest_{chest_types[i]}.png')
    print(f"裁剪: item_chest_{chest_types[i]}.png {chest.size}")

print("\n========== 所有资源裁剪完成 ==========")
print(f"输出目录: {output_dir}")
print(f"文件总数: {len(os.listdir(output_dir))}")
