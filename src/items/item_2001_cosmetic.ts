// src/items/item_2001_cosmetic.ts

import type { Item } from './types';
import { loadPlayer, savePlayer, recalculateFinalStats } from '../core/player';

const MAX_USE = 4;

const item: Item = {
    id: 2001,
    name: '化妆教程',
    description: '使用后提升1点魅力属性（最多使用4次）',
    price: 200,
    usable: true,
    
    onUse: async (userId: number, quantity: number) => {
        const player = loadPlayer(userId);
        if (!player) {
            return { success: false, message: '获取玩家数据失败！' };
        }
        
        if (!player.ext.bookUseCount) player.ext.bookUseCount = {};
        const usedCount = player.ext.bookUseCount.cha || 0;
        const remaining = MAX_USE - usedCount;
        
        if (remaining <= 0) {
            return { success: false, message: `已经使用了${MAX_USE}次，无法继续使用！` };
        }
        
        const useAmount = Math.min(quantity, remaining);
        
        for (let i = 0; i < useAmount; i++) {
            player.base.midCha += 1;
            player.ext.bookUseCount.cha = (player.ext.bookUseCount.cha || 0) + 1;
        }
        
        recalculateFinalStats(player);
        player.lastActive = Date.now();
        
        if (!savePlayer(player)) {
            return { success: false, message: '保存玩家数据失败！' };
        }
        
        const remainingAfter = MAX_USE - (player.ext.bookUseCount.cha || 0);
        return { 
            success: true, 
            message: `使用了 ${useAmount} 个化妆教程，魅力+${useAmount}！还可使用${remainingAfter}次`,
            effects: [`魅力+${useAmount}`]
        };
    }
};

export default item;