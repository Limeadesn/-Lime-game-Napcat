// src/adv/adv_3_counseling.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, addMood, getMood } from '../core/player';

const adv: Adv = {
    id: 3,
    name: '心理辅导',
    description: '针对心情低落的人，提升心情',
    duration: 4,
    cost: 100,
    requirements: {
        maxAttribute: { attr: 'mood', value: 20 }
    },
    
    checkCondition: async (player, completedCount) => {
        if (getMood(player) >= 20) {
            return { success: false, message: '心情还不够低，不需要心理辅导' };
        }
        return { success: true, message: '' };
    },
    
    settle: async (ctx: AdvContext) => {
        addMood(ctx.player, 30);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        return { success: true, message: `心情提升了30点！当前心情：${getMood(ctx.player)}` };
    }
};

export default adv;