import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { PluginState } from '../core/state';

export async function handlePing(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    const groupId = event.group_id;
    if (groupId) {
        try {
            const memberInfo = await ctx.actions.call('get_group_member_info', {
                group_id: groupId, user_id: event.user_id,
            }, ctx.adapterName, ctx.pluginManager.config) as { role?: string };
            if (memberInfo?.role !== 'owner' && memberInfo?.role !== 'admin' && !PluginState.isSuperAdmin(event.user_id)) {
                return;
            }
        } catch {
            return;
        }
    }
    const start = Date.now();
    await sendReply('pong!');
    ctx.logger.info(`[Ping] 管理员 ${event.user_id} 测试延迟: ${Date.now() - start}ms`);
}