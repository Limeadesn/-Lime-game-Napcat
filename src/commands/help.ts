// src/commands/help.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';

// 管理员专属指令（不在普通帮助中显示）
const ADMIN_COMMANDS = new Set(['ping']);

// 指令详细说明
const COMMAND_DETAILS: Record<string, { desc: string; subCommands?: Record<string, string> }> = {
    'help': {
        desc: '显示帮助信息',
        subCommands: {
            '[指令]': '查看指定指令的详细用法',
            'admin': '显示管理员指令列表'
        }
    },
    'ping': {
        desc: '延迟测试（管理员/群主专用）',
        subCommands: {
            '': '测试机器人响应延迟'
        }
    },
    'jrrp': {
        desc: '今日人品运势',
        subCommands: {
            '': '随机抽取今日运势，获得金币/心情/健康变化'
        }
    },
    'reg': {
        desc: '注册游戏角色',
        subCommands: {
            'list': '查看预设与可选种类、性别、体态、种族',
            'y <预设ID>': '快速预设注册（1人类/2猫娘/3狐娘）',
            '<昵称> <种类ID> <性别ID> <体态ID> <种族ID1> [种族ID2]': '自定义创建角色',
            'dereg': '注销角色（需二次确认）'
        }
    },
    'user': {
        desc: '用户角色管理/转账',
        subCommands: {
            'info': '查看角色信息',
            'upgrade <属性> [点数]': '消耗自由点提升属性，如 .user upgrade STR 2',
            'check': '查看日程进度并结算已完成日程',
            'pay <QQ号> <数目>': '转账金币给其他玩家'
        }
    },
    'dyq': {
        desc: '钓鱼趣游戏',
        subCommands: {
            'join [昵称]': '加入游戏',
            'quit': '退出游戏（未开始退还金币，开始后不退）',
            'start': '开始游戏',
            '[鱼名]': '游戏中猜测子弹鱼'
        }
    },
    'dyqs': {
        desc: '钓鱼趣（单回合版）',
        subCommands: {
            'join [昵称]': '加入游戏（无入场费）',
            'quit': '退出游戏',
            'start': '开始游戏（仅一回合）',
            '[鱼名]': '游戏中猜测子弹鱼'
        }
    },
    'ticket': {
        desc: '彩票系统',
        subCommands: {
            '': '显示可用彩票类型',
            'ggl': '呱呱乐（20金币/注）',
            'oneshot': '一击即中（100金币/注，返奖率80%）'
        }
    },
    'roll': {
        desc: '掷骰子',
        subCommands: {
            '': '默认 1d100',
            '[数量]d[面数]': '指定骰子，如 2d6',
            '[面数]': '纯数字 = 1d面数，如 .roll 20'
        }
    },
    'inv': {
        desc: '物品仓库管理',
        subCommands: {
            'info': '查看仓库物品',
            'check <物品ID>': '查看物品详情',
            'use <物品ID> <数量>': '使用物品',
            'give <QQ号> <物品ID> <数量>': '赠送物品',
            'sell <物品ID> <数量>': '出售物品',
            'gene <QQ号> <物品ID> <数量>': '[管理] 给予物品'
        }
    },
    'work': {
        desc: '打工赚钱',
        subCommands: {
            'list [页码]': '查看工作列表，支持翻页',
            'select <工作ID>': '选择并开始工作'
        }
    },
    'adv': {
        desc: '历练成长',
        subCommands: {
            'list': '查看可用历练',
            'select <历练ID>': '选择并开始历练'
        }
    },
    'schedule': {
        desc: '日程管理',
        subCommands: {
            'check': '查看进行中的日程进度',
            'cancel': '取消当前日程（需支付违约金）'
        }
    },
    'shop': {
        desc: '商店购物',
        subCommands: {
            'list': '查看商品列表',
            'buy <商品ID>': '购买商品（mineral/candy/pill）'
        }
    },
    'hls': {
        desc: '黑历史图片',
        subCommands: {
            '': '随机抽取任意黑历史图片',
            '<QQ号>': '抽取指定用户的黑历史图片',
            'upload [QQ号]': '[管理] 上传黑历史（可回复图片消息）'
        }
    }
};

// 获取一级菜单（普通指令列表，隐藏管理员指令）
function getMainHelp(): string {
    const lines: string[] = [];
    lines.push('[游戏插件指令列表]');
    lines.push('----------------------------------------');
    
    // 遍历 COMMAND_DETAILS，跳过管理员指令
    for (const [cmd, detail] of Object.entries(COMMAND_DETAILS)) {
        if (ADMIN_COMMANDS.has(cmd)) continue;
        lines.push(`.${cmd.padEnd(9)} - ${detail.desc}`);
    }
    
    lines.push('----------------------------------------');
    lines.push('使用 .help <指令> 查看详细用法');
    lines.push('示例: .help reg');
    return lines.join('\n');
}

// 获取管理员指令列表
function getAdminHelp(): string {
    const lines: string[] = [];
    lines.push('[管理员指令列表]');
    lines.push('----------------------------------------');
    
    for (const cmd of ADMIN_COMMANDS) {
        const detail = COMMAND_DETAILS[cmd];
        if (detail) {
            lines.push(`.${cmd.padEnd(9)} - ${detail.desc}`);
        }
    }
    
    lines.push('----------------------------------------');
    lines.push('使用 .help <指令> 查看详细用法');
    return lines.join('\n');
}

// 获取指定指令的详细帮助（确保返回 string，不返回 null）
function getCommandHelp(commandName: string): string {
    const detail = COMMAND_DETAILS[commandName];
    
    const lines: string[] = [];
    lines.push(`[${commandName}] ${detail?.desc || '未知指令'}`);
    lines.push(`----------------------------------------`);
    
    if (detail?.subCommands && Object.keys(detail.subCommands).length > 0) {
        for (const [subCmd, desc] of Object.entries(detail.subCommands)) {
            // 跳过标记了 [管理] 的子命令
            if (desc.startsWith('[管理]')) continue;
            if (subCmd === '') {
                lines.push(`.${commandName} ${desc}`);
            } else {
                lines.push(`.${commandName} ${subCmd} - ${desc}`);
            }
        }
    } else {
        lines.push(`.${commandName} - ${detail?.desc || '暂无详细说明'}`);
    }
    
    lines.push(`----------------------------------------`);
    lines.push(`使用 .help 查看所有指令`);
    
    return lines.join('\n');
}

export async function handleHelp(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    const args = (event.args || '').trim();
    const parts = args.split(/\s+/);
    const cmd = parts[0]?.toLowerCase() || '';
    
    // .help admin → 显示管理员指令列表
    if (cmd === 'admin') {
        const helpText = getAdminHelp();
        await sendReply(helpText);
        ctx.logger.info('[Help] 用户查看了管理员指令列表');
        return;
    }
    
    // 如果有参数，显示指定指令的详细帮助
    if (cmd) {
        // 无论指令是否存在，都返回帮助信息（不存在的会显示"未知指令"）
        const helpText = getCommandHelp(cmd);
        await sendReply(helpText);
        ctx.logger.info(`[Help] 用户查看了 ${cmd} 的详细帮助`);
        return;
    }
    
    // 无参数，显示一级菜单
    const helpText = getMainHelp();
    await sendReply(helpText);
    ctx.logger.info(`[Help] 用户查看了帮助菜单`);
}