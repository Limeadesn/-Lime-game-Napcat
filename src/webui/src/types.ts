/** WebUI 前端类型定义 */

export interface PluginStatus {
    pluginName: string
    uptime: number
    uptimeFormatted: string
    config: PluginConfig
    stats: {
        processed: number
        todayProcessed: number
        lastUpdateDay: string
    }
}

export interface PluginConfig {
    enabled: boolean
    debug: boolean
    commandPrefix: string
    cooldownSeconds: number
    groupConfigs?: Record<string, GroupConfig>
    // 自然平衡
    moodRegenPerCycle: number
    moodRegenCycleHours: number
    healthRegenPerCycle: number
    healthRegenCycleHours: number
    regenTarget: number
    regenMinThreshold: number
    // 奖惩阈值
    highMoodThreshold: number
    lowMoodThreshold: number
    lowHealthThreshold: number
    // 今日人品
    jrrpConfig?: JrrpConfig
    // 钓鱼趣
    dyqConfig?: DyqConfig
}

export interface JrrpEvent {
    name: string
    description: string
    goldChange: number
    moodChange: number
    healthChange: number
    freePointChange: number
}

export interface JrrpFortune {
    min: number
    max: number
    name: string
    events: JrrpEvent[]
}

export interface JrrpConfig {
    fortunes: JrrpFortune[]
}

export interface GroupConfig {
    enabled?: boolean
    jrrpEnabled?: boolean
}

export interface GroupInfo {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
    enabled: boolean
}

export interface ApiResponse<T = unknown> {
    code: number
    data?: T
    message?: string
}
