// src/works/work_5_fishing.ts

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

interface FishType {
    name: string;
    price: number;
    weight: number;
}

/**
 * 饱和映射：将原始值映射到 [0, cap) 区间，避免高属性无限膨胀
 * value=K 时达到 cap/2，value→∞ 趋近于 cap
 * 后续其他幸运型工作可复用此函数
 */
function saturate(value: number, cap: number, K: number): number {
    return cap * value / (value + K);
}

function buildFishTable(luc: number): FishType[] {
    // 鱼种权重饱和映射：luc 无限大时有效值趋近 5
    const eff = saturate(luc, 5, 3.5);
    const e = Math.floor(eff);

    return [
        { name: '白条', price: 12, weight: Math.max(2, 12 - e) },
        { name: '鲫鱼', price: 25, weight: 5 + e },
        { name: '鲤鱼', price: 45, weight: 1 + Math.floor(e / 2) },
        { name: '草鱼', price: 70, weight: Math.floor(e / 3) },
        { name: '锦鲤', price: 130, weight: Math.max(0, Math.floor((e - 2) / 3)) },
    ];
}

function pickFish(table: FishType[]): FishType {
    const totalWeight = table.reduce((sum, f) => sum + f.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const fish of table) {
        roll -= fish.weight;
        if (roll <= 0) return fish;
    }
    return table[0];
}

const work: Work = {
    id: 5,
    name: '钓鱼',
    description: '悠闲钓鱼，靠运气决定收获',
    type: 'II',
    duration: 4,
    attribute: 'luc',
    attrRequirement: 0,

    settle: async (ctx: WorkContext) => {
        const lucValue = getAttributeValue(ctx.player, 'luc');

        // 第一阶段：每15分钟判定是否上鱼（4小时 = 16次）
        // 基础上鱼率 38% + 饱和加成，luc=3 时约 49%，上限 60%
        const rounds = 16;
        const catchProb = 0.38 + saturate(lucValue, 0.22, 3);

        // 第二阶段：上鱼后判定鱼种
        const table = buildFishTable(lucValue);
        const caught: Record<string, number> = {};
        let totalPay = 0;
        let bites = 0;

        for (let i = 0; i < rounds; i++) {
            if (Math.random() < catchProb) {
                bites++;
                const fish = pickFish(table);
                caught[fish.name] = (caught[fish.name] || 0) + 1;
                totalPay += fish.price;
            }
        }

        addMoney(ctx.player, totalPay);
        ctx.player.lastActive = Date.now();

        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }

        const detail = Object.entries(caught)
            .filter(([, count]) => count > 0)
            .map(([name, count]) => `${name}x${count}`)
            .join('，');

        return {
            success: true,
            message: `${bites}/${rounds}竿上鱼，钓获: ${detail || '全是空竿...'}，共获得${totalPay}金币`,
            reward: totalPay,
        };
    }
};

export default work;