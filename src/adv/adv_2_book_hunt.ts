// src/adv/adv_2_book_hunt.ts

import type { Adv, AdvContext } from './types';
import { savePlayer, addMoney, getDiscountStack, setDiscountStack } from '../core/player';
import { addItem } from '../commands/inv';

const DISCOUNT_COUPON_ID = 3002;

const BOOK_IDS: number[] = [2001, 2002, 2003, 2004, 2005];
const BOOK_PROBS: number[] = [0.24, 0.24, 0.24, 0.24, 0.04];

const SIDE_IDS: number[] = [3001];
const SIDE_PROBS: number[] = [0.30];

const adv: Adv = {
    id: 2,
    name: '淘书（简单）',
    description: '随机获得一本提升属性的书，可能获得副产物或折扣券',
    duration: 12,
    cost: 400,
    
    settle: async (ctx: AdvContext) => {
        const effects: string[] = [];
        
        let discountRate = 0;
        const discountStack = getDiscountStack(ctx.player);
        if (discountStack > 0) {
            discountRate = Math.min(discountStack * 0.1, 0.5);
            const finalCost = adv.cost - Math.floor(adv.cost * discountRate);
            setDiscountStack(ctx.player, 0);
            effects.push(`使用${discountRate * 100}%折扣，实际消耗${finalCost}金币`);
        }
        
        const actualCost = Math.floor(adv.cost * (1 - discountRate));
        addMoney(ctx.player, -actualCost);
        
        let rand = Math.random();
        let accumulated = 0;
        let selectedBookId: number | null = null;
        
        for (let i = 0; i < BOOK_IDS.length; i++) {
            accumulated += BOOK_PROBS[i];
            if (rand <= accumulated) {
                selectedBookId = BOOK_IDS[i];
                break;
            }
        }
        
        if (selectedBookId) {
            if (addItem(ctx.userId, selectedBookId, 1)) {
                effects.push(`获得书籍 x1`);
            }
        }
        
        const sideRand = Math.random();
        let sideAccumulated = 0;
        for (let i = 0; i < SIDE_IDS.length; i++) {
            sideAccumulated += SIDE_PROBS[i];
            if (sideRand <= sideAccumulated) {
                if (addItem(ctx.userId, SIDE_IDS[i], 1)) {
                    effects.push(`获得副产物 x1`);
                }
                break;
            }
        }
        
        const couponRand = Math.random();
        if (couponRand < 0.10) {
            if (addItem(ctx.userId, DISCOUNT_COUPON_ID, 1)) {
                effects.push(`获得折扣券 x1`);
            }
        }
        
        ctx.player.lastActive = Date.now();
        
        if (!savePlayer(ctx.player)) {
            return { success: false, message: '保存玩家数据失败' };
        }
        
        return { 
            success: true, 
            message: `淘书完成！${effects.join('、')}`,
            reward: effects.join('、')
        };
    }
};

export default adv;