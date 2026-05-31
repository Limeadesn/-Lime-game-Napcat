// src/commands/jrrp.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, recalculateFinalStats, getMoney, addMoney, getMood, addMood, getHealth, addHealth, getFreePoints, addFreePoints } from '../core/player';
import { pluginState } from '../core/state';
import type { JrrpFortune, JrrpEvent } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 运势配置 ====================

/** 获取运势定义（永远有默认值兜底） */
function getFortunes(): JrrpFortune[] {
    return pluginState.config.jrrpConfig?.fortunes ?? [];
}

/** 获取指定运势的事件池 */
function getEventPool(fortuneName: string): JrrpEvent[] {
    const fortune = getFortunes().find(f => f.name === fortuneName);
    return fortune?.events ?? [];
}

function drawEvent(fortuneName: string): JrrpEvent {
    const pool = getEventPool(fortuneName);
    if (pool.length === 0) return { name: '无事发生', description: '平淡的一天', goldChange: 0, moodChange: 0, healthChange: 0, freePointChange: 0 };
    return pool[Math.floor(Math.random() * pool.length)];
}

// ==================== 存储路径 ====================

let jrrpDataDir: string = '';
let logger: any = null;

export function initJrrpStorage(ctx: any, dataPath: string): void {
    logger = ctx.logger;
    jrrpDataDir = path.join(dataPath, 'jrrp');
    if (!fs.existsSync(jrrpDataDir)) {
        fs.mkdirSync(jrrpDataDir, { recursive: true });
    }
    logger.info('[Jrrp] 存储模块已初始化，数据目录:', jrrpDataDir);
}

function getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getJrrpFilePath(userId: number): string {
    return path.join(jrrpDataDir, `${userId}.json`);
}

interface JrrpRecord {
    date: string;
    value: number;
    name: string;
    eventName: string;
    eventDescription: string;
    goldChange: number;
    moodChange: number;
    healthChange: number;
    freePointChange: number;
}

function loadJrrpRecord(userId: number): JrrpRecord | null {
    const filePath = getJrrpFilePath(userId);
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const record = JSON.parse(content);
            if (record.date === getTodayDate()) {
                return record;
            }
        }
    } catch (err) {
        logger?.error(`[Jrrp] 加载记录失败 ${userId}:`, err);
    }
    return null;
}

function saveJrrpRecord(userId: number, record: JrrpRecord): void {
    const filePath = getJrrpFilePath(userId);
    try {
        fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
        logger?.debug(`[Jrrp] 保存记录: ${userId}`);
    } catch (err) {
        logger?.error(`[Jrrp] 保存记录失败 ${userId}:`, err);
    }
}

// ==================== 简化版解读（群禁用时使用） ====================

const SIMPLE_READINGS: Record<string, string> = {
    '大凶': '今天似乎诸事不顺，建议低调行事，避开锋芒~',
    '凶': '运势不佳，可能会有小波折，但咬咬牙就过去了~',
    '小凶': '略有坎坷，不过总体可控，放轻松就好~',
    '平乐': '平平淡淡才是真，今天适合悠闲地度过~',
    '小吉': '稍微有点好运，注意把握身边的机遇哦~',
    '吉': '运气不错！好事可能会在不经意间发生~',
    '大吉': '超级好运日！做什么都会顺风顺水~',
};

let jrrpUnregDir = '';

function getJrrpUnregPath(userId: number): string {
    return path.join(jrrpUnregDir, `${userId}.json`);
}

