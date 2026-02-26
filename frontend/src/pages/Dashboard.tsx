import { useMemo } from 'react'
import { useAegisStore } from '../store'
import {
    AlertTriangle, MapPin, Plane, TrendingUp, Users,
    ArrowUpRight, ArrowDownRight, Clock, ExternalLink,
    ChevronRight, Activity, Wind, Droplets, Sun, Eye, Cpu
} from 'lucide-react'
import {
    ResponsiveContainer, XAxis, YAxis, Tooltip,
    ComposedChart, Area, ReferenceLine
} from 'recharts'
import { MapContainer, TileLayer, Circle } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { SentinelAI } from '../components/SentinelAI'
import { buildDashboardForecast, getPeakPrediction } from '../lib/chartData'

// No more mock data — chart data is derived inside the component from real zones

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: 'var(--red-600)',
    SEVERE: 'var(--orange-500)',
    MODERATE: 'var(--amber-500)',
    LOW: 'var(--green-500)',
}

export default function Dashboard() {
    const store = useAegisStore()
    const navigate = useNavigate()

    // ─── Real data-driven 72h forecast from live zone predictions ───
    const FORECAST_DATA = useMemo(() => buildDashboardForecast(store.zones), [store.zones])
    const peakInfo = useMemo(() => getPeakPrediction(store.zones), [store.zones])

    const kpis = [
        { label: 'Active Alerts', value: store.activeAlerts, color: 'var(--red-600)', icon: AlertTriangle, delta: '+2', up: true, path: '/map' },
        { label: 'Zones Monitored', value: store.zonesMonitored, color: 'var(--cyan-500)', icon: MapPin, delta: '0', up: false, path: '/map' },
        { label: 'Drones Airborne', value: store.dronesAirborne, color: 'var(--orange-500)', icon: Plane, delta: '+1', up: true, path: '/drones' },
        { label: 'Predicted Rise 24h', value: peakInfo.value, color: 'var(--purple-500)', icon: TrendingUp, delta: `${peakInfo.zone} ${peakInfo.horizon}`, up: true, path: '/analytics' },
        { label: 'People at Risk', value: store.peopleAtRisk.toLocaleString(), color: 'var(--red-500)', icon: Users, delta: '+1,204', up: true, path: '/map' },
    ]

    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
                        fontWeight: 700, marginBottom: 4,
                    }}>Crisis Command</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            Real-time situational awareness dashboard
                        </p>
                        <div className="live-indicator">LIVE TELEMETRY</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="npu-badge" style={{
                        background: 'rgba(0, 245, 255, 0.1)',
                        border: '1px solid rgba(0, 245, 255, 0.3)',
                        borderRadius: 8, padding: '4px 12px',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <Cpu size={14} color="#00F5FF" className="animate-pulse" />
                        <span style={{ fontSize: 10, color: '#00F5FF', fontWeight: 700 }}>RYZEN AI ACTIVE</span>
                    </div>
                    <button
                        className="btn btn--secondary"
                        onClick={() => navigate('/analytics')}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <Activity size={16} /> full analytics report
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)' }}>
                {kpis.map(kpi => {
                    const Icon = kpi.icon
                    return (
                        <div
                            key={kpi.label}
                            className="metric-card"
                            onClick={() => navigate(kpi.path)}
                            style={{ '--severity-color': kpi.color, cursor: 'pointer' } as React.CSSProperties}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                <Icon size={18} style={{ color: kpi.color, marginBottom: 10 }} />
                                <ChevronRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                            </div>
                            <div className="metric-card__label">{kpi.label}</div>
                            <div className="metric-card__value" style={{ fontSize: 'var(--text-4xl)' }}>{kpi.value}</div>
                            <div className={`metric-card__delta ${kpi.up ? 'metric-card__delta--down' : 'metric-card__delta--up'}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {kpi.delta} last hour
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Middle Row: Mini Map + Alert Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-4)', minHeight: 420 }}>
                {/* Mini Map Preview */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card__header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="card__title">Flood Extent Preview</span>
                            <span className="badge badge--live">LIVE MAPPING</span>
                        </div>
                        <button
                            className="btn btn--ghost"
                            onClick={() => navigate('/map')}
                            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <ExternalLink size={12} /> ENTER WAR ROOM
                        </button>
                    </div>
                    <div
                        onClick={() => navigate('/map')}
                        style={{
                            flex: 1, margin: 'var(--space-2)', borderRadius: 'var(--radius-md)',
                            overflow: 'hidden', position: 'relative', cursor: 'pointer',
                            border: '1px solid var(--border-subtle)'
                        }}
                    >
                        <MapContainer
                            center={[19.043, 72.853]}
                            zoom={11}
                            zoomControl={false}
                            dragging={false}
                            touchZoom={false}
                            doubleClickZoom={false}
                            scrollWheelZoom={false}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                            {store.zones.map((zone: any, i: number) => (
                                <Circle
                                    key={i}
                                    center={[zone.lat, zone.lon]}
                                    radius={800}
                                    pathOptions={{
                                        fillColor: SEVERITY_COLORS[zone.risk],
                                        fillOpacity: 0.4,
                                        color: SEVERITY_COLORS[zone.risk],
                                        weight: 2
                                    }}
                                />
                            ))}
                        </MapContainer>
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.3)', zIndex: 1000
                        }} />
                    </div>
                </div>

                {/* Alert Feed + Sentinel AI Integration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <SentinelAI />

                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: 16, overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    }}>
                        <div style={{
                            padding: '14px 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(239, 68, 68, 0.04)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={14} color="#EF4444" />
                                <span style={{
                                    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800,
                                    color: '#F1F5F9', letterSpacing: '0.04em',
                                }}>Critical Alerts</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{
                                    fontSize: 10, fontWeight: 800, color: '#EF4444',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '3px 10px', borderRadius: 20,
                                    letterSpacing: '0.06em',
                                }}>{store.alerts.filter((a: any) => !a.read).length} NEW</span>
                                <button onClick={() => navigate('/alerts')} style={{
                                    fontSize: 9, fontWeight: 700, color: '#64748B',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                    letterSpacing: '0.05em',
                                }}>Mark All Read</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {store.alerts.map((alert: any) => {
                                const sevColors: Record<string, string> = {
                                    CRITICAL: '#EF4444', SEVERE: '#F97316',
                                    MODERATE: '#F59E0B', LOW: '#10B981'
                                }
                                const c = sevColors[alert.severity] || '#64748B'
                                return (
                                    <div
                                        key={alert.id}
                                        onClick={() => navigate('/alerts')}
                                        style={{
                                            display: 'flex', flexDirection: 'column', gap: 6,
                                            padding: '14px 20px',
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            borderLeft: `3px solid ${c}`,
                                            opacity: alert.read ? 0.5 : 1,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            background: 'transparent',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: 9, fontWeight: 800, color: c,
                                                background: `${c}15`, border: `1px solid ${c}33`,
                                                padding: '2px 8px', borderRadius: 4,
                                                letterSpacing: '0.06em',
                                            }}>{alert.severity}</span>
                                            <span style={{
                                                fontSize: 12, fontWeight: 600, color: '#E2E8F0',
                                                flex: 1,
                                            }}>{alert.title}</span>
                                            <ChevronRight size={12} style={{ color: '#475569' }} />
                                        </div>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            fontSize: 10, color: '#64748B',
                                        }}>
                                            <Clock size={9} />
                                            <span>{alert.time}</span>
                                            <span style={{ color: '#334155' }}>•</span>
                                            <span style={{ color: '#06B6D4', fontWeight: 600 }}>{alert.zone}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Meteorological Telemetry Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                {[
                    { label: 'Wind Velocity', value: `${store.windSpeed} km/h`, sub: store.windDirection, icon: Wind, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
                    { label: 'Humidity', value: `${store.humidity}%`, sub: 'Relative Saturation', icon: Droplets, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)' },
                    { label: 'UV Index', value: store.uvIndex, sub: 'Moderate Exposure', icon: Sun, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
                    { label: 'Eye Visibility', value: `${store.visibility} km`, sub: 'Atmospheric Clarity', icon: Eye, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
                ].map((env: any) => (
                    <div key={env.label} className="card list-hover-effect" style={{
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 'var(--radius-md)',
                            background: env.bg, border: `1px solid ${env.color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 12px ${env.color}22`
                        }}>
                            <env.icon size={22} color={env.color} strokeWidth={2.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{env.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{env.value}</div>
                            <div style={{ fontSize: 10, color: env.color, fontWeight: 700, marginTop: 4 }}>{env.sub}</div>
                        </div>
                        <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                    </div>
                ))}
            </div>

            {/* Bottom Row: Prediction Chart + Drone Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-4)' }}>
                {/* Analytical Forecast Chart */}
                <div className="card">
                    <div className="card__header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="card__title">Hydrological Risk Projection (72h)</span>
                            <span className="ai-badge">AEGIS ENGINE v1.0</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                fontSize: 'var(--text-xs)', color: 'var(--cyan-600)',
                                fontFamily: 'var(--font-mono)', fontWeight: 700
                            }}>CONFIDENCE: {store.aiConfidence}%</div>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-4)', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={FORECAST_DATA}>
                                <defs>
                                    <linearGradient id="purpleFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.01} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                                    tickFormatter={(v: number) => `${v}h`} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                                    tickFormatter={(v: number) => `${v}m`} axisLine={false} tickLine={false} />
                                <Tooltip
                                    content={({ active, payload, label }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="glass-panel" style={{ padding: 12, border: '1px solid var(--border-strong)', fontSize: 11, background: 'rgba(255,255,255,0.95)' }}>
                                                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>T + {label} HOURS</div>
                                                    <div style={{ color: '#8B5CF6', fontWeight: 700, fontSize: 14 }}>PREDICTION: {payload[0].value.toFixed(2)}m</div>
                                                    <div style={{ color: '#06B6D4', fontWeight: 700 }}>RISK PROB: {payload[0].payload.riskProbability.toFixed(1)}%</div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <ReferenceLine y={5.0} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'right', value: 'CRITICAL', fill: '#EF4444', fontSize: 10, fontWeight: 700 }} />
                                <ReferenceLine x={15} stroke="#06B6D4" label={{ position: 'top', value: 'CURRENT TIME', fill: '#06B6D4', fontSize: 10, fontWeight: 700 }} strokeWidth={2} />
                                <Area type="monotone" dataKey="predicted" stroke="#8B5CF6" strokeWidth={3}
                                    fill="url(#purpleFill)" dot={false} />
                                <Area type="monotone" dataKey="current" stroke="#06B6D4" strokeWidth={4}
                                    fill="none" dot={false} strokeDasharray="6 4" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Drone Status Grid */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card__header">
                        <span className="card__title">Drone Fleet Logistics</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn--secondary" onClick={() => navigate('/drones')} style={{ fontSize: 10 }}>MANAGE ALL</button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {store.drones.map((drone: any) => {
                            const statusColors: Record<string, string> = {
                                AIRBORNE: '#06B6D4', RETURNING: '#F59E0B',
                                OFFLINE: '#EF4444', CHARGING: '#10B981',
                            }
                            return (
                                <div
                                    key={drone.id}
                                    onClick={() => navigate('/drones')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '16px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        borderLeft: `4px solid ${statusColors[drone.status]}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    className="list-hover-effect"
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)',
                                            fontWeight: 700, color: 'var(--text-primary)',
                                        }}>{drone.id}</div>
                                        <div style={{
                                            fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                                        }}>{drone.zone}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                        <span className={`badge badge--${drone.status === 'AIRBORNE' ? 'live' : drone.status === 'RETURNING' ? 'moderate' : drone.status === 'OFFLINE' ? 'critical' : 'low'}`}
                                            style={{ fontSize: 9, fontWeight: 700 }}>{drone.status}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 40, height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${drone.battery}%`, background: drone.battery > 50 ? '#10B981' : drone.battery > 20 ? '#F59E0B' : '#EF4444' }} />
                                            </div>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                                                color: 'var(--text-secondary)',
                                            }}>{drone.battery}%</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
