import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ToastContainer from './components/ToastContainer'
import StatusPage from './pages/StatusPage'
import ConfigPage from './pages/ConfigPage'
import GroupsPage from './pages/GroupsPage'
import JrrpPage from './pages/JrrpPage'
import DyqPage from './pages/DyqPage'
import { useStatus } from './hooks/useStatus'
import { useTheme } from './hooks/useTheme'

export type PageId = 'status' | 'config/basic' | 'config/balance' | 'config/threshold' | 'groups' | 'jrrp' | 'dyq'

type ConfigTab = 'basic' | 'balance' | 'threshold'

const pageConfig: Record<PageId, { title: string; desc: string }> = {
    status: { title: '仪表盘', desc: '插件运行状态与数据概览' },
    'config/basic': { title: '基础配置', desc: '全局开关与基础参数' },
    'config/balance': { title: '自然平衡', desc: '心情与健康的自动恢复规则' },
    'config/threshold': { title: '奖惩阈值', desc: '属性增益与减益的触发条件' },
    groups: { title: '群管理', desc: '管理群的启用与禁用' },
    jrrp: { title: '今日人品', desc: '自定义各运势等级的效果与提示' },
    dyq: { title: '钓鱼趣设置', desc: '自定义鱼池和NPC名字' }
}

function configTabFromPage(page: PageId): ConfigTab | null {
    if (page === 'config/basic') return 'basic'
    if (page === 'config/balance') return 'balance'
    if (page === 'config/threshold') return 'threshold'
    return null
}

function App() {
    const [currentPage, setCurrentPage] = useState<PageId>('status')
    const [isScrolled, setIsScrolled] = useState(false)
    const { status, fetchStatus } = useStatus()

    useTheme()

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 5000)
        return () => clearInterval(interval)
    }, [fetchStatus])

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 10)
    }

    const renderPage = () => {
        const tab = configTabFromPage(currentPage)
        if (tab) return <ConfigPage tab={tab} />
        switch (currentPage) {
            case 'status': return <StatusPage status={status} onRefresh={fetchStatus} />
            case 'groups': return <GroupsPage />
            case 'jrrp': return <JrrpPage />
            case 'dyq': return <DyqPage />
            default: return <StatusPage status={status} onRefresh={fetchStatus} />
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8f9fa] dark:bg-[#18191C] text-gray-800 dark:text-gray-200 transition-colors duration-300">
            <ToastContainer />
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                    <Header
                        title={pageConfig[currentPage].title}
                        description={pageConfig[currentPage].desc}
                        isScrolled={isScrolled}
                        status={status}
                        currentPage={currentPage}
                    />
                    <div className="px-4 md:px-8 pb-8">
                        <div key={currentPage} className="page-enter">
                            {renderPage()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default App
