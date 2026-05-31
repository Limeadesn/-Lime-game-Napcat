// src/commands/user.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, upgradeMidStat, recalculateFinalStats, getMoney, getMood, getHealth, getFreePoints, addMoney } from '../core/player';
import { RACES } from '../core/player';
import { checkUserSchedule } from '../core/schedule';
import { PluginState } from '../core/state';

// 属性映射
const ATTR_MAP: Record<string, { key: string; id: string; index: number }> = {
    'STR': { key: 'str', id: 'STR', index: 0 },
    'DEX': { key: 'dex', id: 'DEX', index: 1 },
    'CON': { key: 'con', id: 'CON', index: 2 },
    'INT': { key: 'int', id: 'INT', index: 3 },
    'CHA': { key: 'cha', id: 'CHA', index: 4 },
    'LUC': { key: 'luc', id: 'LUC', index: 5 }
};

// ==================== 辅助函数 ====================

function getRaceName(raceId: number): string {
    const race = RACES.find(r => r.id === raceId);
    return race ? race.name : '未知';
}

function getFormPrefix(formId: number): string {
    switch (formId) {
        case 0: return '幼';
        case 1: return '小';
        case 2: return '青年';
        case 3: return '成年';
        default: return '';
    }
}

function getFormSuffix(formId: number, genderId: number): string {
    if (genderId === 0) {
        switch (formId) {
            case 0: return '童男';
            case 1: return '正太';
            case 2: return '少年';
            case 3: return '成男';
            default: return '';
        }
    } else {
        switch (formId) {
            case 0: return '幼女';
            case 1: return '萝莉';
            case 2: return '少女';
            case 3: return '熟女';
            default: return '';
        }
    }
}

function getDisplayRace(
    kindId: number,
    kindName: string,
    formId: number,
    genderId: number,
    races: number[],
    mixedRaceName?: string
): string {
    const suffix = getFormSuffix(formId, genderId);
    const prefix = getFormPrefix(formId);
    
    const hasFairy = races.includes(8);
    
    if (hasFairy) {
        const otherRace = races.find(id => id !== 8);
        const otherRaceName = otherRace !== undefined ? getRaceName(otherRace) : '';
        if (otherRaceName) {
            return `妖精${suffix}（${otherRaceName}）`;
        } else {
            return `妖精${suffix}`;
        }
    }
    
    if (mixedRaceName) {
        return `${mixedRaceName}${suffix}`;
    }
    
    if (kindId === 2) {
        const raceNames = races.map(id => getRaceName(id)).join('');
        return `${raceNames}${suffix}`;
    }
    
    if (kindId === 1) {
        const raceNames = races.map(id => getRaceName(id)).join('、');
        return `兽人${suffix}（${raceNames}）`;
    }
    
    if (kindId === 0) {
        const raceNames = races.map(id => getRaceName(id)).join('、');
        if (races.length === 1) {
            return `${prefix}${raceNames}`;
        } else {
            return `${prefix}${raceNames}`;
        }
    }
    
    return `${kindName}${suffix}`;
}

// ==================== 指令处理 ====================

