// src/adv/adv_6_fitness.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, recalculateFinalStats } from '../core/player';
import { getAdvCompletedCount, incrementAdvCompletedCount } from './index';

const MAX_COUNT = 4;

const adv: Adv = {
    id: 6,
    name: '健身（基础）',
    description: '基础健身训练，提升力量和体质',
    duration: 24,
    cost: 800,
    
    checkCondition: async (player, completedCount) => {
        if (completedCount >= MAX_COUNT) {
            return { success: false, message: `你已经完成了${MAX_COUNT}次健身，无法继续` };
        }
        return { success: true, message: '' };
    },
    
    settle: async (ctx: AdvContext) => {
        ctx.player.base.midStr += 1;
        ctx.player.base.midCon += 1;
        recalculateFinalStats(ctx.player);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        incrementAdvCompletedCount(ctx.player, adv.id);
        const remaining = MAX_COUNT - getAdvCompletedCount(ctx.player, adv.id);
        
        return { success: true, message: `力量+1，体质+1！还可进行${remaining}次` };
    }
};

export default adv;