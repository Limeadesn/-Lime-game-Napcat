/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 *
 * 注意：OneBot 相关类型（OB11Message, OB11PostSendMsg 等）
 * 以及插件框架类型（NapCatPluginContext, PluginModule 等）
 * 均来自 napcat-types 包，无需在此重复定义。
 */

// ==================== 插件配置 ====================

/**
 * 插件主配置接口
 * 在此定义你的插件所需的所有配置项
 */
export interface PluginConfig {
    /** 全局开关：是否启用插件功能 */
    enabled: boolean;
    /** 调试模式：启用后输出详细日志 */
    debug: boolean;
    /** 触发命令前缀，默认为 #cmd */
    commandPrefix: string;
    /** 同一命令请求冷却时间（秒），0 表示不限制 */
    cooldownSeconds: number;
    /** 按群的单独配置 */
    groupConfigs: Record<string, GroupConfig>;

    // ==================== 自然平衡 ====================
    /** 心情每周期恢复量（默认 1） */
    moodRegenPerCycle: number;
    /** 心情恢复周期（小时，默认 4） */
    moodRegenCycleHours: number;
    /** 健康每周期恢复量（默认 1） */
    healthRegenPerCycle: number;
    /** 健康恢复周期（小时，默认 4） */
    healthRegenCycleHours: number;
    /** 自然平衡目标值（默认 70） */
    regenTarget: number;
    /** 低于此值不触发自然恢复（默认 20），强制看医生 */
    regenMinThreshold: number;

    // ==================== 奖惩阈值 ====================
    /** 高心情阈值（>= 此值触发增益，默认 85） */
    highMoodThreshold: number;
    /** 低心情阈值（<= 此值触发减益，默认 40） */
    lowMoodThreshold: number;
    /** 低健康阈值（<= 此值触发减益，默认 40） */
    lowHealthThreshold: number;

    // ==================== 今日人品 ====================
    /** 今日人品自定义配置（可选，未配则用硬编码默认） */
    jrrpConfig?: JrrpConfig;

    /** 钓鱼趣自定义配置（可选） */
    dyqConfig?: DyqConfig;
}

/**
 * 群配置
 */
export interface GroupConfig {
    /** 是否启用此群的功能（禁用后仅 jrrp 简化版可用） */
    enabled?: boolean;
}

// ==================== 今日人品配置 ====================

export interface JrrpEvent {
    name: string;
    description: string;
    goldChange: number;
    moodChange: number;
    healthChange: number;
    freePointChange: number;
}

export interface JrrpFortune {
    min: number;
    max: number;
    name: string;
    events: JrrpEvent[];
}

export interface JrrpConfig {
    fortunes: JrrpFortune[];
}

// ==================== 钓鱼趣配置 ====================

export interface DyqConfig {
    fishPool: string[];
    npcNames: string[];
}

// ==================== API 响应 ====================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    /** 状态码，0 表示成功，-1 表示失败 */
    code: number;
    /** 错误信息（仅错误时返回） */
    message?: string;
    /** 响应数据（仅成功时返回） */
    data?: T;
}
