/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    commandPrefix: '#cmd',
    cooldownSeconds: 60,
    groupConfigs: {},

    // 自然平衡
    moodRegenPerCycle: 1,
    moodRegenCycleHours: 4,
    healthRegenPerCycle: 1,
    healthRegenCycleHours: 4,
    regenTarget: 70,
    regenMinThreshold: 20,

    // 奖惩阈值
    highMoodThreshold: 85,
    lowMoodThreshold: 40,
    lowHealthThreshold: 40,

    // 今日人品默认事件
    jrrpConfig: {
        fortunes: [
            { min: 1, max: 1, name: '大凶', events: [
                { name: '飞走的钱', description: '一阵大风刮走了你钱包里的一张红色的纸，起初你没在意，但是似乎那是你的钱……', goldChange: -100, moodChange: -10, healthChange: 0, freePointChange: 0 },
                { name: '拼好饭', description: '你今天吃的外卖可能是廉价预制菜……', goldChange: 0, moodChange: -20, healthChange: -20, freePointChange: 0 }
            ]},
            { min: 2, max: 3, name: '凶', events: [
                { name: '错过公交', description: '公交车司机没有等你直接就走了， 你只能打车，好过分', goldChange: -20, moodChange: -10, healthChange: 0, freePointChange: 0 },
                { name: '忘记带伞', description: '出门忘记带伞，被雨淋了，朋友问你是不是在湿身诱惑，你只感觉不舒服', goldChange: 0, moodChange: -10, healthChange: -10, freePointChange: 0 }
            ]},
            { min: 4, max: 7, name: '小凶', events: [
                { name: '哈基米', description: '路过的哈基米朝你哈气了，你感觉很不爽', goldChange: 0, moodChange: -5, healthChange: 0, freePointChange: 0 },
                { name: '天气不好', description: '天气不是很好，你心情也变差了一点', goldChange: 0, moodChange: -5, healthChange: 0, freePointChange: 0 }
            ]},
            { min: 8, max: 13, name: '平乐', events: [
                { name: '刮刮乐', description: '走在路上捡到了刮刮乐，虽然只有一点小钱，但是它没有被兑换', goldChange: 5, moodChange: 1, healthChange: 0, freePointChange: 0 },
                { name: '天气不错', description: '天气似乎还不错，你的心情也好了一点', goldChange: 0, moodChange: 2, healthChange: 0, freePointChange: 0 }
            ]},
            { min: 14, max: 17, name: '小吉', events: [
                { name: '捡到零钱', description: '在路上捡到了零钱，没人看见就是你的了呢', goldChange: 20, moodChange: 5, healthChange: 0, freePointChange: 0 },
                { name: '收到点赞', description: '发的动态收到了很多点赞，好开心', goldChange: 0, moodChange: 5, healthChange: 0, freePointChange: 0 }
            ]},
            { min: 18, max: 19, name: '吉', events: [
                { name: '良心外卖', description: '点的外卖非常好吃，性价比还高，开心', goldChange: 0, moodChange: 10, healthChange: 3, freePointChange: 0 },
                { name: '天气很好', description: '天气非常好，天空非常美，心里也很开心', goldChange: 0, moodChange: 13, healthChange: 0, freePointChange: 0 }
            ]},
            { min: 20, max: 20, name: '大吉', events: [
                { name: '彩票中奖', description: '买的彩票中奖了！', goldChange: 100, moodChange: 15, healthChange: 0, freePointChange: 0 },
                { name: '突发奇想', description: '你觉得把草莓酱加到土豆泥里混合老干妈是个好主意，不过结果是你觉得脑子里蒙蒙的', goldChange: -50, moodChange: -10, healthChange: -10, freePointChange: 1 }
            ]}
        ]
    },

    // 钓鱼趣默认设置
    dyqConfig: {
        fishPool: ["幽匿鳟鱼","冰霜鳕鱼","岩浆鳗鱼","死眼比目鱼","冰冻罗非鱼","霓虹锦鲤","暗影鱼","填充草药鱼","兔兔鱼","克苏鲁眼鱼","坠落星鱼","臭鳜鱼","西湖醋鱼","向日葵锦鲤","传说鱼王","博比特虫","黑曜石鱼","闪耀锦鲤","萨卡班甲鱼","Gura小鲨鱼","寰宇星鱼","七星鱼","银鱼","金鱼","雷管鱼"],
        npcNames: ["艾薇医生","格拉迪亚图斯","召唤师","神秘渔夫","戴维","巫妖王","疫医","海伦凯勒","威利","老人与海的老人"],
    },
};

/**
 * 构建 WebUI 配置 Schema
 *
 * 使用 ctx.NapCatConfig 提供的构建器方法生成配置界面：
 *   - boolean(key, label, defaultValue?, description?, reactive?)  → 开关
 *   - text(key, label, defaultValue?, description?, reactive?)     → 文本输入
 *   - number(key, label, defaultValue?, description?, reactive?)   → 数字输入
 *   - select(key, label, options, defaultValue?, description?)     → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content)     → 自定义 HTML 展示（不保存值）
 *   - plainText(content) → 纯文本说明
 *   - combine(...items)  → 组合多个配置项为 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: #FB7299; border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">Lime Game</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">QQ 群聊角色扮演游戏插件，包含角色养成、打工历练、商店购物等玩法</p>
            </div>
        `),
        // 全局开关
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),
        // 调试模式
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志'),
        // 命令前缀
        ctx.NapCatConfig.text('commandPrefix', '命令前缀', '#cmd', '触发命令的前缀，默认为 #cmd'),
        // 冷却时间
        ctx.NapCatConfig.number('cooldownSeconds', '冷却时间（秒）', 60, '同一命令请求冷却时间，0 表示不限制'),

        // 分隔：自然平衡
        ctx.NapCatConfig.html(`
            <h4 style="margin: 20px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #FB7299; color: #FB7299; font-size: 15px; font-weight: 600;">自然平衡</h4>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #888;">玩家每次加载数据时，按固定周期自动恢复心情与健康</p>
        `),
        ctx.NapCatConfig.number('regenTarget', '恢复目标值', 70, '心情/健康自然恢复的目标值'),
        ctx.NapCatConfig.number('regenMinThreshold', '最低触发阈值', 20, '健康低于此值时不触发自然恢复（需看医生）'),
        ctx.NapCatConfig.number('moodRegenPerCycle', '心情每周期恢复量', 1, '每个周期恢复的心情点数'),
        ctx.NapCatConfig.number('moodRegenCycleHours', '心情恢复周期（小时）', 4, '心情自然恢复的间隔时间'),
        ctx.NapCatConfig.number('healthRegenPerCycle', '健康每周期恢复量', 1, '每个周期恢复的健康点数'),
        ctx.NapCatConfig.number('healthRegenCycleHours', '健康恢复周期（小时）', 4, '健康自然恢复的间隔时间'),

        // 分隔：奖惩阈值
        ctx.NapCatConfig.html(`
            <h4 style="margin: 20px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #FB7299; color: #FB7299; font-size: 15px; font-weight: 600;">奖惩阈值</h4>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #888;">心情/健康达到阈值时触发属性增益或减益</p>
        `),
        ctx.NapCatConfig.number('highMoodThreshold', '高心情阈值', 85, '心情 >= 此值时触发魅力/幸运增益'),
        ctx.NapCatConfig.number('lowMoodThreshold', '低心情阈值', 40, '心情 <= 此值时触发魅力/幸运减益'),
        ctx.NapCatConfig.number('lowHealthThreshold', '低健康阈值', 40, '健康 <= 此值时触发力量/敏捷/智慧减益')
    );
}
