// src/items/item_1001_magic_a.ts

import type { Item } from './types';
import { loadPlayer, savePlayer, recalculateFinalStats, addMoney, addMood, addHealth, addFreePoints } from '../core/player';

const item: Item = {
    id: 1001,
    name: '神奇物品A',
    description: '一个神奇的物品，使用后提升各项属性',
    price: 100,
    usable: true,
    
    onUse: async (userId: number, quantity: number) => {
        const player = loadPlayer(userId);
        if (!player) {
            return { success: false, message: '获取玩家数据失败！' };
        }
        
        const effects: string[] = [];
        
        for (let i = 0; i < quantity; i++) {
            addMoney(player, 5);
            addMood(player, 5);
            addHealth(player, 5);
            addFreePoints(player, 5);
            player.base.midStr += 5;
            player.base.midDex += 5;
            player.base.midCon += 5;
            player.base.midInt += 5;
            player.base.midCha += 5;
            player.base.midLuc += 5;
        }
        
        recalculateFinalStats(player);
        player.lastActive = Date.now();
        
        if (!savePlayer(player)) {
            return { success: false, message: '保存玩家数据失败！' };
        }
        
        effects.push(`金币 +${5 * quantity}`);
        effects.push(`心情 +${5 * quantity}`);
        effects.push(`健康 +${5 * quantity}`);
        effects.push(`自由点 +${5 * quantity}`);
        effects.push(`力量 +${5 * quantity}`);
        effects.push(`敏捷 +${5 * quantity}`);
        effects.push(`体质 +${5 * quantity}`);
        effects.push(`智慧 +${5 * quantity}`);
        effects.push(`魅力 +${5 * quantity}`);
        effects.push(`运气 +${5 * quantity}`);
        
        return { 
            success: true, 
            message: `使用了 ${quantity} 个神奇物品A`,
            effects
        };
    }
};

export default item;