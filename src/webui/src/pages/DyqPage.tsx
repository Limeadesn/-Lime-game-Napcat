import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig } from '../types'

export default function DyqPage() {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [saving, setSaving] = useState(false)
    const [fishText, setFishText] = useState('')
    const [npcText, setNpcText] = useState('')

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) {
                setConfig(res.data)
                setFishText((res.data.dyqConfig?.fishPool ?? []).join('\n'))
                setNpcText((res.data.dyqConfig?.npcNames ?? []).join('\n'))
            }
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const save = useCallback(async () => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = {
                ...config,
                dyqConfig: {
                    fishPool: fishText.split('\n').map(s => s.trim()).filter(s => s),
                    npcNames: npcText.split('\n').map(s => s.trim()).filter(s => s),
                }
            }
            await noAuthFetch('/config', { method: 'POST', body: JSON.stringify(newConfig) })
            setConfig(newConfig)
            showToast('配置已保存', 'success')
        } catch { showToast('保存失败', 'error') }
        finally { setSaving(false) }
    }, [config, fishText, npcText])

    if (!config) return <div className="flex items-center justify-center h-64"><div className="loading-spinner text-primary" /></div>

    return (
        <div className="space-y-4">
            <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">鱼池（每行一条鱼）</h3>
                <textarea className="input-field w-full h-40 font-mono text-xs" value={fishText} onChange={e => setFishText(e.target.value)} />
            </div>
            <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">NPC 名字（每行一个）</h3>
                <textarea className="input-field w-full h-32 font-mono text-xs" value={npcText} onChange={e => setNpcText(e.target.value)} />
            </div>
            <button onClick={save} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-brand-600 transition-colors">保存设置</button>
            {saving && <span className="text-xs text-gray-400 ml-2">保存中...</span>}
        </div>
    )
}
