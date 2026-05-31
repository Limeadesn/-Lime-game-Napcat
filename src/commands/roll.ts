import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';

export async function handleRoll(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    const args = (event.args || '').trim();
    const userId = event.user_id;

    let count = 1;
    let sides = 100;

    if (args) {
        const match = args.match(/^(\d+)?[dD](\d+)$/);
        if (match) {
            count = parseInt(match[1] || '1', 10);
            sides = parseInt(match[2], 10);
        } else {
            // 纯数字 = 面数，默认 1 个
            const n = parseInt(args, 10);
            if (!isNaN(n) && n > 0) {
                sides = n;
            } else {
                await sendReply('[错误] 格式错误！正确格式: .roll [数量]d[面数]\n示例: .roll, .roll 20, .roll 2d6');
                return;
            }
        }
    }

    if (count < 1 || count > 100) {
        await sendReply('[错误] 骰子数量需在 1-100 之间！');
        return;
    }
    if (sides < 2 || sides > 10000) {
        await sendReply('[错误] 骰子面数需在 2-10000 之间！');
        return;
    }

    const results: number[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        results.push(roll);
        total += roll;
    }

    if (count === 1) {
        await sendReply(`[掷骰] 1d${sides} = ${total}`);
    } else {
        await sendReply(`[掷骰] ${count}d${sides} = ${results.join(' + ')} = ${total}`);
    }
    ctx.logger.info(`[Roll] ${userId}: ${count}d${sides} = ${total}`);
}