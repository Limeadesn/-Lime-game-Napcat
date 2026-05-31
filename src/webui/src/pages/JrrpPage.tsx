import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig, JrrpFortune, JrrpEvent } from '../types'

const FORTUNE_NAMES = ['大凶', '凶', '小凶', '平乐', '小吉', '吉', '大吉']

const DEFAULT_JRRP: NonNullable<PluginConfig['jrrpConfig']> = {
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
}

export default function JrrpPage() {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [tab, setTab] = useState('大凶')
    const [saving, setSaving] = useState(false)

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) setConfig(res.data)
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const saveConfig = useCallback(async (jrrpConfig: NonNullable<PluginConfig['jrrpConfig']>) => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = { ...config, jrrpConfig }
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

    const jrrp = config?.jrrpConfig ?? DEFAULT_JRRP
    const fortune = jrrp.fortunes.find(f => f.name === tab)
        ?? { min: 1, max: 20, name: tab, events: [] }

    const updateEvents = (events: JrrpEvent[]) => {
        if (!config) return
        const current = jrrp.fortunes
        const updated = current.map(f => f.name === tab ? { ...f, events } : f)
        saveConfig({ fortunes: updated })
    }

    const addEvent = () => {
        const evt: JrrpEvent = { name: '新事件', description: '', goldChange: 0, moodChange: 0, healthChange: 0, freePointChange: 0 }
        updateEvents([...fortune.events, evt])
    }

    const removeEvent = (idx: number) => {
        const updated = fortune.events.filter((_, i) => i !== idx)
        updateEvents(updated)
    }

    const changeEvent = (idx: number, patch: Partial<JrrpEvent>) => {
        const updated = fortune.events.map((e, i) => i === idx ? { ...e, ...patch } : e)
        updateEvents(updated)
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Tab 栏 */}
            <div className="flex gap-1 bg-gray-100 dark:bg-[#1e1e20] rounded-lg p-1 flex-wrap">
                {FORTUNE_NAMES.map(name => (
                    <button
                        key={name}
                        onClick={() => setTab(name)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            tab === name
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {/* 当前运势事件列表 */}
            <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {tab} 的事件列表
                    </h3>
                    <button
                        onClick={addEvent}
                        className="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-brand-600 transition-colors"
                    >
                        + 添加事件
                    </button>
                </div>

                {fortune.events.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">暂无事件，点击上方按钮添加~</p>
                ) : (
                    <div className="space-y-4">
                        {fortune.events.map((evt, idx) => (
                            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">事件 #{idx + 1}</span>
                                    <button
                                        onClick={() => removeEvent(idx)}
                                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        删除
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">事件名</label>
                                        <input
                                            className="input-field"
                                            value={evt.name}
                                            onChange={e => changeEvent(idx, { name: e.target.value })}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs text-gray-500 mb-1 block">描述</label>
                                        <input
                                            className="input-field"
                                            value={evt.description}
                                            onChange={e => changeEvent(idx, { description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">金币变化</label>
                                        <input
                                            className="input-field"
                                            type="number"
                                            value={evt.goldChange}
                                            onChange={e => changeEvent(idx, { goldChange: Number(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">心情变化</label>
                                        <input
                                            className="input-field"
                                            type="number"
                                            value={evt.moodChange}
                                            onChange={e => changeEvent(idx, { moodChange: Number(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">健康变化</label>
                                        <input
                                            className="input-field"
                                            type="number"
                                            value={evt.healthChange}
                                            onChange={e => changeEvent(idx, { healthChange: Number(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">自由点变化</label>
                                        <input
                                            className="input-field"
                                            type="number"
                                            value={evt.freePointChange}
                                            onChange={e => changeEvent(idx, { freePointChange: Number(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {saving && (
                <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
                    保存中...
                </div>
            )}
        </div>
    )
}