function loadUnregRecord(userId: number): JrrpRecord | null {
    if (!jrrpUnregDir) return null;
    try {
        const p = getJrrpUnregPath(userId);
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch { }
    return null;
}

function saveUnregRecord(userId: number, record: JrrpRecord): void {
    if (!jrrpUnregDir) return;
    try {
        if (!fs.existsSync(jrrpUnregDir)) fs.mkdirSync(jrrpUnregDir, { recursive: true });
        fs.writeFileSync(getJrrpUnregPath(userId), JSON.stringify(record, null, 2), 'utf-8');
    } catch { }
}

async function handleJrrpSimple(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    const userId = event.user_id;

    // 初始化未注册存储目录
    if (!jrrpUnregDir) {
        jrrpUnregDir = path.join(ctx.dataPath, 'jrrp_unreg');
        if (!fs.existsSync(jrrpUnregDir)) fs.mkdirSync(jrrpUnregDir, { recursive: true });
    }

    // 检查今天是否已抽
    const existing = loadUnregRecord(userId);
    if (existing && existing.date === getTodayDate()) {
        const reading = SIMPLE_READINGS[existing.name] || '';
        await sendReply(`[今日人品]
抽签结果：${existing.value}
运势：${existing.name}
解读：${reading}
----------------------------------------
今天已经抽过了，明天再来吧~`);
        return;
    }

    const { value, fortuneName } = rollFortune();
    const reading = SIMPLE_READINGS[fortuneName] || '';

    const record: JrrpRecord = {
        date: getTodayDate(),
        value,
        name: fortuneName,
        eventName: '',
        eventDescription: reading,
        goldChange: 0,
        moodChange: 0,
        healthChange: 0,
        freePointChange: 0,
    };
    saveUnregRecord(userId, record);

    ctx.logger.info(`[Jrrp] 简化版 用户 ${userId} 抽到 ${fortuneName} (${value})`);
    await sendReply(`[今日人品]
抽签结果：${value}
运势：${fortuneName}
解读：${reading}`);
}

function rollFortune(): { value: number; fortuneName: string } {
    const value = Math.floor(Math.random() * 20) + 1;
    const fortune = getFortunes().find(f => value >= f.min && value <= f.max)!;
    return { value, fortuneName: fortune?.name ?? '平乐' };
}

function applyEventEffect(
    player: any,
    eventItem: JrrpEvent
): void {
    addMoney(player, eventItem.goldChange);
    addMood(player, eventItem.moodChange);
    addHealth(player, eventItem.healthChange);
    addFreePoints(player, eventItem.freePointChange);
    player.lastActive = Date.now();
}

// ==================== 指令处理 ====================

let jrrpInitialized = false;

/** 核心 jrrp 逻辑，不检查群设置 */
async function handleJrrpCore(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    if (!jrrpInitialized) {
        initJrrpStorage(ctx, ctx.dataPath);
        jrrpInitialized = true;
    }
    
    initPlayerStorage(ctx, ctx.dataPath);
    
    const userId = event.user_id;
    const isRegistered = isPlayerExists(userId);
    
    if (isRegistered) {
        const existingRecord = loadJrrpRecord(userId);
        if (existingRecord) {
            const changes: string[] = [];
            if (existingRecord.goldChange !== 0) {
                changes.push(`金币${existingRecord.goldChange >= 0 ? '+' : ''}${existingRecord.goldChange}`);
            }
            if (existingRecord.moodChange !== 0) {
                changes.push(`心情${existingRecord.moodChange >= 0 ? '+' : ''}${existingRecord.moodChange}`);
            }
            if (existingRecord.healthChange !== 0) {
                changes.push(`健康${existingRecord.healthChange >= 0 ? '+' : ''}${existingRecord.healthChange}`);
            }
            if (existingRecord.freePointChange !== 0) {
                changes.push(`自由点${existingRecord.freePointChange >= 0 ? '+' : ''}${existingRecord.freePointChange}`);
            }
            const changeText = changes.length > 0 ? `（${changes.join('，')}）` : '';
            
            await sendReply(`[今日人品]
抽签结果：${existingRecord.value}
运势：${existingRecord.name}
事件：${existingRecord.eventName}
详情：${existingRecord.eventDescription}${changeText}
----------------------------------------
你今天已经抽过了，明天再来吧~`);
            return;
        }
    }
    
    const { value, fortuneName } = rollFortune();
    const eventItem = drawEvent(fortuneName);
    
    const changes: string[] = [];
    if (eventItem.goldChange !== 0) {
        changes.push(`金币${eventItem.goldChange >= 0 ? '+' : ''}${eventItem.goldChange}`);
    }
    if (eventItem.moodChange !== 0) {
        changes.push(`心情${eventItem.moodChange >= 0 ? '+' : ''}${eventItem.moodChange}`);
    }
    if (eventItem.healthChange !== 0) {
        changes.push(`健康${eventItem.healthChange >= 0 ? '+' : ''}${eventItem.healthChange}`);
    }
    if (eventItem.freePointChange !== 0) {
        changes.push(`自由点${eventItem.freePointChange >= 0 ? '+' : ''}${eventItem.freePointChange}`);
    }
    const changeText = changes.length > 0 ? `（${changes.join('，')}）` : '';
    
    if (isRegistered) {
        const player = loadPlayer(userId);
        if (!player) {
            await sendReply(`[今日人品]
抽签结果：${value}
运势：${fortuneName}
事件：${eventItem.name}
详情：${eventItem.description}${changeText}
----------------------------------------
获取角色数据失败，请稍后重试~`);
            return;
        }
        
        applyEventEffect(player, eventItem);
        recalculateFinalStats(player);
        
        if (savePlayer(player)) {
            const record: JrrpRecord = {
                date: getTodayDate(),
                value,
                name: fortuneName,
                eventName: eventItem.name,
                eventDescription: eventItem.description,
                goldChange: eventItem.goldChange,
                moodChange: eventItem.moodChange,
                healthChange: eventItem.healthChange,
                freePointChange: eventItem.freePointChange
            };
            saveJrrpRecord(userId, record);
            
            await sendReply(`[今日人品]
抽签结果：${value}
运势：${fortuneName}
事件：${eventItem.name}
详情：${eventItem.description}${changeText}`);
        } else {
            await sendReply(`[今日人品]
抽签结果：${value}
运势：${fortuneName}
事件：${eventItem.name}
详情：${eventItem.description}${changeText}
----------------------------------------
数据保存失败，请稍后重试~`);
        }
    } else {
        await sendReply(`[今日人品]
抽签结果：${value}
运势：${fortuneName}
事件：${eventItem.name}
详情：${eventItem.description}
----------------------------------------
你还没有注册角色，本次运势不会生效。
使用 .reg 命令注册后即可享受运势效果~`);
    }
    
    ctx.logger.info(`[Jrrp] 用户 ${userId} 抽到 ${fortuneName} (${value})，事件: ${eventItem.name}，注册状态: ${isRegistered}`);
}

/** .jrrp —— 群启用时完整版（需注册+事件效果），群禁用时简化版（仅运势解读） */
export async function handleJrrp(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    const groupId = event.group_id;
    const groupEnabled = !groupId || pluginState.isGroupEnabled(String(groupId));

    if (!groupEnabled) {
        return handleJrrpSimple(ctx, event, sendReply);
    }
    return handleJrrpCore(ctx, event, sendReply);
}