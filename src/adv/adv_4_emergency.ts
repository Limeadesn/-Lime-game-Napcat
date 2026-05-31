// src/adv/adv_4_emergency.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, addHealth, getHealth } from '../core/player';

const adv: Adv = {
    id: 4,
    name: '紧急救助',
    description: '针对健康危急的人，紧急治疗',
    duration: 4,
    cost: 100,
    requirements: {
        maxAttribute: { attr: 'health', value: 20 }
    },
    
    checkCondition: async (player, completedCount) => {
        if (getHealth(player) >= 20) {
            return { success: false, message: '健康度还不够低，不需要紧急救助' };
        }
        return { success: true, message: '' };
    },
    
    settle: async (ctx: AdvContext) => {
        const healAmount = 20 + (1 + ctx.player.base.str) * 3;
        addHealth(ctx.player, healAmount);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        return { success: true, message: `恢复了${healAmount}点健康！当前健康：${getHealth(ctx.player)}` };
    }
};

export default adv;