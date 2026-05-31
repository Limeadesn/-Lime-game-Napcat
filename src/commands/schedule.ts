// src/commands/schedule.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, getMoney, addMoney } from '../core/player';
import { initScheduleStorage, getUserActiveSchedule, removeSchedule, getWorkInfoById, getAdvInfoById, checkUserSchedule } from '../core/schedule';

const WORK_PENALTY = 20;
const ADV_PENALTY_RATIO = 0.5;

let initialized = false;

export async function handleSchedule(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    if (!initialized) {
        initPlayerStorage(ctx, ctx.dataPath);
        initScheduleStorage(ctx, ctx.dataPath);
        initialized = true;
    }
    
    const userId = event.user_id;
    const args = (event.args || '').trim();
    const parts = args.split(/\s+/);
    const action = parts[0]?.toLowerCase() || '';
    
    if (!isPlayerExists(userId)) {
        await sendReply(`[错误] 你还没有注册角色！请先使用 .reg 命令注册~`);
        return;
    }
    
    // .schedule check
    if (action === 'check') {
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
    
    // .schedule cancel
    if (action === 'cancel') {
        const schedule = getUserActiveSchedule(userId);
        if (!schedule) {
            await sendReply(`[错误] 你当前没有进行中的日程`);
            return;
        }
        
        if (schedule.type === 'work') {
            const workInfo = getWorkInfoById(schedule.workId!);
            if (!workInfo) {
                await sendReply(`[错误] 工作数据异常`);
                return;
            }
            
            const player = loadPlayer(userId);
            if (!player) {
                await sendReply(`[错误] 获取玩家数据失败`);
                return;
            }
            
            addMoney(player, -WORK_PENALTY);
            player.lastActive = Date.now();
            
            if (!savePlayer(player)) {
                await sendReply(`[错误] 保存玩家数据失败`);
                return;
            }
            
            removeSchedule(userId);
            await sendReply(`[日程取消] 已取消工作“${workInfo.name}”，支付了${WORK_PENALTY}金币违约金`);
            ctx.logger.info(`[Schedule] 用户 ${userId} 取消工作: ${workInfo.name}`);
            
        } else if (schedule.type === 'adv') {
            const advInfo = getAdvInfoById(schedule.advId!);
            if (!advInfo) {
                await sendReply(`[错误] 历练数据异常`);
                return;
            }
            
            const refund = Math.floor(advInfo.cost * (1 - ADV_PENALTY_RATIO));
            const penalty = advInfo.cost - refund;
            
            const player = loadPlayer(userId);
            if (!player) {
                await sendReply(`[错误] 获取玩家数据失败`);
                return;
            }
            
            addMoney(player, refund);
            player.lastActive = Date.now();
            
            if (!savePlayer(player)) {
                await sendReply(`[错误] 保存玩家数据失败`);
                return;
            }
            
            removeSchedule(userId);
            await sendReply(`[日程取消] 已取消历练“${advInfo.name}”，退还${refund}金币（扣除${penalty}金币违约金）`);
            ctx.logger.info(`[Schedule] 用户 ${userId} 取消历练: ${advInfo.name}`);
        }
        return;
    }
    
    // 帮助
    await sendReply(`[日程指令]
.schedule check - 查看当前日程进度并结算已完成的项目
.schedule cancel - 取消当前进行中的日程（工作或历练）`);
}