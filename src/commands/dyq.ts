// src/commands/dyq.ts
// 钓鱼趣 - 回合制子弹鱼游戏

import type { NapCatPluginContext } from "napcat-types/napcat-onebot/network/plugin/types";
import { initPlayerStorage, isPlayerExists, loadPlayer, savePlayer, getMoney, addMoney } from "../core/player";
import { PluginState } from "../core/state";
import { pluginState } from "../core/state";

// ==================== 类型 ====================

interface Player {
    userId: number; nickname: string; successCount: number; isAlive: boolean; isSystem: boolean;
}
interface GameState {
    isActive: boolean; players: Player[]; systemPlayers: Player[]; allPlayers: Player[];
    currentTurnIndex: number; gameFish: string[]; bulletFish: string; order: number[];
    gameStartTime: number; groupId: number; creatorId: number; totalPrizePool: number;
    isSingleRound: boolean;
    elimOrder: number[];
    roundGuessCount: number;
}

let currentGame: GameState | null = null;

function getFishPool(): string[] { return pluginState.config.dyqConfig?.fishPool?.length ? pluginState.config.dyqConfig.fishPool : DEFAULT_FISH; }
function getNpcNames(): string[] { return pluginState.config.dyqConfig?.npcNames?.length ? pluginState.config.dyqConfig.npcNames : DEFAULT_NPC; }

const DEFAULT_FISH = ["幽匿鳟鱼","冰霜鳕鱼","岩浆鳗鱼","死眼比目鱼","冰冻罗非鱼","霓虹锦鲤","暗影鱼","填充草药鱼","兔兔鱼","克苏鲁眼鱼","坠落星鱼","臭鳜鱼","西湖醋鱼","向日葵锦鲤","传说鱼王","博比特虫","黑曜石鱼","闪耀锦鲤","萨卡班甲鱼","Gura小鲨鱼","寰宇星鱼","七星鱼","银鱼","金鱼","雷管鱼"];
const DEFAULT_NPC = ["艾薇医生","格拉迪亚图斯","召唤师","神秘渔夫","戴维","巫妖王","疫医","海伦凯勒","威利","老人与海的老人"];
const ENTRY_FEE = 50, SYSTEM_ENTRY_FEE = 20, MESSAGE_DELAY_MS = 2000;

// ==================== 工具 ====================

function rndSysName(used: string[]): string { const a = getNpcNames().filter(n => !used.includes(n)); return a.length ? a[Math.floor(Math.random()*a.length)] : "机器人"+(used.length+1); }
function shuffle<T>(arr: T[]): T[] { const s=[...arr]; for(let i=s.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]]; } return s; }
function drawFish(n: number): string[] { return shuffle([...getFishPool()]).slice(0,n); }
function dly(ms: number): Promise<void> { return new Promise(r=>setTimeout(r,ms)); }
function aliveReal(): number { const g=currentGame; return g?g.allPlayers.filter(p=>p.isAlive&&!p.isSystem).length:0; }
function aliveCount(): number { const g=currentGame; return g?g.allPlayers.filter(p=>p.isAlive).length:0; }
function isOver(): boolean { const ar=aliveReal(), ac=aliveCount(); return ar===0||ac<=1; }

/** 移除已猜鱼，每人至少猜一次后重置回合 */
function removeFish(fish: string): boolean {
    const g=currentGame; if(!g)return false;
    const idx=g.gameFish.indexOf(fish);
    if(idx!==-1) g.gameFish.splice(idx,1);
    g.roundGuessCount++;
    if(g.roundGuessCount>=g.allPlayers.filter(p=>p.isAlive).length){
        const f=startRound(); return true;
    }
    return false;
}
async function isAdmin(ctx: NapCatPluginContext, gid: number, uid: number): Promise<boolean> {
    if (PluginState.isSuperAdmin(uid)) return true;
    try { const r=await ctx.actions.call("get_group_member_info",{group_id:gid,user_id:uid},ctx.adapterName,ctx.pluginManager.config) as any; return r?.role==="owner"||r?.role==="admin"; } catch { return false; }
}
function regNick(uid: number): string|null { const p=loadPlayer(uid); return p?p.nickname:null; }

