// src/commands/hls.ts
// 黑历史娱乐功能：随机/指定用户抽取服务器上的图片（按群分文件夹）

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { pluginState, PluginState } from '../core/state';

let hlsDir: string = '';

function getBaseDir(ctx: NapCatPluginContext, groupId?: number): string {
    if (groupId) return path.join(ctx.dataPath, 'hls', String(groupId));
    return path.join(ctx.dataPath, 'hls', 'common');
}

/** 扫描目录下所有图片文件 */
function scanImages(dir: string): string[] {
    try {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir)
            .filter(f => /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(f))
            .map(f => path.join(dir, f));
    } catch {
        return [];
    }
}

/** 获取指定 baseDir 下所有图片（common + 各用户子目录） */
function getAllImages(baseDir: string): string[] {
    const images: string[] = [];
    images.push(...scanImages(path.join(baseDir, 'common')));
    const usersDir = path.join(baseDir, 'users');
    if (fs.existsSync(usersDir)) {
        for (const userDir of fs.readdirSync(usersDir)) {
            const fullPath = path.join(usersDir, userDir);
            if (fs.statSync(fullPath).isDirectory()) {
                images.push(...scanImages(fullPath));
            }
        }
    }
    return images;
}

/** 随机选一张 */
function pickRandom(images: string[]): string | null {
    if (images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
}

// ==================== 上传功能 ====================

async function checkAdmin(ctx: NapCatPluginContext, groupId: number, userId: number): Promise<boolean> {
    if (PluginState.isSuperAdmin(userId)) return true;
    try {
        const r = await ctx.actions.call('get_group_member_info', { group_id: groupId, user_id: userId }, ctx.adapterName, ctx.pluginManager.config) as any;
        return r?.role === 'owner' || r?.role === 'admin';
    } catch { return false; }
}

function getNextIndex(userDir: string, qq: string): number {
    if (!fs.existsSync(userDir)) return 1;
    const files = fs.readdirSync(userDir).filter(f => f.startsWith(qq + '-'));
    let max = 0;
    for (const f of files) {
        const m = f.match(new RegExp('^' + qq + '-(\\d+)\\.'));
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
}

function getExt(url: string): string {
    const m = url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i);
    return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.jpg';
}

function downloadImage(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const mod: any = url.startsWith('https') ? https : http;
        mod.get(url, (res: any) => {
            if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve()));
        }).on('error', reject);
    });
}

/** 重建所有群的 common 目录（从各群 users 全量复制） */
function rebuildAllCommon(ctx: NapCatPluginContext): void {
    const hlsRoot = path.join(ctx.dataPath, 'hls');
    if (!fs.existsSync(hlsRoot)) return;
    for (const gDir of fs.readdirSync(hlsRoot)) {
        if (gDir === 'common' || gDir === 'jrrp_unreg') continue;
        const commonDir = path.join(hlsRoot, gDir, 'common');
        // 清空 common
        if (fs.existsSync(commonDir)) {
            for (const f of fs.readdirSync(commonDir)) fs.unlinkSync(path.join(commonDir, f));
        } else {
            fs.mkdirSync(commonDir, { recursive: true });
        }
        // 从 users 全量复制
        const usersDir = path.join(hlsRoot, gDir, 'users');
        if (!fs.existsSync(usersDir)) continue;
        for (const qqDir of fs.readdirSync(usersDir)) {
            const qqPath = path.join(usersDir, qqDir);
            if (!fs.statSync(qqPath).isDirectory()) continue;
            for (const f of fs.readdirSync(qqPath)) {
                const src = path.join(qqPath, f);
                const dest = path.join(commonDir, f);
                if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
            }
        }
    }
}

