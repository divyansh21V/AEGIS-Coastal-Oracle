import { useState } from 'react'
import { useAegisStore } from '../store'
import {
    Battery, Signal, Navigation, Thermometer,
    ZoomIn, ArrowUp, RotateCcw,
    Search, Play, Crosshair, Compass, Shield, AlertTriangle,
    Clock, Zap
} from 'lucide-react'
import { MapContainer, TileLayer, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const STATUS_COLORS: Record<string, string> = {
    AIRBORNE: 'var(--cyan-500)', RETURNING: 'var(--amber-500)',
    OFFLINE: 'var(--red-500)', CHARGING: 'var(--green-500)',
}

export default function Drones() {
    const store = useAegisStore()
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [focusedDroneId, setFocusedDroneId] = useState<string | null>(null)

    const focusedDrone = store.drones.find(d => d.id === focusedDroneId)

    const filteredDrones = store.drones.filter(drone => {
        const matchesFilter =
            filter === 'ALL' ||
            (filter === 'ACTIVE' && (drone.status === 'AIRBORNE' || drone.status === 'RETURNING')) ||
            (filter === 'MAINTENANCE' && (drone.status === 'OFFLINE' || drone.status === 'CHARGING'))

        const matchesSearch =
            drone.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            drone.zone.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesFilter && matchesSearch
    })



    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
                        fontWeight: 700, marginBottom: 4,
                    }}>Drone Fleet Command</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            Real-time aerial reconnaissance & monitoring
                        </p>
                        <div className="live-indicator">ENCRYPTED ULTRALINK</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={14} />
                        <input
                            type="text"
                            placeholder="Search ID/Zone..."
                            className="btn btn--secondary"
                            style={{ paddingLeft: 34, height: 40, width: 220, textAlign: 'left', background: 'var(--bg-card)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn btn--primary" onClick={() => store.deployAllDrones()}>
                        <Play size={14} style={{ marginRight: 8 }} /> Deploy All Units
                    </button>
                    <button className="btn btn--secondary">
                        <Shield size={14} style={{ marginRight: 8 }} /> Fleet Shielding
                    </button>
                </div>
            </div>

            {/* Filtering Tabs */}
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
                {(['ALL', 'ACTIVE', 'MAINTENANCE'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`btn ${filter === f ? 'btn--primary' : 'btn--ghost'}`}
                        style={{ padding: '8px 24px', fontSize: 11, fontWeight: 700 }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Drone Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                {filteredDrones.map(drone => (
                    <div key={drone.id} className="card" style={{
                        borderTop: `3px solid ${STATUS_COLORS[drone.status]}`,
                    }}>
                        {/* Card Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: 'var(--space-4) var(--space-5)',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}>
                            <div>
                                <div style={{
                                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)',
                                    fontWeight: 700, color: 'var(--text-primary)',
                                }}>{drone.id}</div>
                                <div style={{
                                    fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                                }}>{drone.name}</div>
                            </div>
                            <span className={`badge badge--${drone.status === 'AIRBORNE' ? 'live' : drone.status === 'OFFLINE' ? 'critical' : 'moderate'}`}>
                                {drone.status}
                            </span>
                        </div>

                        {/* Live Tactical Map / Camera Feed */}
                        <div style={{
                            height: 160,
                            background: 'var(--bg-void)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {drone.status === 'AIRBORNE' || drone.status === 'RETURNING' ? (
                                <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                                    <MapContainer
                                        center={[drone.lat, drone.lon]}
                                        zoom={14}
                                        zoomControl={false}
                                        dragging={false}
                                        touchZoom={false}
                                        doubleClickZoom={false}
                                        scrollWheelZoom={false}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                        <Circle
                                            center={[drone.lat, drone.lon]}
                                            radius={50}
                                            pathOptions={{ color: STATUS_COLORS[drone.status], fillColor: STATUS_COLORS[drone.status], fillOpacity: 0.8 }}
                                        />
                                    </MapContainer>

                                    <div className="scanline" />
                                    {/* Tactical HUD Overlay */}
                                    <div style={{ position: 'absolute', inset: 0, padding: 10, pointerEvents: 'none', zIndex: 1000 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan-400)', fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                                <Crosshair size={10} /> LAT: {drone.lat.toFixed(4)} / LON: {drone.lon.toFixed(4)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                                <Compass size={10} /> HDG: {(drone.speed * 15 % 360).toFixed(0)}°
                                            </div>
                                        </div>

                                        <div style={{ position: 'absolute', bottom: 8, right: 8, textAlign: 'right' }}>
                                            <div style={{ fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>ENC_ULTRALINK</div>
                                            <div style={{ fontSize: 9, color: 'var(--cyan-400)', fontWeight: 700 }}>LIVE MAP FEED</div>
                                        </div>
                                        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                                            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                                ALT: {drone.altitude}m
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map Vignette */}
                                    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)', pointerEvents: 'none', zIndex: 900 }} />
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-card)' }}>
                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <AlertTriangle size={18} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                                        <span style={{
                                            fontSize: 10, fontFamily: 'var(--font-mono)',
                                            color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.1em'
                                        }}>{drone.status === 'OFFLINE' ? 'SIGNAL LOST' : 'UNIT DOCKED'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Telemetry Grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
                            background: 'var(--border-subtle)',
                        }}>
                            {[
                                { icon: Battery, label: 'Battery', value: `${drone.battery}%`, color: drone.battery > 50 ? 'var(--green-400)' : drone.battery > 20 ? 'var(--amber-400)' : 'var(--red-400)' },
                                { icon: Signal, label: 'Signal', value: `${drone.signal}%`, color: drone.signal > 70 ? 'var(--green-400)' : 'var(--amber-400)' },
                                { icon: Clock, label: 'Flight Time', value: `${(drone.battery * 0.45).toFixed(0)}m`, color: 'var(--purple-400)' },
                                { icon: Zap, label: 'Est. Range', value: `${(drone.battery * 0.12).toFixed(1)}km`, color: 'var(--cyan-400)' },
                                { icon: Navigation, label: 'Altitude', value: `${drone.altitude}m`, color: 'var(--amber-400)' },
                                { icon: Thermometer, label: 'Speed', value: `${drone.speed}m/s`, color: 'var(--text-primary)' },
                            ].map(tel => {
                                const TelIcon = tel.icon
                                return (
                                    <div key={tel.label} style={{
                                        background: 'var(--bg-card)',
                                        padding: '10px 14px',
                                        display: 'flex', alignItems: 'center', gap: 10,
                                    }}>
                                        <TelIcon size={14} color="var(--text-muted)" />
                                        <div>
                                            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{tel.label}</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: tel.color }}>{tel.value}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Controls */}
                        {(drone.status === 'AIRBORNE' || drone.status === 'RETURNING') && (
                            <div style={{
                                display: 'flex', gap: 6, padding: 'var(--space-3) var(--space-4)',
                                borderTop: '1px solid var(--border-subtle)',
                            }}>
                                <button
                                    className="btn btn--ghost"
                                    style={{ flex: 1, fontSize: 11, padding: '6px 0', border: '1px solid var(--cyan-800)' }}
                                    onClick={() => setFocusedDroneId(drone.id)}
                                >
                                    <ZoomIn size={12} /> Focus
                                </button>
                                <button className="btn btn--ghost" style={{ flex: 1, fontSize: 11, padding: '6px 0' }}>
                                    <ArrowUp size={12} /> Ascend
                                </button>
                                <button className="btn btn--ghost" style={{ flex: 1, fontSize: 11, padding: '6px 0' }}>
                                    <RotateCcw size={12} /> Return
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {/* Focus Modal */}
                {focusedDrone && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)',
                        display: 'flex', flexDirection: 'column', padding: 'var(--space-8)',
                        backdropFilter: 'blur(20px)', animation: 'fade-in 0.3s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-4)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', color: 'var(--cyan-400)' }}>
                                        {focusedDrone.id} - TACTICAL FOCUS
                                    </h2>
                                    <span className={`badge badge--live`}>SECURE LINK ACTIVE</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)' }}>{focusedDrone.name} • Operational Zone: {focusedDrone.zone}</p>
                            </div>
                            <button
                                className="btn btn--ghost"
                                style={{ fontSize: 'var(--text-xl)', color: 'var(--text-muted)' }}
                                onClick={() => setFocusedDroneId(null)}
                            >
                                ✕ CLOSE
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-8)', flex: 1 }}>
                            {/* Enhanced Map View */}
                            <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--cyan-900)', background: 'var(--bg-void)' }}>
                                <MapContainer
                                    center={[focusedDrone.lat, focusedDrone.lon]}
                                    zoom={16}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                    <Circle
                                        center={[focusedDrone.lat, focusedDrone.lon]}
                                        radius={200}
                                        pathOptions={{ color: 'var(--cyan-500)', dashArray: '10, 10', weight: 1, fillOpacity: 0.1 }}
                                    />
                                    <Circle
                                        center={[focusedDrone.lat, focusedDrone.lon]}
                                        radius={20}
                                        pathOptions={{ color: 'var(--cyan-400)', fillColor: 'var(--cyan-400)', fillOpacity: 1 }}
                                    />
                                </MapContainer>

                                {/* Detailed Tactical Overlays */}
                                <div style={{ position: 'absolute', top: 20, right: 20, pointerEvents: 'none' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.8)', padding: 12, border: '1px solid var(--cyan-500)', color: 'var(--cyan-400)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                                        <div style={{ marginBottom: 4, fontWeight: 'bold' }}>SENSORS ACTIVE:</div>
                                        <div>• LiDAR SCANNERS: ON</div>
                                        <div>• THERMAL ARRAYS: ON</div>
                                        <div>• RADAR ALTIMETER: ON</div>
                                    </div>
                                </div>

                                <div style={{ position: 'absolute', bottom: 20, left: 20, pointerEvents: 'none' }}>
                                    <div style={{ color: 'var(--cyan-500)', fontSize: 40, fontFamily: 'var(--font-mono)', opacity: 0.2 }}>
                                        {focusedDrone.lat.toFixed(6)}<br />
                                        {focusedDrone.lon.toFixed(6)}
                                    </div>
                                </div>
                            </div>

                            {/* Analytical Sidebar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                <div className="card" style={{ flex: 1 }}>
                                    <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--cyan-400)', letterSpacing: '0.1em' }}>
                                        REAL-TIME ANALYTICS
                                    </div>
                                    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                        {/* Signal Stability Animation simulation */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>SIGNAL STABILITY</span>
                                                <span style={{ fontSize: 10, color: 'var(--green-400)' }}>98.2%</span>
                                            </div>
                                            <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                                                {[...Array(30)].map((_, i) => (
                                                    <div key={i} style={{
                                                        flex: 1,
                                                        height: `${40 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%`,
                                                        background: 'var(--cyan-500)',
                                                        opacity: 0.3 + (i / 30) * 0.7
                                                    }} />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Power Consumption */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>POWER CONSUMPTION RATE</span>
                                                <span style={{ fontSize: 10, color: 'var(--amber-400)' }}>1.2%/min</span>
                                            </div>
                                            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: '45%', height: '100%', background: 'var(--amber-500)' }} />
                                            </div>
                                        </div>

                                        {/* Mission Objective */}
                                        <div style={{ padding: 12, border: '1px solid var(--cyan-900)', borderRadius: 'var(--radius-md)', background: 'rgba(0,10,20,0.5)' }}>
                                            <div style={{ fontSize: 10, color: 'var(--cyan-400)', marginBottom: 8, fontWeight: 700 }}>CURRENT MISSION</div>
                                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 12 }}>
                                                Autonomous Perimeter Patrol - Sector Delta
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {[1, 2, 3, 4, 5].map(step => (
                                                    <div key={step} style={{
                                                        flex: 1, height: 4,
                                                        background: step <= 3 ? 'var(--cyan-500)' : 'var(--bg-elevated)',
                                                        borderRadius: 2
                                                    }} />
                                                ))}
                                            </div>
                                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8 }}>
                                                STATION 3/5: NAVIGATING TO WAYPOINT OSCAR
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button className="btn btn--primary" style={{ width: '100%', height: 50, fontSize: 'var(--text-lg)' }}>
                                    TAKE MANUAL OVERRIDE
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
