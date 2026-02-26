import { Outlet } from 'react-router-dom'
import Topnav from './Topnav'
import Sidebar from './Sidebar'

export default function AppLayout() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
            <Topnav />
            <Sidebar />
            <main style={{
                marginLeft: 240,
                marginTop: 64,
                minHeight: 'calc(100vh - 64px)',
                background: 'var(--bg-base)',
                padding: 'var(--space-8)',
            }}>
                <Outlet />
            </main>
        </div>
    )
}