async function uploadHls(ctx: NapCatPluginContext, event: any, sendReply: (m: string) => Promise<void>, args: string): Promise<boolean> {
    const groupId = event.group_id;
    if (!groupId) { await sendReply('[错误] 仅在群聊中支持上传~'); return false; }
    if (!await checkAdmin(ctx, groupId, event.user_id)) { await sendReply('[错误] 仅管理员/群主可上传~'); return false; }

    const parts = args.split(/\s+/);
    let targetQQ = parts[1] || '';
    // QQ号至少5位数字
    if (targetQQ && !/^\d{5,}$/.test(targetQQ)) targetQQ = '';

    // 必须指定 QQ 号
    if (!targetQQ) { await sendReply('[错误] 请指定QQ号！\n用法: .hls upload <QQ号> + 图片'); return false; }

    // 附带图片检测
    const msgImages = (event.message || []).filter((s: any) => s.type === 'image');
    ctx.logger.info('[HLS] upload direct, targetQQ=' + targetQQ + ', images=' + msgImages.length + ', msg=' + JSON.stringify(event.message).slice(0, 300));
    if (msgImages.length === 0) { await sendReply('[错误] 请附带图片！\n用法: .hls upload <QQ号> + 图片，或回复带图片的消息 + .hls upload'); return false; }
    try {
        const imgData = msgImages[0].data || {};
        let imgUrl = imgData.url;
        // url 为空时用 file 字段通过 get_image API 获取
        if (!imgUrl && imgData.file) {
            ctx.logger.info('[HLS] url empty, trying get_image with file=' + imgData.file);
            const imgInfo = await ctx.actions.call('get_image', { file: imgData.file }, ctx.adapterName, ctx.pluginManager.config) as any;
            imgUrl = imgInfo?.url || '';
        }
        if (!imgUrl) { await sendReply('[错误] 无法获取图片链接，请重试！'); return false; }
        const baseDir = getBaseDir(ctx, groupId);
        const userDir = path.join(baseDir, 'users', targetQQ);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        const idx = getNextIndex(userDir, targetQQ);
        const ext = getExt(imgUrl);
        const fileName = targetQQ + '-' + idx + ext;
        const dest = path.join(userDir, fileName);
        await downloadImage(imgUrl, dest);
        rebuildAllCommon(ctx);
        await sendReply('[黑历史] 已上传 ' + targetQQ + ' 的第' + idx + '张！');
        ctx.logger.info('[HLS] 上传 → ' + targetQQ + ' #' + idx);
        return true;
    } catch (e: any) { await sendReply('[错误] ' + e.message); return false; }
}

/** 发送图片消息 */
async function sendImage(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>,
    filePath: string
): Promise<void> {
    const isGroup = event.message_type === 'group';
    const targetId = isGroup ? event.group_id : event.user_id;
    const params: any = {
        message: [{ type: 'image', data: { file: `file:///${filePath.replace(/\\/g, '/')}` } }],
        message_type: isGroup ? 'group' : 'private',
    };
    if (isGroup) params.group_id = targetId;
    else params.user_id = targetId;
    await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
}

export async function handleHls(
    ctx: NapCatPluginContext,
    event: any,
    sendReply: (msg: string) => Promise<void>
): Promise<void> {
    const groupId = event.group_id;
    const baseDir = getBaseDir(ctx, groupId);

    const args = (event.args || '').trim();
    const parts = args.split(/\s+/);
    const subCmd = parts[0]?.toLowerCase() || '';
    const targetUserId = parts[0] || '';

    // .hls upload [QQ号]
    if (subCmd === 'upload') {
        await uploadHls(ctx, event, sendReply, args);
        return;
    }

    // .hls <QQ号> — 指定用户
    if (targetUserId && /^\d+$/.test(targetUserId)) {
        const userDir = path.join(baseDir, 'users', targetUserId);
        const images = scanImages(userDir);
        if (images.length === 0) {
            await sendReply(`[黑历史] 该用户暂无黑历史图片！请联系管理员在 ${userDir} 目录下添加`);
            return;
        }
        const picked = pickRandom(images);
        if (!picked) {
            await sendReply('[黑历史] 抽取失败，请稍后重试');
            return;
        }
        await sendImage(ctx, event, sendReply, picked);
        ctx.logger.info(`[HLS] 群${groupId || '私聊'} ${event.user_id} 查看了 ${targetUserId} 的黑历史: ${path.basename(picked)}`);
        return;
    }

    // .hls — 随机所有人
    const allImages = getAllImages(baseDir);
    if (allImages.length === 0) {
        await sendReply(`[黑历史] 暂无黑历史图片！请在 ${baseDir}/common/ 或 ${baseDir}/users/<QQ>/ 下添加`);
        return;
    }
    const picked = pickRandom(allImages);
    if (!picked) {
        await sendReply('[黑历史] 抽取失败，请稍后重试');
        return;
    }
    await sendImage(ctx, event, sendReply, picked);
    ctx.logger.info(`[HLS] 群${groupId || '私聊'} ${event.user_id} 随机黑历史: ${path.basename(picked)}`);
}
