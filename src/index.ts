/**
 * Game Plugin - 游戏插件核心分发器
 * 只负责指令路由，具体功能在 commands/ 目录下
 */

// src/index.ts

import type { PluginModule, NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { EventType } from 'napcat-types/napcat-onebot/event/index';

// 导入指令处理器
import { handleHelp } from './commands/help';
import { handleJrrp } from './commands/jrrp';
import { handleReg } from './commands/reg';
import { handlePing } from './commands/ping';
import { handleRoll } from './commands/roll';
import { handleTicket } from './commands/ticket'; 
import { handleDyq, handleDyqs } from './commands/dyq';
import { handleUser } from './commands/user';
import { handleInv } from './commands/inv';
import { handleWork } from './commands/work';
import { handleAdv } from './commands/adv';
import { handleSchedule } from './commands/schedule';
import { handleShop } from './commands/shop';
import { handleHls } from './commands/hls';

// 导入核心模块
import { pluginState, PluginState } from './core/state';
import { initPlayerStorage } from './core/player';
import { initScheduleStorage, checkAndSettleSchedules } from './core/schedule';
import { registerApiRoutes } from './services/api-service';

// 全局延迟配置（毫秒）
const GLOBAL_DELAY_MS = 3000; // 3秒延迟

// 延迟函数
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const commandHandlers: Record<string, any> = {
    'help': handleHelp,
    'jrrp': handleJrrp,
     'reg': handleReg,
    'ping': handlePing,
    'roll': handleRoll,
  'ticket': handleTicket,
     'dyq': handleDyq,
    'user': handleUser,
     'inv': handleInv,
    'work': handleWork,
     'adv': handleAdv,    
'schedule': handleSchedule, 
    'shop': handleShop,
     'hls': handleHls,
    'dyqs': handleDyqs,
};

// 定时器
let checkInterval: NodeJS.Timeout | null = null;

export const plugin_init: PluginModule['plugin_init'] = async (ctx) => {
    // 初始化全局状态单例（必须在其他模块前调用）
    pluginState.init(ctx);

    // 初始化存储模块
    initPlayerStorage(ctx, ctx.dataPath);
    initScheduleStorage(ctx, ctx.dataPath);

    // 注册 API 和 WebUI 页面路由
    registerApiRoutes(ctx);
    
    // 每小时检测一次日程结算
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(async () => {
        await checkAndSettleSchedules(ctx, async (userId, msg) => {
            // 发送消息给用户（需要在群聊或私聊中发送）
            // 这里简化处理，实际需要通过QQ号发送消息
            ctx.logger.info(`[Schedule] 用户 ${userId} 工作完成: ${msg}`);
        });
    }, 60 * 60 * 1000); // 1小时
    
    ctx.logger.info('[GamePlugin] 游戏插件已加载');
    ctx.logger.info(`[GamePlugin] 全局延迟已启用: ${GLOBAL_DELAY_MS}ms`);
    ctx.logger.info('   可用指令: .help, .jrrp, .reg, .user, .dyq, .ticket, .inv, .work, .shop, .hls');
};

export const plugin_onmessage: PluginModule['plugin_onmessage'] = async (ctx, event) => {
    if (event.post_type !== EventType.MESSAGE) return;
    
    const rawMessage = event.raw_message?.trim() || '';
    if (!rawMessage.startsWith('.')) return;
    
    // 全局延迟
    ctx.logger.debug(`[GamePlugin] 全局延迟 ${GLOBAL_DELAY_MS}ms...`);
    await delay(GLOBAL_DELAY_MS);
    
    const spaceIndex = rawMessage.indexOf(' ');
    let commandName: string;
    let args: string;
    
    if (spaceIndex === -1) {
        commandName = rawMessage.slice(1).toLowerCase();
        args = '';
    } else {
        commandName = rawMessage.slice(1, spaceIndex).toLowerCase();
        args = rawMessage.slice(spaceIndex + 1).trim();
    }
    
    const groupId = event.group_id;
    const userId = event.user_id;
    const isGroup = event.message_type === 'group';

    // 群总开关禁用时，仅 jrrp 和超级管理员可用
    if (isGroup && !pluginState.isGroupEnabled(String(groupId)) && commandName !== 'jrrp' && !PluginState.isSuperAdmin(userId)) {
        return;
    }
    
    const sendReply = async (content: string) => {
        const params: any = { message: content };
        if (isGroup) params.group_id = groupId;
        else params.user_id = userId;
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
    };
    
    const handler = commandHandlers[commandName];
    
    if (handler) {
        ctx.logger.info(`[GamePlugin] 执行指令: .${commandName}，用户: ${userId}`);
        await handler(ctx, { ...event, args }, sendReply);
    }
};

export const plugin_cleanup: PluginModule['plugin_cleanup'] = async (ctx) => {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
    pluginState.cleanup();
    ctx.logger.info('[GamePlugin] 游戏插件已卸载');
};