import { useAegisStore } from '../../store'
import { useLocation, Link } from 'react-router-dom'
import {
    LayoutDashboard, Map, Plane, Brain, Bell,
    Mountain, Users, Package, Settings, AlertTriangle, Cpu
} from 'lucide-react'

const NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/map', label: 'Live Map', icon: Map, dot: true },
    { path: '/drones', label: 'Drone Fleet', icon: Plane, count: 3 },
    { path: '/analytics', label: 'AI Prediction', icon: Brain },
    { path: '/alerts', label: 'Alerts', icon: Bell, countKey: 'alerts' as const },
    { path: '/photogrammetry', label: 'Photogrammetry', icon: Mountain },
    { path: '/stakeholders', label: 'Stakeholders', icon: Users },
    { path: '/resources', label: 'Resources', icon: Package },
]

export default function Sidebar() {
    const location = useLocation()
    const alerts = useAegisStore(s => s.alerts)
    const unreadAlerts = alerts.filter(a => !a.read).length

    return (
        <aside style={{
            width: 240,
            position: 'fixed',
            top: 64,
            bottom: 0,
            left: 0,
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 900,
            overflowY: 'auto',
        }}>
            {/* Mission Status Card */}
            <div style={{
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--border-subtle)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                }}>
                    <AlertTriangle size={14} color="var(--red-500)" />
                    <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                        color: 'var(--text-danger)',
                    }}>ACTIVE EVENT</span>
                </div>
                <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)',
                    fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4,
                }}>FLOOD EVENT 2024-0A</div>
                <span className="badge badge--critical" style={{ marginRight: 6 }}>CRITICAL</span>
                <span style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                }}>Active 2h 34m</span>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: 'var(--space-2) 0' }}>
                {NAV_ITEMS.map(item => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon
                    const badgeCount = item.label === 'Alerts' ? unreadAlerts : item.count

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 20px',
                                borderLeft: isActive ? '3px solid var(--cyan-500)' : '3px solid transparent',
                                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                textDecoration: 'none',
                                fontSize: 'var(--text-base)',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'var(--transition-fast)',
                                position: 'relative',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'var(--bg-card)'
                                    e.currentTarget.style.color = 'var(--text-primary)'
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                }
                            }}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                            {item.dot && (
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: 'var(--cyan-500)', boxShadow: 'var(--glow-cyan)',
                                    animation: 'pulse-live 1.5s ease-in-out infinite',
                                }} />
                            )}
                            {badgeCount && badgeCount > 0 && (
                                <span style={{
                                    marginLeft: 'auto',
                                    background: item.label === 'Alerts' ? 'var(--red-600)' : 'var(--cyan-600)',
                                    color: 'white', fontSize: 10, fontWeight: 700,
                                    padding: '1px 6px', borderRadius: 'var(--radius-full)',
                                    fontFamily: 'var(--font-mono)',
                                }}>{badgeCount}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Settings */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-2) 0' }}>
                <Link to="/settings" style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 20px', color: 'var(--text-muted)',
                    textDecoration: 'none', fontSize: 'var(--text-base)',
                    transition: 'var(--transition-fast)',
                }}>
                    <Settings size={18} />
                    <span>Settings</span>
                </Link>
            </div>

            {/* v 1.0 Attribution */}
            <div style={{
                padding: 'var(--space-4) 20px',
                borderTop: '1px dashed var(--border-subtle)',
                display: 'flex', alignItems: 'center', gap: 10
            }}>
                <div style={{ color: 'var(--cyan-600)' }}><Cpu size={14} /></div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    AEGIS KERNEL <span style={{ color: 'var(--text-secondary)' }}>v 1.0</span>
                </div>
            </div>
        </aside>
    )
}
