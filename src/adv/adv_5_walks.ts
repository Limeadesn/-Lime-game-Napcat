// src/adv/adv_5_walk.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, addMood, addHealth, getMood, getHealth } from '../core/player';

const adv: Adv = {
    id: 5,
    name: '散步',
    description: '悠闲散步，提升心情和健康',
    duration: 1,
    cost: 0,
    
    settle: async (ctx: AdvContext) => {
        addMood(ctx.player, 3);
        addHealth(ctx.player, 3);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        return { success: true, message: `心情+3，健康+3！当前心情：${getMood(ctx.player)}，健康：${getHealth(ctx.player)}` };
    }
};

export default adv;