// ==================== 游戏核心 ====================

function addBots(n: number): void {
    const g=currentGame; if(!g)return;
    const need=n-(g.players.length+g.systemPlayers.length); if(need<=0)return;
    const used=[...g.players.map(p=>p.nickname),...g.systemPlayers.map(p=>p.nickname)];
    for(let i=0;i<need;i++){ const sp:Player={userId:-100-(g.systemPlayers.length+i),nickname:rndSysName(used),successCount:0,isAlive:true,isSystem:true}; used.push(sp.nickname); g.systemPlayers.push(sp); }
}

function startRound(): string[] {
    const g=currentGame; if(!g)return[];
    const ac=g.allPlayers.filter(p=>p.isAlive).length;
    const f=drawFish(ac+2); g.gameFish=f; g.bulletFish=f[Math.floor(Math.random()*f.length)]; g.roundGuessCount=0; return f;
}
function seekAlive(): void { const g=currentGame; if(!g)return; const t=g.order.length; for(let i=0;i<t;i++){ if(g.allPlayers[g.order[g.currentTurnIndex%t]].isAlive)return; g.currentTurnIndex++; } }
function next(): void { const g=currentGame; if(g){g.currentTurnIndex++;seekAlive();} }
async function showRound(r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame; if(!g||!g.isActive)return; seekAlive();
    const cp=g.allPlayers[g.order[g.currentTurnIndex%g.order.length]];
    await r("轮到："+cp.nickname+"\n鱼池("+g.gameFish.length+"条)："+g.gameFish.join("、")+"\n输入 .dyq [鱼名] 询问对方有没有这条鱼");
}

async function endGame(ctx: NapCatPluginContext, r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame; if(!g)return;
    const al=g.allPlayers.filter(p=>p.isAlive), rl=al.filter(p=>!p.isSystem);
    let winner: Player|null=null;
    if(rl.length===1) winner=rl[0]; else if(rl.length===0){ const bt=al.filter(p=>p.isSystem); if(bt.length) winner=bt[Math.floor(Math.random()*bt.length)]; }

    if(g.isSingleRound || !winner){
        await r(winner&&!winner.isSystem?"游戏结束！胜者："+winner.nickname+"（单回合无奖励）":"游戏结束！");
        currentGame=null; return;
    }

    // 只有 bot 存活时，随机排列 bot 出局顺序
    const realPlayers=g.allPlayers.filter(p=>!p.isSystem);
    if(realPlayers.length===0){
        const bots=g.allPlayers.filter(p=>p.isSystem);
        const shuffled=shuffle(bots);
        await r("游戏结束！真人全灭~\nBot排名："+shuffled.map((b,i)=>(i+1)+"."+b.nickname).join("\n"));
        currentGame=null; return;
    }

    // 按出局顺位等差分配奖金（排名：胜者第1，最后出局第2...）
    const n=realPlayers.length;
    const ranked: Player[]=[];
    // 胜者排第一
    if(winner) ranked.push(winner);
    // elimOrder 倒序（最后出局的排前面）
    for(let i=g.elimOrder.length-1;i>=0;i--){
        const pid=g.elimOrder[i];
        const p=realPlayers.find(rp=>rp.userId===pid);
        if(p && p!==winner) ranked.push(p);
    }
    if(n===1){
        const prize=Math.ceil(g.totalPrizePool*0.5);
        const pd=loadPlayer(ranked[0].userId);
        if(pd){addMoney(pd,prize);savePlayer(pd);}
        await r("游戏结束！胜者："+ranked[0].nickname+"\n奖金："+prize+"金币");
    }else{
        const step=50/(n-1);
        const lines: string[]=["游戏结束！排名与奖金："];
        for(let i=0;i<n;i++){
            const p=ranked[i];
            const pct=i===0?50:Math.round(step*i);
            const prize=Math.ceil(g.totalPrizePool*pct/100);
            const pd=loadPlayer(p.userId);
            if(pd){addMoney(pd,prize);savePlayer(pd);}
            const tag=i===0?"（胜者）":"（第"+(g.elimOrder.indexOf(p.userId)+1)+"位出局）";
            lines.push((i+1)+"."+p.nickname+tag+"："+prize+"金币（"+pct+"%）");
        }
        await r(lines.join("\n"));
    }

    ctx.logger.info("[DYQ] 结束 胜者:"+winner.nickname);
    currentGame=null;
}

