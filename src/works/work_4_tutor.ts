// src/works/work_4_tutor.ts

import type { Work, WorkContext } from './types';
import { savePlayer, addMoney } from '../core/player';

function getAttributeValue(player: any, attr: string): number {
    switch (attr) {
        case 'str': return player.base.str;
        case 'dex': return player.base.dex;
        case 'con': return player.base.con;
        case 'int': return player.base.int;
        case 'cha': return player.base.cha;
        case 'luc': return player.base.luc;
        default: return 0;
    }
}

/** 饱和映射：value→∞ 趋近 cap，value=K 时达 cap/2 */
function saturate(value: number, cap: number, K: number): number {
    return cap * value / (value + K);
}

const work: Work = {
    id: 4,
    name: '学前班辅导',
    description: '辅导小朋友，靠智慧吃饭',
    type: 'I',
    duration: 8,
    attribute: 'int',
    attrRequirement: 3,
    basePay: 40,
    
    settle: async (ctx: WorkContext) => {
        const attrValue = getAttributeValue(ctx.player, 'int');
        // 时薪 = 基础20 + 属性饱和加成(上限55)，无限属性时薪→75
        const hourlyPay = 20 + saturate(attrValue, 55, 4.5);
        const totalPay = Math.round(hourlyPay * (work.duration || 8) * (0.95 + Math.random() * 0.1));
        
        addMoney(ctx.player, totalPay);
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        return { success: true, message: `工作完成，获得${totalPay}金币`, reward: totalPay };
    }
};

export default work;