// src/adv/adv_1_school.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, recalculateFinalStats } from '../core/player';

const adv: Adv = {
    id: 1,
    name: '寺子屋扫盲',
    description: '针对智慧较低的人，提升智慧属性',
    duration: 8,
    cost: 300,
    requirements: {
        maxAttribute: { attr: 'int', value: 2 }
    },
    
    checkCondition: async (player, completedCount) => {
        if (player.base.int >= 2) {
            return { success: false, message: '智慧已经足够，不需要扫盲了' };
        }
        return { success: true, message: '' };
    },
    
    settle: async (ctx: AdvContext) => {
        ctx.player.base.midInt += 1;
        recalculateFinalStats(ctx.player);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        return { success: true, message: `智慧提升了1点！`, reward: '智慧+1' };
    }
};

export default adv;