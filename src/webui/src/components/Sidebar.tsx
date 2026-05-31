import type { PageId } from '../App'
import { useState } from 'react'
import { IconDashboard, IconSettings, IconGroup, IconGithub, IconPlugin, IconSun, IconChevronDown, IconActivity } from './icons'

interface SidebarProps {
    currentPage: PageId
    onPageChange: (page: PageId) => void
}

const menuItems: { id: PageId; label: string; icon: React.ReactNode; children?: { id: PageId; label: string }[] }[] = [
    { id: 'status', label: '仪表盘', icon: <IconDashboard size={18} /> },
    {
        id: 'config/basic', label: '插件配置', icon: <IconSettings size={18} />,
        children: [
            { id: 'config/basic', label: '基础配置' },
            { id: 'config/balance', label: '自然平衡' },
            { id: 'config/threshold', label: '奖惩阈值' },
        ],
    },
    { id: 'groups', label: '群管理', icon: <IconGroup size={18} /> },
    { id: 'jrrp', label: '今日人品', icon: <IconActivity size={18} /> },
    { id: 'dyq', label: '钓鱼趣设置', icon: <IconActivity size={18} /> },
]

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
    const [expanded, setExpanded] = useState(true)

    return (
        <aside className="w-60 flex-shrink-0 bg-white dark:bg-[#1a1b1d] border-r border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Logo */}
            <div className="px-5 py-6 flex items-center gap-3">
                <div className="sidebar-logo w-8 h-8 flex items-center justify-center bg-brand-500 rounded-lg text-white">
                    <IconPlugin size={18} />
                </div>
                <div>
                    <h1 className="font-bold text-sm leading-tight text-gray-900 dark:text-white">酸柠的游戏</h1>
                    <p className="text-[10px] text-gray-400 font-medium tracking-wider">GAME PLUGIN</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto nav-stagger">
                {menuItems.map((item) => {
                    if (item.children) {
                        const isConfigActive = currentPage.startsWith('config/')
                        return (
                            <div key={item.id}>
                                <div
                                    className={`sidebar-item ${isConfigActive ? 'active' : ''}`}
                                    onClick={() => setExpanded(!expanded)}
                                >
                                    <span className="sidebar-icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                    <span className={`ml-auto transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                                        <IconChevronDown size={14} />
                                    </span>
                                </div>
                                {expanded && (
                                    <div className="ml-4 mt-0.5 space-y-0.5">
                                        {item.children.map((child) => (
                                            <div
                                                key={child.id}
                                                className={`sidebar-item text-sm ${currentPage === child.id ? 'active' : ''}`}
                                                onClick={() => onPageChange(child.id)}
                                            >
                                                <span>{child.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }
                    return (
                        <div
                            key={item.id}
                            className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
                            onClick={() => onPageChange(item.id)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </div>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 pb-2">
                <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sidebar-item no-underline"
                >
                    <IconGithub size={18} />
                    <span>反馈问题</span>
                </a>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-center w-full py-2 rounded-lg text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-default text-xs gap-2">
                    <IconSun size={14} className="opacity-60" />
                    <span>跟随系统主题</span>
                </div>
            </div>
        </aside>
    )
}
