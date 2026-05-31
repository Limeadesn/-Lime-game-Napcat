// src/items/item_3001_joke.ts

import type { Item } from './types';
import { loadPlayer, savePlayer, addMood } from '../core/player';

const item: Item = {
    id: 3001,
    name: '笑话大全',
    description: '使用后提升5点心情',
    price: 30,
    usable: true,
    
    onUse: async (userId: number, quantity: number) => {
        const player = loadPlayer(userId);
        if (!player) {
            return { success: false, message: '获取玩家数据失败！' };
        }
        
        const moodGain = 5 * quantity;
        addMood(player, moodGain);
        player.lastActive = Date.now();
        
        if (!savePlayer(player)) {
            return { success: false, message: '保存玩家数据失败！' };
        }
        
        return { 
            success: true, 
            message: `使用了 ${quantity} 个笑话大全，心情+${moodGain}！`,
            effects: [`心情+${moodGain}`]
        };
    }
};

export default item;