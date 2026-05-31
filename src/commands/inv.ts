// src/commands/inv.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, getMoney, addMoney } from '../core/player';
import { getAllItems, getItem, getItemSync, itemExists } from '../items/index';
import { PluginState } from '../core/state';

// ==================== 玩家物品类型 ====================

interface PlayerItem {
    id: number;
    quantity: number;
}

// ==================== 检查管理员权限 ====================

async function isAdminOrOwner(ctx: NapCatPluginContext, groupId: number, userId: number): Promise<boolean> {
    if (PluginState.isSuperAdmin(userId)) return true;
    try {
        const memberInfo = await ctx.actions.call('get_group_member_info', {
            group_id: groupId,
            user_id: userId
        }, ctx.adapterName, ctx.pluginManager.config);
        const role = memberInfo?.role;
        return role === 'owner' || role === 'admin';
    } catch (e) {
        return false;
    }
}

// ==================== 物品操作 ====================

function getPlayerItems(userId: number): PlayerItem[] {
    const player = loadPlayer(userId);
    if (!player) return [];
    return player.ext.items || [];
}

function savePlayerItems(userId: number, items: PlayerItem[]): boolean {
    const player = loadPlayer(userId);
    if (!player) return false;
    player.ext.items = items;
    player.lastActive = Date.now();
    return savePlayer(player);
}

function addItem(userId: number, itemId: number, quantity: number): boolean {
    const item = getItemSync(itemId);
    if (!item) return false;
    if (quantity <= 0) return false;
    
    const items = getPlayerItems(userId);
    const existing = items.find(i => i.id === itemId);
    
    if (existing) {
        existing.quantity += quantity;
    } else {
        items.push({ id: itemId, quantity });
    }
    
    return savePlayerItems(userId, items);
}

function removeItem(userId: number, itemId: number, quantity: number): boolean {
    if (quantity <= 0) return false;
    
    const items = getPlayerItems(userId);
    const index = items.findIndex(i => i.id === itemId);
    
    if (index === -1) return false;
    if (items[index].quantity < quantity) return false;
    
    items[index].quantity -= quantity;
    
    if (items[index].quantity === 0) {
        items.splice(index, 1);
    }
    
    return savePlayerItems(userId, items);
}

function hasItem(userId: number, itemId: number, quantity: number): boolean {
    const items = getPlayerItems(userId);
    const item = items.find(i => i.id === itemId);
    return item ? item.quantity >= quantity : false;
}

function getItemQuantity(userId: number, itemId: number): number {
    const items = getPlayerItems(userId);
    const item = items.find(i => i.id === itemId);
    return item ? item.quantity : 0;
}

async function sellItem(userId: number, itemId: number, quantity: number): Promise<{ success: boolean; message: string; totalGold?: number }> {
    const item = getItemSync(itemId);
    if (!item) {
        return { success: false, message: `物品不存在: ${itemId}` };
    }
    
    if (!hasItem(userId, itemId, quantity)) {
        const currentQty = getItemQuantity(userId, itemId);
        return { success: false, message: `物品不足！当前拥有 ${currentQty}，需要 ${quantity}` };
    }
    
    const totalGold = item.price * quantity;
    
    if (!removeItem(userId, itemId, quantity)) {
        return { success: false, message: '移除物品失败！' };
    }
    
    const player = loadPlayer(userId);
    if (!player) {
        return { success: false, message: '获取玩家数据失败！' };
    }
    
    addMoney(player, totalGold);
    player.lastActive = Date.now();
    
    if (!savePlayer(player)) {
        return { success: false, message: '保存金币失败！' };
    }
    
    return { success: true, message: `成功出售 ${quantity} 个 ${item.name}，获得 ${totalGold} 金币`, totalGold };
}

async function giveItem(fromUserId: number, toUserId: number, itemId: number, quantity: number): Promise<{ success: boolean; message: string }> {
    const item = getItemSync(itemId);
    if (!item) {
        return { success: false, message: `物品不存在: ${itemId}` };
    }
    
    if (fromUserId === toUserId) {
        return { success: false, message: '不能给自己赠送物品' };
    }
    
    if (!hasItem(fromUserId, itemId, quantity)) {
        const currentQty = getItemQuantity(fromUserId, itemId);
        return { success: false, message: `物品不足！当前拥有 ${currentQty}，需要 ${quantity}` };
    }
    
    if (!removeItem(fromUserId, itemId, quantity)) {
        return { success: false, message: '从你的仓库移除物品失败！' };
    }
    
    if (!addItem(toUserId, itemId, quantity)) {
        addItem(fromUserId, itemId, quantity);
        return { success: false, message: '添加到对方仓库失败！' };
    }
    
    return { success: true, message: `成功给予 ${quantity} 个 ${item.name} 给玩家 ${toUserId}` };
}

