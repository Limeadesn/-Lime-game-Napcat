// src/commands/reg.ts

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, createPlayer, deletePlayer } from '../core/player';
import { KINDS, GENDERS, FORMS, RACES } from '../utils/race';

const deregPending = new Set<number>();

export async function handleReg(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    // 确保存储模块已初始化
    initPlayerStorage(ctx, ctx.dataPath);
    
    const userId = event.user_id;
    const args = (event.args || '').trim();
    const parts = args.split(/\s+/);
    const cmd = parts[0]?.toLowerCase() || '';
    
    function getFormGenderName(formId: number, genderId: number): string {
        if (genderId === 0) {
            switch (formId) {
                case 0: return '童男';
                case 1: return '正太';
                case 2: return '少年';
                case 3: return '成男';
                default: return '未知';
            }
        } else {
            switch (formId) {
                case 0: return '幼女';
                case 1: return '萝莉';
                case 2: return '少女';
                case 3: return '熟女';
                default: return '未知';
            }
        }
    }
    
    // .reg list
    if (cmd === 'list') {
        await sendReply(`——预设与选项——
[快速预设] .reg y <预设ID>
  1: 人类少女（人类·女·青年·人类血脉）
  2: 猫娘少女（人类·女·青年·猫+人血脉）
  3: 狐娘少女（人类·女·青年·狐+人血脉）

——自定义——
[种类]
  兽类[0]、兽人[1]、人类[2]
[性别]
  男[0]、女[1]
[体态]
  幼态[0]、成长态[1]、青年态[2]、成熟态[3]
[种族]
  0: 人类 - 均衡发展的种族。
  1: 猫 - 敏捷灵巧的种族。
  2: 狐 - 聪慧魅惑的种族。
  3: 鸟 - 轻盈迅捷的种族。
  4: 龙 - 古老而强大的龙族。
  5: 火龙 - 掌控火焰的龙族。
  6: 飞龙 - 翱翔天际的龙族。
  7: 机械 - 钢铁之躯的机械生命。
  8: 妖精 - 神秘莫测的妖精。
[特殊] 人类种类必须包含人类或妖精种族其中至多一个。
.reg <昵称> <种类ID> <性别ID> <体态ID> <种族ID1> [种族ID2]

[注销] .reg dereg（需二次确认）`);
        return;
    }

    // .reg dereg —— 注销角色
    if (cmd === 'dereg') {
        if (!isPlayerExists(userId)) { await sendReply('[错误] 你还没有注册角色！'); return; }
        if (!deregPending.has(userId)) {
            deregPending.add(userId);
            await sendReply('[警告] 确定要注销角色吗？此操作不可撤销！\n再次输入 .reg dereg 确认注销。');
            return;
        }
        deregPending.delete(userId);
        const p = loadPlayer(userId);
        const name = p?.nickname || '未知';
        deletePlayer(userId);
        await sendReply(`[注销] 角色 ${name} 已删除。`);
        ctx.logger.info(`[Reg] ${userId} 注销角色 ${name}`);
        return;
    }

    // 无参数
    if (parts.length === 0 || cmd === '') {
        await sendReply(`[注册指令]\n.reg list - 查看预设与选项\n.reg y <预设ID> - 快速预设注册\n.reg <昵称> <种类ID> <性别ID> <体态ID> <种族ID1> [种族ID2]\n.reg dereg - 注销角色`);
        return;
    }

    // .reg y <预设ID> —— 快速预设注册
    if (cmd === 'y') {
        if (isPlayerExists(userId)) { await sendReply('[错误] 你已经注册过了！使用 .reg dereg 先注销。'); return; }
        const pid = parseInt(parts[1], 10);
        const presets: Record<number, { nick: string; kind: number; gender: number; form: number; races: number[] }> = {
            1: { nick: '人类少女', kind: 2, gender: 1, form: 2, races: [0] },
            2: { nick: '猫娘少女', kind: 2, gender: 1, form: 2, races: [1, 0] },
            3: { nick: '狐娘少女', kind: 2, gender: 1, form: 2, races: [2, 0] },
        };
        const pre = presets[pid];
        if (!pre) { await sendReply('[错误] 无效预设ID！可选: 1=人类少女 2=猫娘少女 3=狐娘少女'); return; }
        const player = createPlayer(userId, pre.nick, pre.kind, pre.gender, pre.form, pre.races);
        if (!player || !savePlayer(player)) { await sendReply('[错误] 注册失败！'); return; }
        const fgn = getFormGenderName(pre.form, pre.gender);
        await sendReply(`[成功] ${pre.nick} 创建成功！\n体型:${fgn} | 金币:${player.ext.gold} | 心情:${player.ext.mood} | 健康:${player.ext.health}\n自由点:${player.ext.freePoints} | 体型值:${player.size}\n.reg list 查看详情`);
        ctx.logger.info(`[Reg] ${userId} 预设注册 ${pre.nick}`);
        return;
    }

    // 自定义注册
    if (isPlayerExists(userId)) { await sendReply('[错误] 你已经注册过了！使用 .reg dereg 先注销。'); return; }
    if (parts.length < 5) { await sendReply(`[错误] 格式错误！.reg <昵称> <种类ID> <性别ID> <体态ID> <种族ID1> [种族ID2]`); return; }
    const nickname = parts[0];
    const kindId = parseInt(parts[1], 10);
    const genderId = parseInt(parts[2], 10);
    const formId = parseInt(parts[3], 10);
    const raceIds: number[] = [];
    for (let i = 4; i < parts.length && i <= 5; i++) {
        const id = parseInt(parts[i], 10);
        if (!isNaN(id)) raceIds.push(id);
    }
    
    // 验证各项...
    if (isNaN(kindId) || kindId < 0 || kindId >= KINDS.length) {
        await sendReply(`[错误] 无效的种类ID！`);
        return;
    }
    if (isNaN(genderId) || genderId < 0 || genderId >= GENDERS.length) {
        await sendReply(`[错误] 无效的性别ID！`);
        return;
    }
    if (isNaN(formId) || formId < 0 || formId >= FORMS.length) {
        await sendReply(`[错误] 无效的体态ID！`);
        return;
    }
    if (raceIds.length === 0 || raceIds.some(id => id < 0 || id >= RACES.length)) {
        await sendReply(`[错误] 无效的种族ID！`);
        return;
    }
    
    // 规则检查
    if (kindId === 2) {
        const hasHumanOrFairy = raceIds.some(id => id === 0 || id === 8);
        if (!hasHumanOrFairy) {
            await sendReply(`[错误] 人类种类必须选择人类或妖精种族！`);
            return;
        }
    }
    if (raceIds.includes(8) && raceIds.includes(0)) {
        await sendReply(`[错误] 妖精无法与人类混合血脉！`);
        return;
    }
    
    if (isPlayerExists(userId)) {
        await sendReply(`[错误] 你已经注册过了！`);
        return;
    }
    
    if (nickname.length < 1 || nickname.length > 20) {
        await sendReply(`[错误] 昵称长度应在1-20个字符之间！`);
        return;
    }
    
    const player = createPlayer(userId, nickname, kindId, genderId, formId, raceIds);
    if (!player || !savePlayer(player)) {
        await sendReply(`[错误] 注册失败！`);
        return;
    }
    
    const formGenderName = getFormGenderName(formId, genderId);
    const displayRace = player.mixedRaceName || raceIds.map(id => RACES[id].name).join(' + ');
    
    await sendReply(`[成功] 角色创建成功！
----------------------------------------
[玩家] ${player.nickname}
[种类] ${player.kindName}
[体型] ${formGenderName}
[体态] ${player.formName}
[血脉] ${displayRace}
[金币] ${player.ext.gold}
[心情] ${player.ext.mood}
[健康] ${player.ext.health}
[自由点] ${player.ext.freePoints}
[体型值] ${player.size}
----------------------------------------
[属性] (中间值/最终值)
力量:${player.base.midStr}/${player.base.str}
敏捷:${player.base.midDex}/${player.base.dex}
体质:${player.base.midCon}/${player.base.con}
智慧:${player.base.midInt}/${player.base.int}
魅力:${player.base.midCha}/${player.base.cha}
运气:${player.base.midLuc}/${player.base.luc}`);
    
    ctx.logger.info(`[Reg] ${userId} 创建角色 ${nickname}`);
}