async function deduct(ctx: NapCatPluginContext, p: Player): Promise<boolean> {
    const g=currentGame; if(!g)return false;
    if(p.isSystem){g.totalPrizePool+=SYSTEM_ENTRY_FEE;return true;}
    const pd=loadPlayer(p.userId); if(!pd||getMoney(pd)<ENTRY_FEE)return false;
    addMoney(pd,-ENTRY_FEE);pd.lastActive=Date.now();if(!savePlayer(pd))return false;
    g.totalPrizePool+=ENTRY_FEE;return true;
}

async function botGuess(ctx: NapCatPluginContext, r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame; if(!g||!g.isActive)return; seekAlive();
    const idx=g.order[g.currentTurnIndex%g.order.length], cp=g.allPlayers[idx]; if(!cp.isSystem)return;
    const guess=g.gameFish[Math.floor(Math.random()*g.gameFish.length)];
    await r(cp.nickname+"：你有没有【"+guess+"】？"); await dly(MESSAGE_DELAY_MS);
    if(guess===g.bulletFish){ cp.isAlive=false; g.elimOrder.push(cp.userId); removeFish(guess); await r("GO FISH！"+cp.nickname+" 出局！");
        if(isOver()){await endGame(ctx,r);return;}
        const f=startRound(); await r("新回合！鱼池："+f.join("、")); await dly(MESSAGE_DELAY_MS);
        next();seekAlive(); await showRound(r);
        const ni=g.order[g.currentTurnIndex%g.order.length]; if(g.allPlayers[ni].isSystem)await botGuess(ctx,r);
    }else{ const reset=removeFish(guess); await r("我有！");
        if(reset){ await r("回合结束，无人出局！新回合鱼池："+g.gameFish.join("、")); await dly(MESSAGE_DELAY_MS); }
        next();await dly(MESSAGE_DELAY_MS);await showRound(r);
        const ni=g.order[g.currentTurnIndex%g.order.length]; if(g.allPlayers[ni].isSystem)await botGuess(ctx,r);
    }
}

async function startGame(ctx: NapCatPluginContext, r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame; if(!g)return;
    if(!g.isSingleRound){ const fl:string[]=[]; for(const p of g.players){ if(p.isSystem)continue; const pd=loadPlayer(p.userId); if(!pd||getMoney(pd)<ENTRY_FEE)fl.push(p.nickname); } if(fl.length){await r("[错误] 金币不足"+ENTRY_FEE+"："+fl.join("、"));return;} for(const p of g.players)await deduct(ctx,p); }
    const ct=g.players.length+g.systemPlayers.length; if(ct<5)addBots(5);
    // 补扣 bot 入场费
    if(!g.isSingleRound && currentGame){ for(const sp of currentGame.systemPlayers)await deduct(ctx,sp); }
    const fg=currentGame; if(!fg)return;
    fg.allPlayers=[...fg.players,...fg.systemPlayers]; fg.order=shuffle([...Array(fg.allPlayers.length).keys()]); fg.currentTurnIndex=0;
    const f=startRound(); fg.isActive=true;
    const ns=fg.order.map(i=>fg.allPlayers[i].nickname).map((n,i)=>(i+1)+". "+n).join("\n");
    await r("钓鱼趣开始！\n"+fg.allPlayers.length+"人\n"+ns+"\n"+(fg.isSingleRound?"":"总奖金："+fg.totalPrizePool+"金币\n")+"鱼池："+f.join("、"));
    await dly(MESSAGE_DELAY_MS); await showRound(r);
    const ni=fg.order[fg.currentTurnIndex%fg.order.length]; if(fg.allPlayers[ni].isSystem)await botGuess(ctx,r);
}

