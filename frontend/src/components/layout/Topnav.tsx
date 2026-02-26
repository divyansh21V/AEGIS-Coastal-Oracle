import { useAegisStore, type Role } from '../../store'
import { Bell, ChevronDown, Sun, Moon } from 'lucide-react'

const ROLE_COLORS: Record<Role, string> = {
    CIVILIAN: 'var(--cyan-500)',
    RESPONDER: 'var(--amber-500)',
    GOVERNMENT: 'var(--purple-500)',
}

export default function Topnav() {
    const { role, setRole, alerts, lastSync, weatherSync, climateLatency, atmosphericPressure, theme, toggleTheme } = useAegisStore()
    const unreadCount = alerts.filter(a => !a.read).length
    const hasC = alerts.some(a => a.severity === 'CRITICAL' && !a.read)
    const syncAgo = ((Date.now() - lastSync) / 1000).toFixed(1)

    const cycleRole = () => {
        const roles: Role[] = ['CIVILIAN', 'RESPONDER', 'GOVERNMENT']
        const next = roles[(roles.indexOf(role) + 1) % roles.length]
        setRole(next)
    }

    return (
        <header style={{
            height: 64,
            position: 'fixed',
            top: 0, left: 0, right: 0,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center',
            padding: '0 24px',
            zIndex: 1000,
            transition: 'background var(--transition-base), border-color var(--transition-base)',
        }}>
            {/* Left — Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260 }}>
                <div style={{
                    width: 42, height: 42,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-void)', borderRadius: 10, border: '1px solid var(--border-subtle)',
                    overflow: 'hidden', padding: 4
                }}>
                    <img src="/logo.png" alt="AEGIS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            fontFamily: 'var(--font-display)', fontWeight: 800,
                            fontSize: 'var(--text-xl)', color: 'var(--text-primary)',
                            letterSpacing: '-0.02em', lineHeight: 1,
                        }}>AEGIS</div>
                        <span style={{
                            fontSize: 10, fontWeight: 800, color: 'var(--cyan-500)',
                            background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4,
                            border: '1px solid rgba(6,182,212,0.2)', fontFamily: 'var(--font-mono)'
                        }}>V 1.0</span>
                    </div>
                    <div style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginTop: 2
                    }}>Cloud-Native Crisis Engine</div>
                </div>
            </div>

            {/* Center — Live Indicator */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="live-indicator" style={{
                        background: weatherSync === 'ACTIVE' ? 'var(--emerald-500)' : 'var(--amber-500)',
                        boxShadow: weatherSync === 'ACTIVE' ? '0 0 8px var(--emerald-500)' : 'none'
                    }}>{weatherSync === 'ACTIVE' ? 'WEATHER SYNC: ACTIVE' : 'SYNCING...'}</div>
                </div>

                <div style={{ height: 16, width: 1, background: 'var(--border-subtle)' }} />

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pressure (hPa)</span>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{atmosphericPressure}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Inference Latency</span>
                        <span style={{ fontSize: 13, color: 'var(--cyan-400)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{climateLatency}ms</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Heartbeat</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{syncAgo}s</span>
                    </div>
                </div>
            </div>

            {/* Right — Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 240, justifyContent: 'flex-end' }}>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        width: 34,
                        height: 34,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        transition: 'var(--transition-fast)',
                    }}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Alert Bell */}
                <button
                    style={{
                        position: 'relative', background: 'none', border: 'none',
                        cursor: 'pointer', padding: 6,
                    }}
                    title="Alerts"
                >
                    <Bell size={20} color={hasC ? 'var(--red-400)' : 'var(--text-secondary)'}
                        style={hasC ? { animation: 'alert-pulse 2s infinite' } : {}} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: 'var(--red-600)', color: 'white',
                            fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: hasC ? 'alert-pulse 2s infinite' : 'none',
                        }}>{unreadCount}</span>
                    )}
                </button>

                {/* Role Selector */}
                <button
                    onClick={cycleRole}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px',
                        background: 'var(--bg-card)',
                        border: `1px solid ${ROLE_COLORS[role]}`,
                        borderRadius: 'var(--radius-sm)',
                        color: ROLE_COLORS[role],
                        fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                        cursor: 'pointer',
                        transition: 'var(--transition-base)',
                    }}
                >
                    {role}
                    <ChevronDown size={12} />
                </button>

                {/* User Avatar */}
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)',
                }}>OP</div>
            </div>
        </header>
    )
}
