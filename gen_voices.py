#!/usr/bin/env python3
"""生成战斗语音音效（模拟人声的短促音效）"""
import wave
import struct
import math
import random

SAMPLE_RATE = 44100

def generate_voice(filename, freq_start, freq_end, duration, vibrato=0, formant_shift=0):
    """生成带颤音和共振峰的类人声音效"""
    num_samples = int(SAMPLE_RATE * duration)
    frames = []
    
    # ADSR 包络
    attack = int(num_samples * 0.08)
    decay = int(num_samples * 0.15)
    sustain = int(num_samples * 0.5)
    release = num_samples - attack - decay - sustain
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # 频率滑动
        progress = i / num_samples
        freq = freq_start + (freq_end - freq_start) * progress
        # 颤音
        if vibrato > 0:
            freq += math.sin(2 * math.pi * 6 * t) * vibrato
        
        # 基波 + 谐波（模拟人声共振峰）
        sample = 0
        sample += math.sin(2 * math.pi * freq * t) * 0.5
        sample += math.sin(2 * math.pi * freq * 2 * t) * 0.25
        sample += math.sin(2 * math.pi * (freq * 3 + formant_shift) * t) * 0.15
        sample += math.sin(2 * math.pi * (freq * 4 + formant_shift * 1.5) * t) * 0.1
        
        # 加一点噪声增加气息感
        sample += (random.random() - 0.5) * 0.05
        
        # ADSR 包络
        if i < attack:
            env = i / attack
        elif i < attack + decay:
            env = 1 - (i - attack) / decay * 0.3
        elif i < attack + decay + sustain:
            env = 0.7
        else:
            env = 0.7 * (1 - (i - attack - decay - sustain) / release)
        
        sample *= env * 0.6
        frames.append(int(max(-32767, min(32767, sample * 32767))))
    
    with wave.open(filename, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(struct.pack(f'<{len(frames)}h', *frames))
    print(f"Generated {filename} ({duration}s, {freq_start}-{freq_end}Hz)")

# 6种战斗语音
generate_voice('voice_attack.wav', 220, 350, 0.18, vibrato=5)       # "嘿！" 攻击
generate_voice('voice_kill.wav', 300, 180, 0.22, vibrato=8)         # "哈！" 击杀
generate_voice('voice_levelup.wav', 260, 520, 0.3, vibrato=10)      # "哦~" 升级
generate_voice('voice_hurt.wav', 200, 120, 0.15, vibrato=3)         # "呃！" 受伤
generate_voice('voice_ultimate.wav', 180, 600, 0.45, vibrato=15, formant_shift=50)  # "必杀——！" 超武
generate_voice('voice_lowhp.wav', 160, 140, 0.25, vibrato=12)       # "唔..." 低血量
print("All voice sounds generated!")
