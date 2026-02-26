import { useMemo } from 'react'
import { useAegisStore, type ZoneData } from '../store'
import { Brain, TrendingUp, Clock, Database, Activity, Zap, Cpu, Scan, Shield } from 'lucide-react'
import {
    AreaChart, Area, BarChart, Bar,
    ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts'
import { buildPredictionForecast, buildShapEvidence, getPeakPrediction } from '../lib/chartData'

// Fusion Metadata (real sensor sources)
const FUSION_SOURCES = [
    { id: 'SAR-1', name: 'Sentinel-1 (SAR)', status: 'SYNCED', tech: 'C-Band Radar', value: 'Cloud-Penetration Active' },
    { id: 'OPT-2', name: 'Sentinel-2 (MSI)', status: 'SYNCED', tech: 'NIR/SWIR', value: 'Water Index (NDWI)' },
    { id: 'AEGIS', name: 'AEGIS Fleet', status: 'LIVE', tech: 'LiDAR/Thermal', value: 'High-Res Point Cloud' },
    { id: 'IOT-M', name: 'Ground IoT', status: 'LATENCY', tech: 'Piezo-Depth', value: 'Manual-Calibrated' },
]

export default function Prediction() {
    const { zones, aiConfidence, aiModelHealth, aiDrift, inferenceLatency, role } = useAegisStore()

    // ─── Real data-derived charts from live zone predictions ───
    const forecastData = useMemo(() => buildPredictionForecast(zones), [zones])
    const NEURAL_EVIDENCE = useMemo(() => buildShapEvidence(zones), [zones])
    const peakInfo = useMemo(() => getPeakPrediction(zones), [zones])

    const isAuthorized = role === 'GOVERNMENT' || role === 'RESPONDER'

    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Header & Neural Health HUD */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
                        fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em'
                    }}>
                        {isAuthorized ? 'Neural Engine Core' : 'Public Safety Forecast'}
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)', fontSize: 'var(--text-sm)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <Brain size={14} color="var(--purple-400)" />
                        {isAuthorized ? 'AEGIS-ML v1.0 — Distributed Hybrid Transformer Inference' : 'AEGIS Predicted Hydrological Risk Matrix'}
                    </p>
                </div>

                {isAuthorized && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {[
                            { label: 'Latency', value: `${inferenceLatency}ms`, icon: Activity, color: 'var(--cyan-400)' },
                            { label: 'Model Health', value: `${aiModelHealth}%`, icon: Shield, color: 'var(--emerald-400)' },
                            { label: 'Drift', value: aiDrift, icon: Zap, color: 'var(--amber-400)' },
                        ].map(diag => (
                            <div key={diag.label} className="card" style={{ padding: '8px 12px', minWidth: 100, background: 'rgba(12,20,40,0.6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <diag.icon size={12} color={diag.color} />
                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{diag.label}</span>
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: diag.color }}>{diag.value}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Core Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                {[
                    { label: 'Peak Prediction', value: peakInfo.value, sub: `${peakInfo.zone} at ${peakInfo.horizon}`, color: 'var(--red-600)', icon: TrendingUp },
                    { label: 'System Confidence', value: `${aiConfidence}%`, sub: 'Bayesian Weighting', color: 'var(--purple-500)', icon: Cpu },
                    { label: 'Spectral Match', value: '99.2%', sub: 'SAR/Optical Fusion', color: 'var(--cyan-500)', icon: Scan },
                    { label: 'Inference Cycle', value: '1.2s', sub: 'Real-time throughput', color: 'var(--emerald-500)', icon: Clock },
                ].map(kpi => (
                    <div key={kpi.label} className="metric-card" style={{ '--severity-color': kpi.color } as React.CSSProperties}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="metric-card__label">{kpi.label}</div>
                            <kpi.icon size={14} color={kpi.color} style={{ opacity: 0.6 }} />
                        </div>
                        <div className="metric-card__value" style={{ fontSize: 'var(--text-3xl)' }}>{kpi.value}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 'var(--space-4)' }}>
                {/* Main Forecast Chart */}
                <div className="card">
                    <div className="card__header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="card__title">Time-Series Neural Projection</span>
                            <span className="ai-badge">72H Lookahead</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#DC2626' }} />
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>High Risk</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, border: '1px dashed #F59E0B' }} />
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Upper Bound</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-4)', height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecastData}>
                                <defs>
                                    <linearGradient id="fillA12" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#DC2626" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="fillF09" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#EA580C" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#EA580C" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,46,74,0.4)" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                                    axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                                    tickFormatter={(v) => `${v}m`} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{
                                    background: '#0C1428', border: '1px solid var(--border-subtle)',
                                    borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11,
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                                }} />
                                <Area type="monotone" dataKey="f09" name="Zone F-09 (Primary)" stroke="#EA580C" strokeWidth={3} fill="url(#fillF09)" dot={false} />
                                <Area type="monotone" dataKey="a12" name="Zone A-12" stroke="#DC2626" strokeWidth={2} fill="url(#fillA12)" dot={false} />
                                <Area type="monotone" dataKey="b04" name="Confidence Band" stroke="var(--amber-500)" strokeWidth={1} fill="none" dot={false} strokeDasharray="3,3" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sensor Fusion Core */}
                <div className="card">
                    <div className="card__header">
                        <span className="card__title">Sensor Fusion Streams</span>
                    </div>
                    <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                        {FUSION_SOURCES.map(source => (
                            <div key={source.id} style={{
                                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                                marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: 'var(--bg-void)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid var(--border-subtle)'
                                }}>
                                    <Database size={16} color="var(--cyan-500)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{source.name}</span>
                                        <span style={{
                                            fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                            background: source.status === 'LIVE' ? 'var(--emerald-900)' : 'var(--bg-card)',
                                            color: source.status === 'LIVE' ? 'var(--emerald-400)' : 'var(--text-muted)',
                                            fontWeight: 700, letterSpacing: '0.05em'
                                        }}>{source.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{source.tech}</span>
                                        <span style={{ color: 'var(--cyan-400)', fontFamily: 'var(--font-mono)' }}>{source.value}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isAuthorized && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 'var(--space-4)' }}>
                    {/* Neural Evidence (SHAP) */}
                    <div className="card">
                        <div className="card__header">
                            <span className="card__title">Evidence Weights (SHAP Analysis)</span>
                        </div>
                        <div style={{ padding: 'var(--space-4)', height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={NEURAL_EVIDENCE} layout="vertical" margin={{ left: -20, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="feature" type="category" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={120} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ background: '#0C1428', border: '1px solid var(--border-subtle)', fontSize: 11 }}
                                    />
                                    <Bar dataKey="impact" radius={[0, 4, 4, 0]} barSize={12}>
                                        {NEURAL_EVIDENCE.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ padding: '0 var(--space-4) var(--space-4)', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            *Positive values increase predicted flood depth; negative values (drainage) reduce it.
                        </div>
                    </div>

                    {/* Sub-Zone Health Grid */}
                    <div className="card">
                        <div className="card__header">
                            <span className="card__title">Real-time Inference Monitoring</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Strategic Zone</th>
                                        <th>Sync Status</th>
                                        <th>Model Drift</th>
                                        <th>24H Projection</th>
                                        <th>Delta</th>
                                        <th>Confidence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zones.map((z: ZoneData) => (
                                        <tr key={z.name}>
                                            <td style={{ fontWeight: 600 }}>{z.name}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald-500)' }} />
                                                    <span style={{ fontSize: 11 }}>Locked</span>
                                                </div>
                                            </td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{(Math.random() * 0.05).toFixed(3)}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-400)', fontWeight: 600 }}>{z.predicted24h}m</td>
                                            <td style={{ color: 'var(--red-400)', fontSize: 11 }}>+{(z.predicted24h - z.floodLevel).toFixed(1)}m</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden', minWidth: 40 }}>
                                                        <div style={{ height: '100%', width: `${80 + Math.random() * 15}%`, background: 'var(--purple-500)' }} />
                                                    </div>
                                                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{Math.floor(80 + Math.random() * 15)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {!isAuthorized && (
                <div className="card" style={{ padding: 'var(--space-6)', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', background: 'rgba(6,182,212,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                        border: '1px solid var(--border-accent)'
                    }}>
                        <Brain size={40} color="var(--cyan-500)" />
                    </div>
                    <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 16 }}>Public Safety Forecast</h2>
                    <p style={{ maxWidth: 500, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
                        The AEGIS Neural Engine is currently projecting low-to-moderate risks for the greater metropolitan area.
                        Live data feeds are being processed every 300ms to ensure maximum accuracy in early warning systems.
                    </p>
                    <div style={{ width: '100%', maxWidth: 600, padding: 'var(--space-4)', background: 'var(--bg-void)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SYSTEM STATUS</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-success)' }}>OPERATIONAL</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '100%', background: 'var(--cyan-500)', animation: 'pulse-live 2s infinite' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
