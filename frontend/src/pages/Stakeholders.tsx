import { useAegisStore, type Role } from '../store'
import {
    Users, HardHat, Landmark, ArrowRight, Shield,
    Zap, Heart, HelpingHand, MapPin,
    BarChart3, LifeBuoy, AlertCircle, CheckCircle2
} from 'lucide-react'

// Sub-component: Government Strategic Command
function GovernmentCommand() {
    const { alerts, reliefSuccessRate, coordIndex } = useAegisStore()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                {[
                    { label: 'Agency Readiness', value: '98%', icon: Shield, color: 'var(--emerald-500)' },
                    { label: 'Coordination Index', value: `${coordIndex}%`, icon: Zap, color: 'var(--purple-500)' },
                    { label: 'Relief Success', value: `${reliefSuccessRate}%`, icon: Heart, color: 'var(--cyan-500)' },
                    { label: 'Active Alerts', value: alerts.filter(a => !a.read).length, icon: AlertCircle, color: 'var(--red-500)' },
                ].map(stat => (
                    <div key={stat.label} className="metric-card" style={{ '--severity-color': stat.color } as React.CSSProperties}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div className="metric-card__label">{stat.label}</div>
                            <stat.icon size={14} color={stat.color} />
                        </div>
                        <div className="metric-card__value">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-4)' }}>
                <div className="card">
                    <div className="card__header"><span className="card__title">Strategic District Coordination</span></div>
                    <div style={{ padding: 'var(--space-4)' }}>
                        {[
                            { district: 'Mumbai City', ndrf: 4, bmc: 12, navy: 'DEVEL', status: 'CRITICAL' },
                            { district: 'Mumbai Suburban', ndrf: 6, bmc: 28, navy: 'READY', status: 'SEVERE' },
                            { district: 'Thane Region', ndrf: 2, bmc: 14, navy: 'STANDBY', status: 'MODERATE' },
                        ].map(d => (
                            <div key={d.district} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700 }}>{d.district}</span>
                                    <span className={`badge badge--${d.status.toLowerCase()}`}>{d.status}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-secondary)' }}>
                                    <span>NDRF Teams: <b style={{ color: 'var(--text-primary)' }}>{d.ndrf}</b></span>
                                    <span>BMC Assets: <b style={{ color: 'var(--text-primary)' }}>{d.bmc}</b></span>
                                    <span>Naval Command: <b style={{ color: 'var(--cyan-400)' }}>{d.navy}</b></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card__header"><span className="card__title">System Actions</span></div>
                    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="btn btn--primary" style={{ justifyContent: 'space-between' }}>
                            Issue District Directive <ArrowRight size={16} />
                        </button>
                        <button className="btn" style={{ justifyContent: 'space-between', borderColor: 'var(--purple-500)', color: 'var(--purple-400)' }}>
                            Strategic Resource Replay <Zap size={16} />
                        </button>
                        <button className="btn" style={{ justifyContent: 'space-between' }}>
                            View Agency Logs <BarChart3 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Sub-component: Civilian Resilience Portal
function CivilianResilience() {
    const { assistanceRequests } = useAegisStore()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Help Assured HUD */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                {[
                    { label: 'Assistance Provided', value: assistanceRequests + 820, icon: HelpingHand, color: 'var(--cyan-500)', sub: 'Verified across all zones' },
                    { label: 'Families Safe', value: '4,102', icon: Heart, color: 'var(--emerald-500)', sub: 'In relief & private shelters' },
                    { label: 'Verified Resources', value: '184', icon: LifeBuoy, color: 'var(--amber-500)', sub: 'Water, food, and medicine' },
                ].map(stat => (
                    <div key={stat.label} className="metric-card" style={{ '--severity-color': stat.color, padding: 'var(--space-5)' } as React.CSSProperties}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ padding: 10, background: 'var(--bg-void)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                                <stat.icon size={24} color={stat.color} />
                            </div>
                            <div>
                                <div className="metric-card__label" style={{ fontSize: 11 }}>{stat.label}</div>
                                <div className="metric-card__value" style={{ fontSize: 'var(--text-3xl)', color: stat.color }}>{stat.value}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--space-4)' }}>
                {/* Self-Reporting Card */}
                <div className="card" style={{ border: '2px solid var(--cyan-900)', background: 'linear-gradient(135deg, var(--bg-card) 0%, #083344 100%)' }}>
                    <div style={{ padding: 'var(--space-6)' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 8, color: 'var(--cyan-400)' }}>I need help / I am safe</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
                            Report your status to help AEGIS prioritize rescue and aid delivery in your area.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button className="btn btn--primary" style={{ background: 'var(--cyan-500)', color: 'var(--bg-void)', fontWeight: 700 }}>
                                <HelpingHand size={18} /> REQUEST IMMEDIATE AID (SOS)
                            </button>
                            <button className="btn" style={{ borderColor: 'var(--emerald-500)', color: 'var(--emerald-400)' }}>
                                <CheckCircle2 size={18} /> I AM SAFE / REPORTING STATUS
                            </button>
                        </div>
                    </div>
                </div>

                {/* Resilience Feed (Work Done) */}
                <div className="card">
                    <div className="card__header">
                        <span className="card__title">Local Resilience Feed (Work Done)</span>
                        <span style={{ fontSize: 10, color: 'var(--emerald-400)', fontWeight: 700 }}>LIVE UPDATES</span>
                    </div>
                    <div>
                        {[
                            { title: 'Dharavi Sector 3: Help Delivered', desc: '500 Food packets and clean water bottles reached the community center.', time: '12 min ago', icon: CheckCircle2 },
                            { title: 'Kurla West Path Cleared', desc: 'Main artery road cleared for light vehicles to access medical camp.', time: '42 min ago', icon: MapPin },
                            { title: 'New Shelter Opened: Bandra', desc: 'St. Mary\'s school is now an active relief site with medical staff.', time: '2h ago', icon: LifeBuoy },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: i === 2 ? 'none' : '1px solid var(--border-subtle)', display: 'flex', gap: 14 }}>
                                <div style={{ color: 'var(--emerald-500)', marginTop: 2 }}><item.icon size={16} /></div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.desc}</div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

const ROLES: Record<Role, { accent: string; icon: any; title: string; desc: string }> = {
    CIVILIAN: { accent: 'var(--cyan-500)', icon: Users, title: 'Civilian Resilience', desc: 'Access resources and self-report safety status.' },
    RESPONDER: { accent: 'var(--amber-500)', icon: HardHat, title: 'First Responder', desc: 'Coordinate field operations and rescue teams.' },
    GOVERNMENT: { accent: 'var(--purple-500)', icon: Landmark, title: 'Government Command', desc: 'Strategic oversight and agency coordination.' },
}

export default function Stakeholders() {
    const { role, setRole } = useAegisStore()

    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 700, marginBottom: 4 }}>
                        Stakeholder Intelligence
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        {role === 'GOVERNMENT' ? 'Strategic Agency Command Panel' : 'Community Resilience & Recovery Portal'}
                    </p>
                </div>

                {/* Role Switcher (Simulated for Demo) */}
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-elevated)', padding: 4, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    {(Object.keys(ROLES) as Role[]).map(r => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            style={{
                                border: 'none', background: role === r ? ROLES[r].accent : 'transparent',
                                color: role === r ? 'var(--bg-void)' : 'var(--text-muted)',
                                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', transition: 'var(--transition-fast)'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dynamic Content based on Role */}
            {role === 'GOVERNMENT' ? (
                <GovernmentCommand />
            ) : role === 'CIVILIAN' ? (
                <CivilianResilience />
            ) : (
                <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                    <HardHat size={48} color="var(--amber-500)" style={{ margin: '0 auto var(--space-4)' }} />
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>First Responder View</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '8px auto var(--space-6)' }}>
                        Field coordination active. For strategic oversight, switch to Government Command. For public resources, switch to Civilian view.
                    </p>
                    <button className="btn btn--primary" style={{ margin: '0 auto' }}>View Field Activity Map</button>
                </div>
            )}

            {/* Common Stakeholder Footer/Banner */}
            <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-subtle)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--emerald-500)', boxShadow: '0 0 10px var(--emerald-500)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                        AEGIS Secure Channel Active — End-to-End Encrypted Communication with District HQ
                    </span>
                </div>
            </div>
        </div>
    )
}
