// src/items/item_2003_puzzle.ts

import type { Item } from './types';
import { loadPlayer, savePlayer, recalculateFinalStats } from '../core/player';

const MAX_USE = 4;

const item: Item = {
    id: 2003,
    name: '脑筋急转弯',
    description: '使用后提升1点智慧属性（最多使用4次）',
    price: 200,
    usable: true,
    
    onUse: async (userId: number, quantity: number) => {
        const player = loadPlayer(userId);
        if (!player) {
            return { success: false, message: '获取玩家数据失败！' };
        }
        
        if (!player.ext.bookUseCount) player.ext.bookUseCount = {};
        const usedCount = player.ext.bookUseCount.int || 0;
        const remaining = MAX_USE - usedCount;
        
        if (remaining <= 0) {
            return { success: false, message: `已经使用了${MAX_USE}次，无法继续使用！` };
        }
        
        const useAmount = Math.min(quantity, remaining);
        
        for (let i = 0; i < useAmount; i++) {
            player.base.midInt += 1;
            player.ext.bookUseCount.int = (player.ext.bookUseCount.int || 0) + 1;
        }
        
        recalculateFinalStats(player);
        player.lastActive = Date.now();
        
        if (!savePlayer(player)) {
            return { success: false, message: '保存玩家数据失败！' };
        }
        
        const remainingAfter = MAX_USE - (player.ext.bookUseCount.int || 0);
        return { 
            success: true, 
            message: `使用了 ${useAmount} 个脑筋急转弯，智慧+${useAmount}！还可使用${remainingAfter}次`,
            effects: [`智慧+${useAmount}`]
        };
    }
};

export default item;