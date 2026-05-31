// src/adv/adv_7_running.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, recalculateFinalStats } from '../core/player';
import { getAdvCompletedCount, incrementAdvCompletedCount } from './index';

const MAX_COUNT = 4;

const adv: Adv = {
    id: 7,
    name: '跑步（基础）',
    description: '基础跑步训练，提升敏捷',
    duration: 12,
    cost: 400,
    
    checkCondition: async (player, completedCount) => {
        if (completedCount >= MAX_COUNT) {
            return { success: false, message: `你已经完成了${MAX_COUNT}次跑步，无法继续` };
        }
        return { success: true, message: '' };
    },
    
    settle: async (ctx: AdvContext) => {
        ctx.player.base.midDex += 1;
        recalculateFinalStats(ctx.player);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        incrementAdvCompletedCount(ctx.player, adv.id);
        const remaining = MAX_COUNT - getAdvCompletedCount(ctx.player, adv.id);
        
        return { success: true, message: `敏捷+1！还可进行${remaining}次` };
    }
};

export default adv;