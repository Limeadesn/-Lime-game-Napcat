// src/adv/index.ts

import type { Adv, AdvContext } from './types';
import { pluginState } from '../core/state';

// ==================== 历练列表（硬编码，仅用于list显示） ====================

export const ADV_LIST = [
    { id: 1, name: '寺子屋扫盲', description: '针对智慧较低的人，提升智慧属性', duration: 8, cost: 300 },
    { id: 2, name: '淘书（简单）', description: '随机获得一本提升属性的书，可能获得副产物', duration: 12, cost: 400 },
    { id: 3, name: '心理辅导', description: '针对心情低落的人，提升心情', duration: 4, cost: 100 },
    { id: 4, name: '紧急救助', description: '针对健康危急的人，紧急治疗', duration: 4, cost: 100 },
    { id: 5, name: '散步', description: '悠闲散步，提升心情和健康', duration: 1, cost: 0 },
    { id: 6, name: '健身（基础）', description: '基础健身训练，提升力量和体质', duration: 24, cost: 800, maxCount: 4 },
    { id: 7, name: '跑步（基础）', description: '基础跑步训练，提升敏捷', duration: 12, cost: 400, maxCount: 4 }
];

// 获取所有历练（用于list显示）
export function getAllAdvs(): typeof ADV_LIST {
    return ADV_LIST;
}

// 根据ID获取历练信息（用于list显示）
export function getAdvInfoById(id: number): typeof ADV_LIST[0] | undefined {
    return ADV_LIST.find(a => a.id === id);
}

// ==================== 动态加载执行模块 ====================

// 预导入所有历练模块（避免动态导入问题）
const ADV_MODULES: Record<number, () => Promise<any>> = {
    1: () => import('./adv_1_school'),
    2: () => import('./adv_2_book_hunt'),
    3: () => import('./adv_3_counseling'),
    4: () => import('./adv_4_emergency'),
    5: () => import('./adv_5_walks'),
    6: () => import('./adv_6_fitness'),
    7: () => import('./adv_7_running')
};

// 根据ID获取历练执行模块
export async function getAdvById(id: number): Promise<Adv | undefined> {
    try {
        const loader = ADV_MODULES[id];
        if (!loader) {
            pluginState.logger.error(`[Adv] 历练 ${id} 不存在`);
            return undefined;
        }
        const module = await loader();
        return module.default || module.adv;
    } catch (err) {
        pluginState.logger.error(`[Adv] 加载历练 ${id} 的执行模块失败:`, err);
        return undefined;
    }
}

// ==================== 辅助函数 ====================

// 获取玩家完成次数
export function getAdvCompletedCount(player: any, advId: number): number {
    const advData = player.ext?.advData || {};
    return advData[advId] || 0;
}

// 增加玩家完成次数
export function incrementAdvCompletedCount(player: any, advId: number): void {
    if (!player.ext) player.ext = {};
    if (!player.ext.advData) player.ext.advData = {};
    player.ext.advData[advId] = (player.ext.advData[advId] || 0) + 1;
}