export async function handleUser(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    initPlayerStorage(ctx, ctx.dataPath);
    
    const userId = event.user_id;
    const args = (event.args || '').trim();
    const parts = args.split(/\s+/);
    const cmd = parts[0]?.toLowerCase() || '';
    
    // .user info
    if (cmd === 'info') {
        if (!isPlayerExists(userId)) {
            await sendReply(`[错误] 你还没有注册角色！
请使用 .reg <昵称> <种类ID> <性别ID> <体态ID> <种族ID1> [种族ID2] 进行注册`);
            return;
        }
        
        const player = loadPlayer(userId);
        if (!player) {
            await sendReply(`[错误] 获取角色数据失败！`);
            return;
        }
        
        recalculateFinalStats(player);
        
        const displayRace = getDisplayRace(
            player.kindId,
            player.kindName,
            player.formId,
            player.genderId,
            player.races,
            player.mixedRaceName
        );
        const genderName = player.genderId === 0 ? '男' : '女';
        
        // 使用新的属性获取方式
        const money = getMoney(player);
        const mood = getMood(player);
        const health = getHealth(player);
        const freePoints = getFreePoints(player);
        
        await sendReply(`[角色信息]
----------------------------------------
[玩家] ${player.nickname}
[种族] ${displayRace}
[性别] ${genderName}
[金币] ${money}
[心情] ${mood} | [健康] ${health}
[体型值] ${player.size}
----------------------------------------
[自由点] ${freePoints}
[属性] (属性值/实际值)
力量(STR/0): ${player.base.midStr}/${player.base.str}
敏捷(DEX/1): ${player.base.midDex}/${player.base.dex}
体质(CON/2): ${player.base.midCon}/${player.base.con}
智慧(INT/3): ${player.base.midInt}/${player.base.int}
魅力(CHA/4): ${player.base.midCha}/${player.base.cha}
运气(LUC/5): ${player.base.midLuc}/${player.base.luc}`);
        
        ctx.logger.info(`[User] 用户 ${userId} 查看了角色信息`);
        return;
    }
    
    // .user upgrade
    if (cmd === 'upgrade') {
        if (!isPlayerExists(userId)) {
            await sendReply(`[错误] 你还没有注册角色，无法升级！
请使用 .reg <昵称> <种类ID> <性别ID> <体态ID> <种族ID1> [种族ID2] 进行注册`);
            return;
        }
        
        if (parts.length < 2) {
            await sendReply(`[错误] 请指定要升级的属性！
格式: .user upgrade <属性代码> [点数]
属性代码: STR, DEX, CON, INT, CHA, LUC 或 0-5
示例: .user upgrade STR
示例: .user upgrade LUC 2
示例: .user upgrade 0 3`);
            return;
        }
        
        const attrInput = parts[1].toUpperCase();
        let points = 1;
        
        if (parts.length >= 3) {
            const parsedPoints = parseInt(parts[2], 10);
            if (!isNaN(parsedPoints) && parsedPoints > 0) {
                points = parsedPoints;
            } else {
                await sendReply(`[错误] 点数必须是正整数！`);
                return;
            }
        }
        
        let attrKey: string | null = null;
        if (attrInput in ATTR_MAP) {
            attrKey = ATTR_MAP[attrInput].key;
        } else {
            const idx = parseInt(attrInput, 10);
            if (!isNaN(idx) && idx >= 0 && idx <= 5) {
                for (const [code, info] of Object.entries(ATTR_MAP)) {
                    if (info.index === idx) {
                        attrKey = info.key;
                        break;
                    }
                }
            }
        }
        
        if (!attrKey) {
            await sendReply(`[错误] 无效的属性代码！
可用: STR, DEX, CON, INT, CHA, LUC 或 0-5`);
            return;
        }
        
        const player = loadPlayer(userId);
        if (!player) {
            await sendReply(`[错误] 获取角色数据失败！`);
            return;
        }
        
        const result = upgradeMidStat(player, attrKey, points);
        
        if (!result.success) {
            await sendReply(`[错误] ${result.message}`);
            return;
        }
        
        if (savePlayer(player)) {
            await sendReply(`[成功] ${result.message}
${attrKey.toUpperCase()}中间值: ${result.oldMidValue} → ${result.newMidValue}
最终值: ${result.newFinalValue}
剩余自由点: ${result.remainingPoints}`);
        } else {
            await sendReply(`[错误] 保存数据失败！`);
        }
        return;
    }
    
    // .user check
    if (cmd === 'check') {
        const result = await checkUserSchedule(userId);
        
        if (!result.hasSchedule) {
            await sendReply(`[日程] ${result.message}`);
        } else if (result.completed) {
            await sendReply(`[日程完成] ${result.message}`);
        } else {
            await sendReply(`[日程进度] ${result.message}`);
        }
        return;
    }

    // .user pay <QQ号> <数目>
    if (cmd === 'pay') {
        if (!isPlayerExists(userId)) {
            await sendReply('[错误] 你还没有注册角色！');
            return;
        }
        if (parts.length < 3) {
            await sendReply('[错误] 格式错误！正确格式: .user pay <QQ号> <数目>');
            return;
        }

        const targetId = parseInt(parts[1], 10);
        const amount = parseInt(parts[2], 10);

        if (isNaN(targetId)) { await sendReply('[错误] QQ号必须是数字！'); return; }
        if (isNaN(amount) || amount <= 0) { await sendReply('[错误] 数目必须是正整数！'); return; }
        if (targetId === userId) { await sendReply('[错误] 不能给自己转账！'); return; }
        if (!isPlayerExists(targetId)) { await sendReply('[错误] 目标玩家未注册！'); return; }

        const sender = loadPlayer(userId);
        if (!sender) { await sendReply('[错误] 获取你的数据失败！'); return; }
        if (getMoney(sender) < amount) {
            await sendReply(`[错误] 金币不足！当前${getMoney(sender)}金币，需要${amount}金币`);
            return;
        }

        const receiver = loadPlayer(targetId);
        if (!receiver) { await sendReply('[错误] 获取目标数据失败！'); return; }

        addMoney(sender, -amount);
        addMoney(receiver, amount);
        sender.lastActive = Date.now();
        receiver.lastActive = Date.now();

        if (!savePlayer(sender) || !savePlayer(receiver)) {
            await sendReply('[错误] 保存数据失败！');
            return;
        }

        await sendReply(`[转账成功] 你向 ${targetId} 转账 ${amount} 金币`);
        ctx.logger.info(`[User] ${userId} 转账 ${amount} 金币给 ${targetId}`);
        return;
    }

    // .user gene <QQ号> <数目> （管理员专用）
    if (cmd === 'gene') {
        const groupId = event.group_id;
        if (groupId) {
            try {
                const memberInfo = await ctx.actions.call('get_group_member_info', {
                    group_id: groupId, user_id: userId,
                }, ctx.adapterName, ctx.pluginManager.config) as { role?: string };
                const role = memberInfo?.role;
                if (role !== 'owner' && role !== 'admin' && !PluginState.isSuperAdmin(userId)) {
                    await sendReply('[错误] 只有管理员和群主可以使用此指令！');
                    return;
                }
            } catch {
                await sendReply('[错误] 权限检查失败，请稍后重试');
                return;
            }
        }

        if (parts.length < 3) {
            await sendReply('[错误] 格式错误！正确格式: .user gene <QQ号> <数目>（可为负数）');
            return;
        }

        const targetId = parseInt(parts[1], 10);
        const amount = parseInt(parts[2], 10);

        if (isNaN(targetId)) { await sendReply('[错误] QQ号必须是数字！'); return; }
        if (isNaN(amount) || amount === 0) { await sendReply('[错误] 数目不能为0！'); return; }
        if (!isPlayerExists(targetId)) { await sendReply('[错误] 目标玩家未注册！'); return; }

        const target = loadPlayer(targetId);
        if (!target) { await sendReply('[错误] 获取目标数据失败！'); return; }

        addMoney(target, amount);
        target.lastActive = Date.now();

        if (!savePlayer(target)) {
            await sendReply('[错误] 保存数据失败！');
            return;
        }

        const opName = amount > 0 ? '给予' : '扣除';
        await sendReply(`[管理员操作] 已${opName}玩家 ${targetId} ${Math.abs(amount)} 金币，当前余额: ${getMoney(target)}`);
        ctx.logger.info(`[User] 管理员 ${userId} ${opName} ${targetId} ${Math.abs(amount)} 金币`);
        return;
    }

    // 帮助
    await sendReply(`[用户指令]
.user info - 查看角色信息
.user upgrade <属性> [点数] - 消耗自由点提升属性
.user check - 查看工作/历练进度并结算已完成的工作
.user pay <QQ号> <数目> - 转账金币
.user gene <QQ号> <数目> - [管理] 直接增减金币
----------------------------------------
属性代码: STR(力量), DEX(敏捷), CON(体质), INT(智慧), CHA(魅力), LUC(运气)
也可使用索引: 0-5 对应上述顺序
示例: .user upgrade STR
示例: .user upgrade LUC 2
示例: .user pay 123456 100`);
}