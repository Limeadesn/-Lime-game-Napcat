// src/items/item_2005_arcane.ts

import type { Item } from './types';
import { loadPlayer, savePlayer, addFreePoints } from '../core/player';

const item: Item = {
    id: 2005,
    name: '奥术入门手册',
    description: '使用后提升1点自由点（不限制次数）',
    price: 800,
    usable: true,
    
    onUse: async (userId: number, quantity: number) => {
        const player = loadPlayer(userId);
        if (!player) {
            return { success: false, message: '获取玩家数据失败！' };
        }
        
        player.ext.freePoints = (player.ext.freePoints || 0) + quantity;
        player.lastActive = Date.now();
        
        if (!savePlayer(player)) {
            return { success: false, message: '保存玩家数据失败！' };
        }
        
        return { 
            success: true, 
            message: `使用了 ${quantity} 个奥术入门手册，自由点+${quantity}！`,
            effects: [`自由点+${quantity}`]
        };
    }
};

export default item;