async function useItem(userId: number, itemId: number, quantity: number): Promise<{ success: boolean; message: string; effects?: string[] }> {
    // 使用异步获取完整物品（包含 onUse）
    const item = await getItem(itemId);
    if (!item) {
        return { success: false, message: `物品不存在: ${itemId}` };
    }
    
    if (!item.usable) {
        return { success: false, message: `物品 ${item.name} 不能使用` };
    }
    
    if (!hasItem(userId, itemId, quantity)) {
        const currentQty = getItemQuantity(userId, itemId);
        return { success: false, message: `物品不足！当前拥有 ${currentQty}，需要 ${quantity}` };
    }
    
    let useResult: { success: boolean; message: string; effects?: string[] };
    
    if (item.onUse) {
        useResult = await item.onUse(userId, quantity);
        if (!useResult.success) {
            return useResult;
        }
    } else {
        useResult = { success: true, message: `使用了 ${quantity} 个 ${item.name}`, effects: [] };
    }
    
    if (!removeItem(userId, itemId, quantity)) {
        return { success: false, message: '移除物品失败！' };
    }
    
    return useResult;
}

function formatItemLine(itemId: number, quantity: number): string {
    const item = getItemSync(itemId);
    const name = item ? item.name : String(itemId);
    const price = item ? item.price : 0;
    return `${name}[${itemId}]x${quantity} - ${price}金币`;
}

// ==================== 指令处理 ====================

