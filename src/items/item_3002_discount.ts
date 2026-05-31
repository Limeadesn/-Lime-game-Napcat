// src/items/item_3002_discount.ts

import type { Item } from './types';
import { loadPlayer, savePlayer, addDiscountStack } from '../core/player';

const item: Item = {
    id: 3002,
    name: '折扣券',
    description: '使用后增加1层折扣效果（每层-10%，最高50%，淘书时自动消耗）',
    price: 50,
    usable: true,
    
    onUse: async (userId: number, quantity: number) => {
        const player = loadPlayer(userId);
        if (!player) {
            return { success: false, message: '获取玩家数据失败！' };
        }
        
        addDiscountStack(player, quantity);
        player.lastActive = Date.now();
        
        if (!savePlayer(player)) {
            return { success: false, message: '保存玩家数据失败！' };
        }
        
        const currentStack = player.ext.discountStack || 0;
        const discountRate = Math.min(currentStack * 10, 50);
        
        return { 
            success: true, 
            message: `使用了 ${quantity} 张折扣券！当前折扣层数：${currentStack}（下次淘书可享${discountRate}%优惠）`,
            effects: [`折扣层数 +${quantity}`]
        };
    }
};

export default item;