async function doGuess(ctx: NapCatPluginContext, uid: number, fish: string, r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame; if(!g||!g.isActive){await r("没有进行中的游戏~");return;}
    seekAlive(); const idx=g.order[g.currentTurnIndex%g.order.length], cp=g.allPlayers[idx];
    if(cp.userId!==uid||cp.isSystem){await r("还没轮到你哦~");return;}
    if(!g.gameFish.includes(fish)){await r("鱼池里没有【"+fish+"】！");return;}
    if(fish===g.bulletFish){ cp.isAlive=false; g.elimOrder.push(cp.userId); removeFish(fish); await r("GO FISH！"+cp.nickname+" 出局！");
        if(isOver()){await endGame(ctx,r);return;}
        const f=startRound(); await r("新回合！鱼池："+f.join("、")); await dly(MESSAGE_DELAY_MS);
        next();seekAlive(); await showRound(r);
        const ni=g.order[g.currentTurnIndex%g.order.length]; if(g.allPlayers[ni].isSystem)await botGuess(ctx,r);
    }else{ const reset=removeFish(fish); await r("我有！");
        if(reset){ await r("回合结束，无人出局！新回合鱼池："+g.gameFish.join("、")); await dly(MESSAGE_DELAY_MS); }
        next();await dly(MESSAGE_DELAY_MS);await showRound(r);
        const ni=g.order[g.currentTurnIndex%g.order.length]; if(g.allPlayers[ni].isSystem)await botGuess(ctx,r);
    }
}

async function quitGame(ctx: NapCatPluginContext, uid: number, r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame; if(!g){await r("没有进行中的游戏~");return;}
    const pi=g.players.findIndex(p=>p.userId===uid); if(pi===-1){await r("你还没加入~");return;}
    const p=g.players[pi];
    if(g.isActive){ const ai=g.allPlayers.findIndex(pl=>pl.userId===uid); if(ai!==-1)g.allPlayers[ai].isAlive=false; g.players.splice(pi,1); await r(p.nickname+" 退出（金币已扣除）"); if(isOver())await endGame(ctx,r); }
    else{ if(!p.isSystem){ const pd=loadPlayer(uid); if(pd){addMoney(pd,ENTRY_FEE);savePlayer(pd);} } g.players.splice(pi,1); await r(p.nickname+" 退出（已退款）"); if(g.players.length===0){currentGame=null;await r("游戏已解散~");} }
}

async function stopGame(ctx: NapCatPluginContext, r: (m:string)=>Promise<void>): Promise<void> {
    const g=currentGame;
    if(!g){await r("没有进行中的游戏~");return;}
    // 返还所有真人投入的金币
    const refunds: string[]=[];
    for(const p of g.players){
        if(p.isSystem) continue;
        const pd=loadPlayer(p.userId);
        if(pd){addMoney(pd,ENTRY_FEE);savePlayer(pd);refunds.push(p.nickname);}
    }
    await r("游戏已强制结束！"+(refunds.length>0?"\n已返还："+refunds.join("、")+" "+ENTRY_FEE+"金币":""));
    ctx.logger.info("[DYQ] 强制结束，已退款"+refunds.length+"人");
    currentGame=null;
}

// ==================== 指令处理 ====================