export async function handleInv(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    initPlayerStorage(ctx, ctx.dataPath);
    
    const userId = event.user_id;
    const args = (event.args || '').trim();
    const groupId = event.group_id;
    const parts = args.split(/\s+/);
    const action = parts[0]?.toLowerCase() || '';
    
    if (!isPlayerExists(userId)) {
        await sendReply(`[错误] 你还没有注册角色！请先使用 .reg 命令注册~`);
        return;
    }
    
    // .inv info
    if (action === 'info') {
        const items = getPlayerItems(userId);
        
        if (items.length === 0) {
            await sendReply(`[仓库]
----------------------------------------
空
----------------------------------------`);
            return;
        }
        
        const lines: string[] = ['[仓库]', '----------------------------------------'];
        for (const item of items) {
            lines.push(formatItemLine(item.id, item.quantity));
        }
        lines.push('----------------------------------------');
        await sendReply(lines.join('\n'));
        return;
    }
    
    // .inv check
    if (action === 'check') {
        if (parts.length < 2) {
            await sendReply(`[错误] 格式错误！正确格式: .inv check <物品ID>`);
            return;
        }
        
        const itemId = parseInt(parts[1], 10);
        
        if (isNaN(itemId)) {
            await sendReply(`[错误] 物品ID必须是数字！`);
            return;
        }
        
        if (!hasItem(userId, itemId, 1)) {
            await sendReply(`[错误] 你还没有拥有该物品！`);
            return;
        }
        
        const item = getItemSync(itemId);
        if (!item) {
            await sendReply(`[错误] 物品不存在！`);
            return;
        }
        
        const quantity = getItemQuantity(userId, itemId);
        
        await sendReply(`[物品详情]
----------------------------------------
名称：${item.name}
ID：${item.id}
数量：${quantity}
描述：${item.description}
价格：${item.price}金币
类型：${item.usable ? '可使用' : '不可使用'}
----------------------------------------`);
        return;
    }
    
    // .inv use
    if (action === 'use') {
        if (parts.length < 3) {
            await sendReply(`[错误] 格式错误！正确格式: .inv use <物品ID> <数量>`);
            return;
        }
        
        const itemId = parseInt(parts[1], 10);
        const quantity = parseInt(parts[2], 10);
        
        if (isNaN(itemId)) {
            await sendReply(`[错误] 物品ID必须是数字！`);
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            await sendReply(`[错误] 数量必须是正整数！`);
            return;
        }
        
        const result = await useItem(userId, itemId, quantity);
        
        if (result.success) {
            let reply = `[使用物品] ${result.message}`;
            if (result.effects && result.effects.length > 0) {
                reply += `\n效果：${result.effects.join('、')}`;
            }
            await sendReply(reply);
        } else {
            await sendReply(`[错误] ${result.message}`);
        }
        return;
    }
    
    // .inv give
    if (action === 'give') {
        if (parts.length < 4) {
            await sendReply(`[错误] 格式错误！正确格式: .inv give <玩家QQ号> <物品ID> <数量>`);
            return;
        }
        
        const targetUserId = parseInt(parts[1], 10);
        const itemId = parseInt(parts[2], 10);
        const quantity = parseInt(parts[3], 10);
        
        if (isNaN(targetUserId)) {
            await sendReply(`[错误] 玩家QQ号必须是数字！`);
            return;
        }
        
        if (isNaN(itemId)) {
            await sendReply(`[错误] 物品ID必须是数字！`);
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            await sendReply(`[错误] 数量必须是正整数！`);
            return;
        }
        
        if (!isPlayerExists(targetUserId)) {
            await sendReply(`[错误] 目标玩家不存在或未注册！`);
            return;
        }
        
        const result = await giveItem(userId, targetUserId, itemId, quantity);
        
        if (result.success) {
            await sendReply(`[交易成功] ${result.message}`);
        } else {
            await sendReply(`[错误] ${result.message}`);
        }
        return;
    }
    
    // .inv sell
    if (action === 'sell') {
        if (parts.length < 3) {
            await sendReply(`[错误] 格式错误！正确格式: .inv sell <物品ID> <数量>`);
            return;
        }
        
        const itemId = parseInt(parts[1], 10);
        const quantity = parseInt(parts[2], 10);
        
        if (isNaN(itemId)) {
            await sendReply(`[错误] 物品ID必须是数字！`);
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            await sendReply(`[错误] 数量必须是正整数！`);
            return;
        }
        
        const result = await sellItem(userId, itemId, quantity);
        
        if (result.success) {
            await sendReply(`[出售成功] ${result.message}`);
        } else {
            await sendReply(`[错误] ${result.message}`);
        }
        return;
    }
    
    // .inv gene - 管理员给予物品
    if (action === 'gene') {
        const isAdmin = await isAdminOrOwner(ctx, groupId, userId);
        if (!isAdmin) {
            await sendReply(`[错误] 只有管理员和群主可以使用此指令！`);
            return;
        }
        
        if (parts.length < 4) {
            await sendReply(`[错误] 格式错误！正确格式: .inv gene <玩家QQ号> <物品ID> <数量>`);
            return;
        }
        
        const targetUserId = parseInt(parts[1], 10);
        const itemId = parseInt(parts[2], 10);
        const quantity = parseInt(parts[3], 10);
        
        if (isNaN(targetUserId)) {
            await sendReply(`[错误] 玩家QQ号必须是数字！`);
            return;
        }
        
        if (isNaN(itemId)) {
            await sendReply(`[错误] 物品ID必须是数字！`);
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            await sendReply(`[错误] 数量必须是正整数！`);
            return;
        }
        
        const item = getItemSync(itemId);
        if (!item) {
            await sendReply(`[错误] 物品不存在！`);
            return;
        }
        
        if (!isPlayerExists(targetUserId)) {
            await sendReply(`[错误] 目标玩家不存在或未注册！`);
            return;
        }
        
        if (addItem(targetUserId, itemId, quantity)) {
            await sendReply(`[管理员给予] 成功给予 ${quantity} 个 ${item.name} 给玩家 ${targetUserId}`);
            ctx.logger.info(`[Inv] 管理员 ${userId} 给予 ${targetUserId} ${quantity} 个 ${item.name}`);
        } else {
            await sendReply(`[错误] 给予物品失败！`);
        }
        return;
    }
    
    // 帮助
    await sendReply(`[仓库指令]
.inv info - 查看仓库
.inv check <物品ID> - 查看物品详情
.inv use <物品ID> <数量> - 使用物品
.inv give <玩家QQ号> <物品ID> <数量> - 赠送物品
.inv sell <物品ID> <数量> - 出售物品
.inv gene <玩家QQ号> <物品ID> <数量> - [管理] 给予物品`);
}

// 导出供其他模块使用
export { addItem, hasItem, removeItem, getItemQuantity };