import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAegisStore, type Role } from '../store'
import { Monitor, Bell, Map, Shield, Save, RotateCcw, Globe, LogOut } from 'lucide-react'

export default function Settings() {
    const navigate = useNavigate()
    const { role, setRole, theme, toggleTheme, logout } = useAegisStore()
    const [mapDefault, setMapDefault] = useState('dark')
    const [units, setUnits] = useState('metric')
    const [notifSound, setNotifSound] = useState(true)
    const [criticalFlash, setCriticalFlash] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [refreshRate, setRefreshRate] = useState(5)
    const [lang, setLang] = useState('en')

    const handleRoleChange = (newRole: Role) => {
        if (newRole !== role) {
            setRole(newRole)
            logout()
            navigate('/login')
        }
    }

    const Toggle = ({ on, toggle }: { on: boolean; toggle: () => void }) => (
        <button onClick={toggle} style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: on ? 'var(--cyan-500)' : 'var(--bg-elevated)',
            position: 'relative', transition: 'var(--transition-fast)',
        }}>
            <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: on ? 23 : 3, transition: 'left 0.2s ease',
            }} />
        </button>
    )

    const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={16} color="var(--cyan-500)" />
                    <span className="card__title">{title}</span>
                </div>
            </div>
            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {children}
            </div>
        </div>
    )

    const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{label}</div>
                {desc && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
            </div>
            {children}
        </div>
    )

    const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) => (
        <select value={value} onChange={e => onChange(e.target.value)} style={{
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
            padding: '6px 12px', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)',
            cursor: 'pointer',
        }}>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
    )

    return (
        <div className="page-enter" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 700, marginBottom: 4 }}>Settings</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Configure AEGIS platform preferences</p>
            </div>

            <Section icon={Monitor} title="Display">
                <Row label="System Theme" desc="Toggle between Light and Dark interface">
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-void)', padding: 4, borderRadius: 'var(--radius-sm)' }}>
                        {['dark', 'light'].map(t => (
                            <button
                                key={t}
                                onClick={() => theme !== t && toggleTheme()}
                                style={{
                                    padding: '6px 16px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-xs)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    background: theme === t ? 'var(--cyan-500)' : 'transparent',
                                    color: theme === t ? 'var(--text-inverse)' : 'var(--text-secondary)',
                                    transition: 'var(--transition-fast)',
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </Row>
                <Row label="Measurement Units">
                    <Select value={units} onChange={setUnits} options={[{ v: 'metric', l: 'Metric (m, km)' }, { v: 'imperial', l: 'Imperial (ft, mi)' }]} />
                </Row>
                <Row label="Language">
                    <Select value={lang} onChange={setLang} options={[{ v: 'en', l: 'English' }, { v: 'hi', l: 'हिन्दी' }, { v: 'mr', l: 'मराठी' }]} />
                </Row>
            </Section>

            <Section icon={Map} title="Map Preferences">
                <Row label="Default Map View">
                    <Select value={mapDefault} onChange={setMapDefault} options={[
                        { v: 'dark', l: 'Dark' }, { v: 'satellite', l: 'Satellite' },
                        { v: 'street', l: 'Street' }, { v: 'terrain', l: 'Terrain' },
                    ]} />
                </Row>
                <Row label="Auto-Refresh Data" desc="Automatically pull latest sensor data">
                    <Toggle on={autoRefresh} toggle={() => setAutoRefresh(!autoRefresh)} />
                </Row>
                {autoRefresh && (
                    <Row label="Refresh Interval">
                        <Select value={String(refreshRate)} onChange={v => setRefreshRate(Number(v))} options={[
                            { v: '2', l: '2 seconds' }, { v: '5', l: '5 seconds' },
                            { v: '10', l: '10 seconds' }, { v: '30', l: '30 seconds' },
                        ]} />
                    </Row>
                )}
            </Section>

            <Section icon={Bell} title="Notifications">
                <Row label="Audio Alerts" desc="Play sound for incoming alerts">
                    <Toggle on={notifSound} toggle={() => setNotifSound(!notifSound)} />
                </Row>
                <Row label="Critical Alert Flash" desc="Flash screen border on CRITICAL severity">
                    <Toggle on={criticalFlash} toggle={() => setCriticalFlash(!criticalFlash)} />
                </Row>
            </Section>

            <Section icon={Shield} title="Access & Role">
                <Row label="Current Role">
                    <Select value={role} onChange={v => handleRoleChange(v as Role)} options={[
                        { v: 'CIVILIAN', l: 'Civilian' }, { v: 'RESPONDER', l: 'First Responder' },
                        { v: 'GOVERNMENT', l: 'Government' },
                    ]} />
                </Row>
                <Row label="Session" desc="Operator: admin@aegis.gov">
                    <button className="btn btn--ghost" style={{ fontSize: 11 }} onClick={() => { logout(); navigate('/login'); }}>
                        <LogOut size={12} style={{ marginRight: 6 }} /> Sign Out
                    </button>
                </Row>
            </Section>

            <Section icon={Globe} title="Data & Privacy">
                <Row label="Location Sharing" desc="Share your coordinates with command">
                    <Toggle on={true} toggle={() => { }} />
                </Row>
                <Row label="Telemetry" desc="Help improve AEGIS with usage data">
                    <Toggle on={true} toggle={() => { }} />
                </Row>
            </Section>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button className="btn btn--ghost"><RotateCcw size={14} /> Reset Defaults</button>
                <button className="btn btn--primary"><Save size={14} /> Save Settings</button>
            </div>
        </div>
    )
}