export async function handleDyq(ctx: NapCatPluginContext, event: any, sendReply: (m:string)=>Promise<void>): Promise<void> {
    return handleDyqCore(ctx, event, sendReply, false);
}

export async function handleDyqs(ctx: NapCatPluginContext, event: any, sendReply: (m:string)=>Promise<void>): Promise<void> {
    return handleDyqCore(ctx, event, sendReply, true);
}

async function handleDyqCore(ctx: NapCatPluginContext, event: any, sendReply: (m:string)=>Promise<void>, single: boolean): Promise<void> {
    initPlayerStorage(ctx, ctx.dataPath);
    const uid=event.user_id, gid=event.group_id, cmd=single?"dyqs":"dyq";
    const r=async(m:string)=>{await sendReply(m);await dly(MESSAGE_DELAY_MS);};
    const args=(event.args||"").trim();

    if(!args){
        await r(cmd+"指令：\n"+cmd+" join - 加入"+(single?"":"（需"+ENTRY_FEE+"金币）")+"\n"+cmd+" quit - 退出\n"+cmd+" start - 开始\n"+cmd+" stop - 强制结束（管理）\n游戏中："+cmd+" [鱼名] 来猜！");
        return;
    }
    if(args==="quit"){await quitGame(ctx,uid,r);return;}
    if(args==="stop"){ if(!await isAdmin(ctx,gid,uid)){await r("仅管理员/群主可停止~");return;} await stopGame(ctx,r);return; }

    if(args==="join"){
        if(!isPlayerExists(uid)){await r("请先注册！.reg");return;}
        if(currentGame&&currentGame.isActive){await r("游戏已开始，无法加入~");return;}
        if(!currentGame||currentGame.groupId!==gid){
            if(currentGame){await r("已有其他群的游戏进行中~");return;}
            const nick=regNick(uid); if(!nick){await r("请先注册！");return;}
            currentGame={isActive:false,players:[{userId:uid,nickname:nick,successCount:0,isAlive:true,isSystem:false}],systemPlayers:[],allPlayers:[],currentTurnIndex:0,gameFish:[],bulletFish:"",order:[],gameStartTime:Date.now(),groupId:gid,creatorId:uid,totalPrizePool:0,isSingleRound:single,elimOrder:[],roundGuessCount:0};
            await r(nick+" 创建了"+(single?"单回合":"")+"游戏！输入 "+cmd+" join 加入");
            ctx.logger.info("[DYQ] "+(single?"dyqs":"dyq")+" 群"+gid+" 由 "+nick+" 创建");
            return;
        }
        if(currentGame.players.find(p=>p.userId===uid)){await r("你已经在游戏里了~");return;}
        const nick=regNick(uid); if(!nick){await r("请先注册！");return;}
        currentGame.players.push({userId:uid,nickname:nick,successCount:0,isAlive:true,isSystem:false});
        await r(nick+" 加入了游戏！（"+currentGame.players.length+"人）");
        return;
    }

    if(args==="start"){
        if(!currentGame||currentGame.groupId!==gid){await r("没有游戏！先 "+cmd+" join");return;}
        if(currentGame.creatorId!==uid&&!await isAdmin(ctx,gid,uid)){await r("仅创建者/管理员可开始~");return;}
        if(currentGame.players.length<1){await r("至少1人才能开始~");return;}
        if(!single){
            const fl:string[]=[]; for(const p of currentGame.players){ if(p.isSystem)continue; const pd=loadPlayer(p.userId); if(!pd||getMoney(pd)<ENTRY_FEE)fl.push(p.nickname); }
            if(fl.length){await r("[错误] 金币不足"+ENTRY_FEE+"："+fl.join("、"));return;}
        }
        await startGame(ctx,r);
        return;
    }

    // 猜鱼
    if(currentGame&&currentGame.isActive){ await doGuess(ctx,uid,args,r); return; }
    await r("未知指令，输入 "+cmd+" 查看帮助~");
}
