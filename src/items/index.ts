// src/items/index.ts

import type { Item } from './types';
import { pluginState } from '../core/state';

// ==================== 物品列表（硬编码，用于显示和快速获取） ====================

export const ITEM_LIST = [
    { id: 1001, name: '神奇物品A', description: '一个神奇的物品，使用后提升各项属性', price: 100, usable: true },
    { id: 2001, name: '化妆教程', description: '使用后提升1点魅力属性（最多使用4次）', price: 200, usable: true },
    { id: 2002, name: '赌徒宝典', description: '使用后提升1点运气属性（最多使用4次）', price: 200, usable: true },
    { id: 2003, name: '脑筋急转弯', description: '使用后提升1点智慧属性（最多使用4次）', price: 200, usable: true },
    { id: 2004, name: '养生秘诀', description: '使用后提升1点体质属性（最多使用4次）', price: 200, usable: true },
    { id: 2005, name: '奥术入门手册', description: '使用后提升1点自由点', price: 800, usable: true },
    { id: 3001, name: '笑话大全', description: '使用后提升5点心情', price: 30, usable: true },
    { id: 3002, name: '折扣券', description: '使用后增加1层折扣效果（每层-10%，最高50%）', price: 50, usable: true }
];

// 获取所有物品（用于显示）
export function getAllItems(): typeof ITEM_LIST {
    return ITEM_LIST;
}

// 根据ID获取物品信息（用于显示）
export function getItemInfoById(id: number): typeof ITEM_LIST[0] | undefined {
    return ITEM_LIST.find(i => i.id === id);
}

// 同步获取物品基础信息（用于显示，不包含 onUse）
export function getItemSync(id: number): typeof ITEM_LIST[0] | undefined {
    return getItemInfoById(id);
}

// 检查物品是否存在
export function itemExists(id: number): boolean {
    return ITEM_LIST.some(i => i.id === id);
}

// ==================== 动态加载执行模块 ====================

// 预导入所有物品模块
const ITEM_MODULES: Record<number, () => Promise<any>> = {
    1001: () => import('./item_1001_magic_a'),
    2001: () => import('./item_2001_cosmetic'),
    2002: () => import('./item_2002_gambling'),
    2003: () => import('./item_2003_puzzle'),
    2004: () => import('./item_2004_health'),
    2005: () => import('./item_2005_arcane'),
    3001: () => import('./item_3001_joke'),
    3002: () => import('./item_3002_discount')
};

// 缓存已加载的物品执行模块
const itemCache: Map<number, Item> = new Map();

// 根据ID获取物品（包含执行模块和基础信息）
export async function getItem(id: number): Promise<Item | undefined> {
    // 先从缓存获取执行模块
    if (itemCache.has(id)) {
        return itemCache.get(id);
    }
    
    // 获取基础信息
    const info = getItemInfoById(id);
    if (!info) {
        pluginState.logger.error(`[Items] 物品 ${id} 不存在`);
        return undefined;
    }
    
    try {
        const loader = ITEM_MODULES[id];
        if (!loader) {
            // 如果没有执行模块，只返回基础信息（不可使用）
            return {
                id: info.id,
                name: info.name,
                description: info.description,
                price: info.price,
                usable: info.usable
            };
        }
        
        const module = await loader();
        const item = module.default || module.item;
        
        if (item && item.id && item.name) {
            // 合并执行模块和基础信息（确保基础信息完整）
            const mergedItem: Item = {
                id: item.id,
                name: item.name || info.name,
                description: item.description || info.description,
                price: item.price ?? info.price,
                usable: item.usable ?? info.usable,
                onUse: item.onUse
            };
            itemCache.set(id, mergedItem);
            return mergedItem;
        }
        
        // 如果加载失败，返回基础信息
        return {
            id: info.id,
            name: info.name,
            description: info.description,
            price: info.price,
            usable: info.usable
        };
    } catch (err) {
        pluginState.logger.error(`[Items] 加载物品 ${id} 的执行模块失败:`, err);
        // 返回基础信息
        return {
            id: info.id,
            name: info.name,
            description: info.description,
            price: info.price,
            usable: info.usable
        };
    }
}

// 重新加载物品缓存
export function reloadItems(): void {
    itemCache.clear();
}