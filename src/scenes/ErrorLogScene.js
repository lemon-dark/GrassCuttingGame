import Phaser from 'phaser';
import { soundManager } from '../audio/SoundManager.js';

export class ErrorLogScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ErrorLogScene' });
    }
    
    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        // 背景
        this.add.rectangle(w / 2, h / 2, w, h, 0x1A1A2E, 1);
        
        // 标题
        this.add.text(w / 2, h * 0.08, '错误日志', {
            fontSize: '32px',
            color: '#FF5252',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // 返回按钮
        const backBtn = this.add.rectangle(60, h * 0.08, 80, 40, 0x607D8B, 0.8)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(60, h * 0.08, '返回', {
            fontSize: '18px',
            color: '#FFFFFF',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            soundManager.play('click');
            this.scene.start('MenuScene');
        });
        
        // 清空按钮
        const clearBtn = this.add.rectangle(w - 70, h * 0.08, 100, 40, 0xF44336, 0.8)
            .setStrokeStyle(2, 0xFFFFFF, 0.5)
            .setInteractive({ useHandCursor: true });
        this.add.text(w - 70, h * 0.08, '清空日志', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        clearBtn.on('pointerdown', () => {
            soundManager.play('click');
            if (window.ErrorLogger) {
                window.ErrorLogger.clearErrors();
            }
            this.scene.restart();
        });
        
        // 获取错误日志
        const errors = window.ErrorLogger ? window.ErrorLogger.getErrors() : [];
        
        if (errors.length === 0) {
            this.add.text(w / 2, h / 2, '暂无错误记录\n游戏运行正常', {
                fontSize: '24px',
                color: '#4CAF50',
                align: 'center',
                lineSpacing: 10
            }).setOrigin(0.5);
            return;
        }
        
        // 错误列表（可滚动）
        const listY = h * 0.15;
        const listH = h * 0.8;
        const itemH = 120;
        const gap = 10;
        
        // 创建一个容器来存放错误列表
        const container = this.add.container(0, 0);
        let currentY = listY;
        
        errors.forEach((error, index) => {
            // 错误项背景
            const bg = this.add.rectangle(w / 2, currentY + itemH / 2, w * 0.9, itemH, 
                index === 0 ? 0x3E2723 : 0x2A2A3E, 0.9)
                .setStrokeStyle(2, index === 0 ? 0xFF5252 : 0x555555, 0.8);
            
            // 错误类型和时间
            this.add.text(w * 0.08, currentY + 10, `[${error.type}] ${error.time}`, {
                fontSize: '14px',
                color: index === 0 ? '#FF5252' : '#FF9800',
                fontWeight: 'bold'
            }).setOrigin(0, 0);
            
            // 错误消息
            this.add.text(w * 0.08, currentY + 35, error.message, {
                fontSize: '14px',
                color: '#FFFFFF',
                wordWrap: { width: w * 0.84 },
                align: 'left'
            }).setOrigin(0, 0);
            
            // 错误堆栈（如果有）
            if (error.stack) {
                this.add.text(w * 0.08, currentY + 70, error.stack.substring(0, 200), {
                    fontSize: '11px',
                    color: '#AAAAAA',
                    wordWrap: { width: w * 0.84 },
                    align: 'left'
                }).setOrigin(0, 0);
            }
            
            currentY += itemH + gap;
        });
        
        // 滚动提示
        this.add.text(w / 2, h - 15, '共 ' + errors.length + ' 条错误记录 | 最新的在最上面', {
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5);
        
        // 简单的滚动（上下拖动）
        let isDragging = false;
        let startY = 0;
        let containerStartY = 0;
        
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > listY && pointer.y < listY + listH) {
                isDragging = true;
                startY = pointer.y;
                containerStartY = container.y;
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                const deltaY = pointer.y - startY;
                container.y = containerStartY + deltaY;
                // 限制滚动范围
                const maxScroll = Math.max(0, (currentY - listY) - listH);
                container.y = Phaser.Math.Clamp(container.y, -maxScroll, 0);
            }
        });
        
        this.input.on('pointerup', () => {
            isDragging = false;
        });
    }
}
