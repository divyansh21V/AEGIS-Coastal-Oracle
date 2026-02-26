import { Package, Truck, MapPin, Users, Phone, Shield, Radio, Navigation2, Activity } from 'lucide-react'
import { useAegisStore } from '../store'

const SHELTERS = [
    { name: 'Community Hall A-12', capacity: 500, occupied: 312, supplies: 'ADEQUATE', lat: 28.614, lon: 77.209 },
    { name: 'School Complex B-04', capacity: 800, occupied: 480, supplies: 'LOW', lat: 28.623, lon: 77.220 },
    { name: 'Stadium D-01', capacity: 2000, occupied: 890, supplies: 'ADEQUATE', lat: 28.635, lon: 77.199 },
    { name: 'Temple Grounds C-07', capacity: 350, occupied: 201, supplies: 'CRITICAL', lat: 28.609, lon: 77.231 },
]

const SUPPLIES = [
    { item: 'Drinking Water (L)', available: 12400, needed: 20000, status: 'LOW' },
    { item: 'Food Rations', available: 8500, needed: 10000, status: 'ADEQUATE' },
    { item: 'First Aid Kits', available: 234, needed: 400, status: 'LOW' },
    { item: 'Blankets', available: 1800, needed: 2000, status: 'ADEQUATE' },
    { item: 'Rescue Boats', available: 12, needed: 20, status: 'CRITICAL' },
    { item: 'Portable Generators', available: 6, needed: 15, status: 'CRITICAL' },
]

const CONTACTS = [
    { name: 'NDRF Control Room', number: '011-24363260', type: 'EMERGENCY' },
    { name: 'District Collector', number: '011-23456789', type: 'GOVERNMENT' },
    { name: 'AEGIS Command', number: '1800-AEGIS-01', type: 'OPERATIONS' },
    { name: 'Medical Emergency', number: '108', type: 'MEDICAL' },
]

export default function Resources() {
    const workUnits = useAegisStore(s => s.workUnits)


    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>Logistics & Management</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Command Oversight: Personnel, Assets & Supply Chains</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn--secondary" style={{ fontSize: 11, fontWeight: 700 }}>
                        <Radio size={14} /> COMMS CHECK
                    </button>
                    <button className="btn btn--primary" style={{ fontSize: 11, fontWeight: 700 }}>
                        <Navigation2 size={14} /> DISPATCH ALL
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                {[
                    { label: 'Active Shelters', value: '4', color: 'var(--cyan-500)', icon: MapPin },
                    { label: 'People Sheltered', value: '1,883', color: 'var(--green-500)', icon: Users },
                    { label: 'Supply Trucks', value: '8', color: 'var(--amber-500)', icon: Truck },
                    { label: 'Critical Items', value: '2', color: 'var(--red-500)', icon: Package },
                ].map(k => {
                    const I = k.icon
                    return (
                        <div key={k.label} className="metric-card" style={{ '--severity-color': k.color } as React.CSSProperties}>
                            <I size={18} style={{ color: k.color, marginBottom: 8 }} />
                            <div className="metric-card__label">{k.label}</div>
                            <div className="metric-card__value" style={{ fontSize: 'var(--text-3xl)' }}>{k.value}</div>
                        </div>)
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Field Work Units (Logistics focus) */}
                <div className="card">
                    <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Users size={16} color="var(--cyan-500)" />
                            <span className="card__title">Field Work Units</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.5 }}>LIVE TELEMETRY</span>
                    </div>
                    <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                        <table className="data-table">
                            <thead><tr><th>ID/Unit Name</th><th>Type</th><th>Status</th><th>Personnel</th><th>Last Action Location</th></tr></thead>
                            <tbody>
                                {workUnits.map(unit => (
                                    <tr key={unit.id}>
                                        <td style={{ fontWeight: 700 }}>
                                            <div style={{ fontSize: 10, opacity: 0.5 }}>{unit.id}</div>
                                            {unit.name}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>{unit.type}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{
                                                    width: 6, height: 6, borderRadius: '50%',
                                                    background: unit.status === 'DISPATCHED' ? 'var(--cyan-500)' : unit.status === 'BUSY' ? 'var(--amber-500)' : 'var(--green-500)',
                                                    boxShadow: `0 0 8px ${unit.status === 'DISPATCHED' ? 'var(--cyan-500)' : unit.status === 'BUSY' ? 'var(--amber-500)' : 'var(--green-500)'}66`
                                                }} />
                                                <span style={{ fontSize: 11, fontWeight: 700 }}>{unit.status}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{unit.personnel}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{unit.lastAction}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tactical Dispatch Control */}
                <div className="card" style={{ border: '1px solid var(--border-strong)', background: 'rgba(6, 182, 212, 0.02)' }}>
                    <div className="card__header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={16} color="var(--amber-500)" />
                            <span className="card__title">Tactical Dispatch</span>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>SELECT UNIT FOR DEPLOYMENT</div>
                            <select className="input" style={{ width: '100%', background: 'rgba(0,0,0,0.2)' }}>
                                <option>Select Unit...</option>
                                {workUnits.filter(u => u.status === 'IDLE').map(u => (
                                    <option key={u.id}>{u.name} ({u.type})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>TARGET GRID SECTOR</div>
                            <input className="input" type="text" placeholder="e.g. SECTOR-4-DHV" style={{ background: 'rgba(0,0,0,0.2)' }} />
                        </div>
                        <button className="btn btn--primary btn--full" style={{ background: 'var(--amber-500)', color: '#000', fontWeight: 800 }}>
                            AUTHORIZE IMMEDIATE DISPATCH
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', justifyContent: 'center' }}>
                            <Shield size={10} /> ENCRYPTED COMMAND CHANNEL ACTIVE
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Shelter Table */}
                <div className="card">
                    <div className="card__header"><span className="card__title">Shelter Status</span></div>
                    <table className="data-table">
                        <thead><tr><th>Shelter</th><th>Capacity</th><th>Occupancy</th><th>Supplies</th></tr></thead>
                        <tbody>
                            {SHELTERS.map(s => {
                                const pct = Math.round((s.occupied / s.capacity) * 100)
                                return (
                                    <tr key={s.name}>
                                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{s.capacity}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--red-500)' : pct > 50 ? 'var(--amber-500)' : 'var(--green-500)', borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td><span className={`badge badge--${s.supplies === 'CRITICAL' ? 'critical' : s.supplies === 'LOW' ? 'moderate' : 'low'}`}>{s.supplies}</span></td>
                                    </tr>)
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Supply Inventory */}
                <div className="card">
                    <div className="card__header"><span className="card__title">Supply Inventory</span></div>
                    <table className="data-table">
                        <thead><tr><th>Item</th><th>Available</th><th>Needed</th><th>Status</th></tr></thead>
                        <tbody>
                            {SUPPLIES.map(s => (
                                <tr key={s.item}>
                                    <td style={{ fontWeight: 600 }}>{s.item}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{s.available.toLocaleString()}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{s.needed.toLocaleString()}</td>
                                    <td><span className={`badge badge--${s.status === 'CRITICAL' ? 'critical' : s.status === 'LOW' ? 'moderate' : 'low'}`}>{s.status}</span></td>
                                </tr>))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Emergency Contacts */}
            <div className="card">
                <div className="card__header"><span className="card__title">Emergency Contacts</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                    {CONTACTS.map(c => (
                        <div key={c.name} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{c.type}</div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 4 }}>{c.name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', color: 'var(--text-accent)' }}>
                                <Phone size={10} style={{ marginRight: 4 }} />{c.number}
                            </div>
                        </div>))}
                </div>
            </div>
        </div>
    )
}
