/**
 * 数据存储工具模块 - 精简版
 * 只记录抽取数据，不记录文案
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface JrrpRecord {
    userId: number;
    date: string;
    value: number;  // 只存数值 1-9
}

export interface StorageData {
    jrrpRecords: JrrpRecord[];
}

// ==================== 运势文案配置 ====================

export const FORTUNES: Record<number, { name: string; description: string }> = {
    1: { name: '大凶', description: '今日诸事不宜，建议宅家避难，出门记得看黄历！' },
    2: { name: '凶', description: '运势低迷，小心破财，贵重物品要看好哦~' },
    3: { name: '小凶', description: '略有波折，但问题不大，深呼吸放轻松~' },
    4: { name: '末凶', description: '运势平平，无大碍也无惊喜，适合佛系度日。' },
    5: { name: '平乐', description: '无灾无难，心情不错，适合和朋友聊聊天。' },
    6: { name: '末吉', description: '小确幸将至，也许会有意外的好事发生~' },
    7: { name: '小吉', description: '运势不错，抓住机会，今天会顺利！' },
    8: { name: '中吉', description: '心想事成，好事成双，勇敢冲吧！' },
    9: { name: '大吉', description: '鸿运当头！出门捡钱，表白成功，欧气爆棚！' },
};

// ==================== 存储路径 ====================

let storagePath: string = '';
let storageData: StorageData = { jrrpRecords: [] };
let logger: any = null;

// ==================== 初始化 ====================

export function initStorage(ctx: any, dataPath: string): void {
    logger = ctx.logger;
    storagePath = path.join(dataPath, 'jrrp_data.json');
    loadData();
    logger.info('[Storage] 存储模块已初始化');
}

function loadData(): void {
    try {
        if (fs.existsSync(storagePath)) {
            const content = fs.readFileSync(storagePath, 'utf-8');
            storageData = JSON.parse(content);
            logger?.debug(`[Storage] 加载了 ${storageData.jrrpRecords.length} 条记录`);
        } else {
            storageData = { jrrpRecords: [] };
            saveData();
        }
    } catch (err) {
        logger?.error('[Storage] 加载数据失败:', err);
        storageData = { jrrpRecords: [] };
    }
}

function saveData(): void {
    try {
        const dir = path.dirname(storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2), 'utf-8');
    } catch (err) {
        logger?.error('[Storage] 保存数据失败:', err);
    }
}

// ==================== 日期工具 ====================

function getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==================== JRRP 核心方法 ====================

export function getTodayJrrpValue(userId: number): number | null {
    const today = getTodayDate();
    const record = storageData.jrrpRecords.find(r => r.userId === userId && r.date === today);
    return record ? record.value : null;
}

export function saveTodayJrrpValue(userId: number, value: number): void {
    const today = getTodayDate();
    // 删除旧记录
    storageData.jrrpRecords = storageData.jrrpRecords.filter(
        r => !(r.userId === userId && r.date === today)
    );
    // 添加新记录
    storageData.jrrpRecords.push({ userId, date: today, value });
    saveData();
    logger?.info(`[JRRP] 用户 ${userId} 已抽取: ${value}`);
}

// ==================== 随机抽取 ====================

export function drawRandomValue(): number {
    return Math.floor(Math.random() * 9) + 1;
}