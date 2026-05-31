import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig } from '../types'
import { IconTerminal } from '../components/icons'

export default function ConfigPage({ tab }: { tab: 'basic' | 'balance' | 'threshold' }) {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) setConfig(res.data)
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const saveConfig = useCallback(async (update: Partial<PluginConfig>) => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = { ...config, ...update }
            await noAuthFetch('/config', {
                method: 'POST',
                body: JSON.stringify(newConfig),
            })
            setConfig(newConfig)
            showToast('配置已保存', 'success')
        } catch {
            showToast('保存失败', 'error')
        } finally {
            setSaving(false)
        }
    }, [config])

    const updateField = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) => {
        if (!config) return
        const updated = { ...config, [key]: value }
        setConfig(updated)
        saveConfig({ [key]: value })
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载配置中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 stagger-children">
            {/* 基础配置 */}
            {tab === 'basic' && (
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconTerminal size={16} className="text-gray-400" />
                    基础配置
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用插件"
                        desc="全局开关，关闭后不响应任何命令"
                        checked={config.enabled}
                        onChange={(v) => updateField('enabled', v)}
                    />
                    <ToggleRow
                        label="调试模式"
                        desc="启用后输出详细日志到控制台"
                        checked={config.debug}
                        onChange={(v) => updateField('debug', v)}
                    />
                    <InputRow
                        label="命令前缀"
                        desc="触发命令的前缀"
                        value={config.commandPrefix}
                        onChange={(v) => updateField('commandPrefix', v)}
                    />
                    <InputRow
                        label="冷却时间 (秒)"
                        desc="同一命令请求冷却时间，0 表示不限制"
                        value={String(config.cooldownSeconds)}
                        type="number"
                        onChange={(v) => updateField('cooldownSeconds', Number(v) || 0)}
                    />
                </div>
            </div>
            )}

            {/* 自然平衡 */}
            {tab === 'balance' && (
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconTerminal size={16} className="text-gray-400" />
                    自然平衡
                </h3>
                <div className="space-y-5">
                    <InputRow
                        label="恢复目标值"
                        desc="心情/健康自然恢复的目标值"
                        value={String(config.regenTarget)}
                        type="number"
                        onChange={(v) => updateField('regenTarget', Number(v) || 0)}
                    />
                    <InputRow
                        label="最低触发阈值"
                        desc="健康低于此值时不触发自然恢复（需看医生）"
                        value={String(config.regenMinThreshold)}
                        type="number"
                        onChange={(v) => updateField('regenMinThreshold', Number(v) || 0)}
                    />
                    <InputRow
                        label="心情每周期恢复量"
                        desc="每个周期恢复的心情点数"
                        value={String(config.moodRegenPerCycle)}
                        type="number"
                        onChange={(v) => updateField('moodRegenPerCycle', Number(v) || 0)}
                    />
                    <InputRow
                        label="心情恢复周期（小时）"
                        desc="心情自然恢复的间隔时间"
                        value={String(config.moodRegenCycleHours)}
                        type="number"
                        onChange={(v) => updateField('moodRegenCycleHours', Number(v) || 0)}
                    />
                    <InputRow
                        label="健康每周期恢复量"
                        desc="每个周期恢复的健康点数"
                        value={String(config.healthRegenPerCycle)}
                        type="number"
                        onChange={(v) => updateField('healthRegenPerCycle', Number(v) || 0)}
                    />
                    <InputRow
                        label="健康恢复周期（小时）"
                        desc="健康自然恢复的间隔时间"
                        value={String(config.healthRegenCycleHours)}
                        type="number"
                        onChange={(v) => updateField('healthRegenCycleHours', Number(v) || 0)}
                    />
                </div>
            </div>
            )}

            {/* 奖惩阈值 */}
            {tab === 'threshold' && (
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconTerminal size={16} className="text-gray-400" />
                    奖惩阈值
                </h3>
                <div className="space-y-5">
                    <InputRow
                        label="高心情阈值"
                        desc="心情 >= 此值时触发魅力/幸运增益"
                        value={String(config.highMoodThreshold)}
                        type="number"
                        onChange={(v) => updateField('highMoodThreshold', Number(v) || 0)}
                    />
                    <InputRow
                        label="低心情阈值"
                        desc="心情 <= 此值时触发魅力/幸运减益"
                        value={String(config.lowMoodThreshold)}
                        type="number"
                        onChange={(v) => updateField('lowMoodThreshold', Number(v) || 0)}
                    />
                    <InputRow
                        label="低健康阈值"
                        desc="健康 <= 此值时触发力量/敏捷/智慧减益"
                        value={String(config.lowHealthThreshold)}
                        type="number"
                        onChange={(v) => updateField('lowHealthThreshold', Number(v) || 0)}
                    />
                </div>
            </div>
            )}

            {saving && (
                <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
                    保存中...
                </div>
            )}
        </div>
    )
}

/* ---- 子组件 ---- */

function ToggleRow({ label, desc, checked, onChange }: {
    label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
            <label className="toggle">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="slider" />
            </label>
        </div>
    )
}

function InputRow({ label, desc, value, type = 'text', onChange }: {
    label: string; desc: string; value: string; type?: string; onChange: (v: string) => void
}) {
    const [local, setLocal] = useState(value)
    useEffect(() => { setLocal(value) }, [value])

    const handleBlur = () => {
        if (local !== value) onChange(local)
    }

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">{desc}</div>
            <input
                className="input-field"
                type={type}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            />
        </div>
    )
}
