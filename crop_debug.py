#!/usr/bin/env python3
"""
裁剪Q版卡通游戏资源 - v3 修正版
先裁大区域确认位置
"""
from PIL import Image
import os

# 打开图片
img = Image.open('/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_resources.jpg')
print(f"图片尺寸: {img.size}")

# 创建输出目录
output_dir = '/home/user/Doubao/chats/38440549286025730/projects/GrassCuttingGame-Phaser/assets/cartoon_cropped'
os.makedirs(output_dir, exist_ok=True)

# 清空目录
for f in os.listdir(output_dir):
    os.remove(os.path.join(output_dir, f))

# 先裁几个大区域确认位置
# 玩家角色整个区域 (左上)
player_area = img.crop((30, 100, 750, 580))
player_area.save(f'{output_dir}/_debug_player_area.png')
print(f"调试: player_area {player_area.size}")

# 怪物整个区域 (左中)
enemy_area = img.crop((30, 420, 750, 620))
enemy_area.save(f'{output_dir}/_debug_enemy_area.png')
print(f"调试: enemy_area {enemy_area.size}")

# 右上区域 (石头人+恶魔)
top_right = img.crop((1000, 100, 1900, 380))
top_right.save(f'{output_dir}/_debug_top_right.png')
print(f"调试: top_right {top_right.size}")

# BOSS区域
boss_area = img.crop((1000, 380, 1450, 600))
boss_area.save(f'{output_dir}/_debug_boss_area.png')
print(f"调试: boss_area {boss_area.size}")

# 草地瓦片区域
grass_area = img.crop((30, 620, 750, 760))
grass_area.save(f'{output_dir}/_debug_grass_area.png')
print(f"调试: grass_area {grass_area.size}")

# 背景元素区域
bg_area = img.crop((30, 760, 850, 980))
bg_area.save(f'{output_dir}/_debug_bg_area.png')
print(f"调试: bg_area {bg_area.size}")

# UI按钮区域
ui_area = img.crop((30, 1030, 750, 1180))
ui_area.save(f'{output_dir}/_debug_ui_area.png')
print(f"调试: ui_area {ui_area.size}")

# 特效区域
effect_area = img.crop((980, 620, 1900, 760))
effect_area.save(f'{output_dir}/_debug_effect_area.png')
print(f"调试: effect_area {effect_area.size}")

# 道具区域
item_area = img.crop((980, 1030, 1900, 1200))
item_area.save(f'{output_dir}/_debug_item_area.png')
print(f"调试: item_area {item_area.size}")

# 血条经验条区域
bar_area = img.crop((1380, 400, 1950, 600))
bar_area.save(f'{output_dir}/_debug_bar_area.png')
print(f"调试: bar_area {bar_area.size}")

# 房子区域
house_area = img.crop((1400, 830, 1900, 990))
house_area.save(f'{output_dir}/_debug_house_area.png')
print(f"调试: house_area {house_area.size}")

print("\n========== 调试裁剪完成 ==========")
print("请查看_debug_开头的图片，确认各区域位置")
