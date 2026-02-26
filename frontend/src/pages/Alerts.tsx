import { useState } from 'react'
import { useAegisStore } from '../store'
import { Bell, Check, Clock, Search } from 'lucide-react'

export default function Alerts() {
    const { alerts } = useAegisStore()
    const [filter, setFilter] = useState<string>('ALL')
    const [searchTerm, setSearchTerm] = useState('')

    const filtered = alerts.filter(a => {
        if (filter !== 'ALL' && a.severity !== filter) return false
        if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !a.zone.toLowerCase().includes(searchTerm.toLowerCase())) return false
        return true
    })

    const SEVERITY_ORDER = ['CRITICAL', 'SEVERE', 'MODERATE', 'LOW']
    const counts: Record<string, number> = { ALL: alerts.length }
    SEVERITY_ORDER.forEach(s => counts[s] = alerts.filter(a => a.severity === s).length)

    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
                        fontWeight: 700, marginBottom: 4,
                    }}>Alert Center</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        Flood alerts, warnings, and notifications
                    </p>
                </div>
                <button className="btn btn--primary"><Bell size={14} /> Mark All Read</button>
            </div>

            {/* Filter Tabs + Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
                    {['ALL', ...SEVERITY_ORDER].map(s => (
                        <button key={s} onClick={() => setFilter(s)} style={{
                            padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-xs)',
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                            transition: 'var(--transition-fast)',
                            background: filter === s ? (
                                s === 'CRITICAL' ? 'var(--red-600)' :
                                    s === 'SEVERE' ? 'var(--orange-500)' :
                                        s === 'MODERATE' ? 'var(--amber-500)' :
                                            s === 'LOW' ? 'var(--green-500)' : 'var(--cyan-500)'
                            ) : 'transparent',
                            color: filter === s ? (s === 'MODERATE' || s === 'AMBER' ? 'var(--bg-void)' : 'white') : 'var(--text-secondary)',
                        }}>
                            {s} ({counts[s]})
                        </button>
                    ))}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{
                        position: 'absolute', top: 10, left: 12, color: 'var(--text-muted)',
                    }} />
                    <input className="input" style={{ paddingLeft: 34, width: 200 }}
                        placeholder="Search alerts..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Alert List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {filtered.map(alert => (
                    <div key={alert.id} className={`alert-row alert-row--${alert.severity.toLowerCase()}`}
                        style={{
                            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                            opacity: alert.read ? 0.65 : 1,
                            cursor: 'pointer',
                        }}>
                        {/* Severity indicator */}
                        <div style={{ paddingTop: 2 }}>
                            <span className={`badge badge--${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                                fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4,
                            }}>{alert.title}</div>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>
                                {alert.description}
                            </p>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={10} /> {alert.time}
                                </span>
                                <span>{alert.zone}</span>
                            </div>
                        </div>

                        {/* Read status */}
                        <div style={{ paddingTop: 4 }}>
                            {alert.read ? (
                                <Check size={16} color="var(--text-muted)" />
                            ) : (
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: 'var(--cyan-500)',
                                }} />
                            )}
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: 'var(--space-12)',
                        color: 'var(--text-muted)',
                    }}>
                        No alerts match current filters
                    </div>
                )}
            </div>
        </div>
    )
}
