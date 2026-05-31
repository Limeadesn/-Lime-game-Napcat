// src/commands/shop.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, getMoney, addMoney, addHealth, addMood } from '../core/player';

// ==================== 商品定义 ====================

interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    dailyLimit: number;  // 0 = 不限
}

const SHOP_ITEMS: ShopItem[] = [
    { id: 'mineral', name: '农夫矿泉', description: '+1健康', price: 20, dailyLimit: 2 },
    { id: 'candy', name: '棒棒糖', description: '+1心情', price: 20, dailyLimit: 1 },
    { id: 'pill', name: '药片', description: '随机健康-2~+4', price: 50, dailyLimit: 0 },
];

// ==================== 日限购辅助 ====================

function getToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyCount(player: any, itemId: string): number {
    const today = getToday();
    const daily = player.ext.shopDaily;
    if (!daily || daily.date !== today) return 0;
    return daily[itemId] || 0;
}

function incrementDailyCount(player: any, itemId: string): void {
    const today = getToday();
    if (!player.ext.shopDaily || player.ext.shopDaily.date !== today) {
        player.ext.shopDaily = { date: today };
    }
    player.ext.shopDaily[itemId] = (player.ext.shopDaily[itemId] || 0) + 1;
}

// ==================== 指令处理 ====================

export async function handleShop(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    initPlayerStorage(ctx, ctx.dataPath);

    const userId = event.user_id;
    const args = (event.args || '').trim();
    const parts = args.split(/\s+/);
    const action = parts[0]?.toLowerCase() || '';

    if (!isPlayerExists(userId)) {
        await sendReply('[错误] 你还没有注册角色！请先使用 .reg 命令注册~');
        return;
    }

    // .shop list
    if (action === 'list' || action === '') {
        const player = loadPlayer(userId);
        if (!player) { await sendReply('[错误] 获取角色数据失败！'); return; }

        const money = getMoney(player);
        const lines: string[] = ['[商店]', '----------------------------------------'];
        for (const item of SHOP_ITEMS) {
            let limitStr = '';
            if (item.dailyLimit > 0) {
                const bought = getDailyCount(player, item.id);
                limitStr = ` [日限${bought}/${item.dailyLimit}]`;
            }
            lines.push(`${item.name}(${item.id}) - ${item.price}金币 - ${item.description}${limitStr}`);
        }
        lines.push('----------------------------------------');
        lines.push(`您的金币: ${money}`);
        lines.push('使用 .shop buy <商品ID> 购买');
        await sendReply(lines.join('\n'));
        return;
    }

    // .shop buy <id>
    if (action === 'buy') {
        if (parts.length < 2) {
            await sendReply('[错误] 格式错误！正确格式: .shop buy <商品ID>');
            return;
        }

        const itemId = parts[1].toLowerCase();
        const item = SHOP_ITEMS.find(i => i.id === itemId);

        if (!item) {
            await sendReply('[错误] 商品不存在！使用 .shop list 查看');
            return;
        }

        const player = loadPlayer(userId);
        if (!player) { await sendReply('[错误] 获取角色数据失败！'); return; }

        // 检查日限购
        if (item.dailyLimit > 0) {
            const bought = getDailyCount(player, itemId);
            if (bought >= item.dailyLimit) {
                await sendReply(`[错误] 今日${item.name}已售罄！（日限${item.dailyLimit}个）`);
                return;
            }
        }

        // 检查金币
        const money = getMoney(player);
        if (money < item.price) {
            await sendReply(`[错误] 金币不足！需要${item.price}金币，当前${money}金币`);
            return;
        }

        // 扣款
        addMoney(player, -item.price);

        // 应用效果
        let effectMsg = '';
        switch (item.id) {
            case 'mineral':
                addHealth(player, 1);
                effectMsg = '健康 +1';
                break;
            case 'candy':
                addMood(player, 1);
                effectMsg = '心情 +1';
                break;
            case 'pill': {
                const roll = Math.floor(Math.random() * 7) - 2; // -2 ~ +4
                addHealth(player, roll);
                effectMsg = `健康 ${roll >= 0 ? '+' : ''}${roll}`;
                break;
            }
        }

        // 记录日限购
        incrementDailyCount(player, itemId);
        player.lastActive = Date.now();

        if (!savePlayer(player)) {
            await sendReply('[错误] 保存玩家数据失败！');
            return;
        }

        await sendReply(`[购买成功] ${item.name} ×1
消费：${item.price}金币
效果：${effectMsg}
剩余金币：${getMoney(player)}`);
        ctx.logger.info(`[Shop] 用户 ${userId} 购买了 ${item.name}`);
        return;
    }

    // 帮助
    await sendReply(`[商店指令]
.shop list - 查看商品列表
.shop buy <商品ID> - 购买商品
----------------------------------------
商品ID: mineral(农夫矿泉), candy(棒棒糖), pill(药片)`);
}
