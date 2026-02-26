import { useState, useEffect } from 'react'
import { useAegisStore } from '../store'
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, Polyline, Polygon, Marker } from 'react-leaflet'
import { Eye, EyeOff, Layers, X, Navigation, Compass, BarChart3 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { findShortestPath } from '../utils/dijkstra'

/* ── Map View Tile Sources ── */
const TILE_LAYERS = {
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', label: 'Satellite', attr: '© Esri' },
    terrain: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', label: 'Terrain', attr: '© Esri' },
    street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', label: 'Street', attr: '© OSM' },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', label: 'Dark', attr: '© CARTO' },
}

type ViewMode = keyof typeof TILE_LAYERS

/* ── Risk color mapping ── */
const RISK_COLORS: Record<string, string> = {
    CRITICAL: '#DC2626', SEVERE: '#EA580C', MODERATE: '#F59E0B', LOW: '#22C55E', SAFE: '#3B82F6',
}

const RISK_RADIUS: Record<string, number> = {
    CRITICAL: 900, SEVERE: 750, MODERATE: 600, LOW: 500, SAFE: 400,
}

/* ── Landmark styling ── */
const LANDMARK_STYLES: Record<string, { color: string; label: string; shape: 'circle' | 'diamond' | 'square' | 'triangle' }> = {
    port: { color: '#3B82F6', label: 'Ports', shape: 'diamond' },
    station: { color: '#A78BFA', label: 'Stations', shape: 'square' },
    market: { color: '#F59E0B', label: 'Markets', shape: 'circle' },
    ship: { color: '#60A5FA', label: 'Ships', shape: 'diamond' },
    flight: { color: '#C084FC', label: 'Flights', shape: 'triangle' },
    shelter: { color: '#34D399', label: 'Shelters', shape: 'square' },
    hospital: { color: '#F87171', label: 'Hospitals', shape: 'triangle' },
}

/* ── Custom SVG Icon Makers ── */
const createShapeIcon = (color: string, shape: string) => {
    let svg = ''
    if (shape === 'diamond') svg = `<rect width="12" height="12" fill="${color}" transform="rotate(45 6 6)" />`
    else if (shape === 'square') svg = `<rect width="12" height="12" fill="${color}" />`
    else if (shape === 'triangle') svg = `<path d="M6 0L12 12H0Z" fill="${color}" />`
    else svg = `<circle cx="6" cy="6" r="6" fill="${color}" />`

    return L.divIcon({
        className: 'custom-map-icon',
        html: `<svg width="12" height="12" viewBox="0 0 12 12">${svg}</svg>`,
        iconSize: [12, 12],
    })
}

/* ── Population heat map data points (Mumbai) ── */
const HEAT_POINTS: { lat: number; lon: number; intensity: number }[] = [
    { lat: 19.043, lon: 72.853, intensity: 0.95 },
    { lat: 19.018, lon: 72.843, intensity: 0.85 },
    { lat: 19.073, lon: 72.870, intensity: 0.80 },
    { lat: 19.042, lon: 72.862, intensity: 0.75 },
    { lat: 19.114, lon: 72.870, intensity: 0.70 },
    { lat: 18.940, lon: 72.836, intensity: 0.65 },
    { lat: 19.030, lon: 72.821, intensity: 0.72 },
    { lat: 19.052, lon: 72.899, intensity: 0.60 },
    { lat: 19.055, lon: 72.840, intensity: 0.68 },
    { lat: 18.971, lon: 72.819, intensity: 0.62 },
    { lat: 19.098, lon: 72.835, intensity: 0.55 },
    { lat: 19.068, lon: 72.834, intensity: 0.70 },
    { lat: 19.010, lon: 72.845, intensity: 0.90 },
    { lat: 19.120, lon: 72.846, intensity: 0.50 },
]

/* ── Animated flood extent (simulated spreading water) ── */
const FLOOD_EXTENTS: { lat: number; lon: number; radius: number; depth: number }[] = [
    { lat: 19.043, lon: 72.851, radius: 450, depth: 4.2 },
    { lat: 19.038, lon: 72.855, radius: 350, depth: 3.1 },
    { lat: 19.046, lon: 72.848, radius: 280, depth: 2.5 },
    { lat: 19.010, lon: 72.845, radius: 600, depth: 5.5 },
    { lat: 19.008, lon: 72.848, radius: 380, depth: 3.8 },
    { lat: 19.013, lon: 72.842, radius: 300, depth: 2.1 },
    { lat: 19.073, lon: 72.868, radius: 400, depth: 2.9 },
    { lat: 19.030, lon: 72.822, radius: 350, depth: 1.8 },
    { lat: 19.042, lon: 72.862, radius: 300, depth: 1.4 },
]

/* ── Liquid Flood Effect Component ── */
function FloodExtentLayer() {
    const [tick, setTick] = useState(0)

    useEffect(() => {
        let frame = 0
        const animate = () => {
            frame++
            if (frame % 4 === 0) setTick(t => t + 1)
            requestAnimationFrame(animate)
        }
        const animId = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animId)
    }, [])

    return (
        <>
            {FLOOD_EXTENTS.map((ext, i) => {
                const basePulse = Math.sin((tick + i * 15) * 0.05)
                const secondaryPulse = Math.cos((tick * 0.7 + i * 20) * 0.04)

                return (
                    <g key={`flood-grp-${i}`}>
                        {/* 1. Deep Core — Representing max depth */}
                        <Circle
                            center={[ext.lat, ext.lon]}
                            radius={ext.radius * 0.6 + basePulse * 20}
                            pathOptions={{
                                fillColor: 'var(--cyan-600)',
                                fillOpacity: 0.4 + basePulse * 0.05,
                                color: 'var(--cyan-400)',
                                weight: 1,
                                className: 'flood-core'
                            }}
                        />
                        {/* 2. Main Body — Liquid spread */}
                        <Circle
                            center={[ext.lat, ext.lon]}
                            radius={ext.radius + secondaryPulse * 40}
                            pathOptions={{
                                fillColor: 'var(--cyan-500)',
                                fillOpacity: 0.2 + secondaryPulse * 0.03,
                                color: 'var(--cyan-300)',
                                weight: 0.5,
                                dashArray: '5, 10',
                                className: 'flood-spread'
                            }}
                        />
                        {/* 3. Surface Tension / Edge — Representing the leading edge of water */}
                        <Circle
                            center={[ext.lat, ext.lon]}
                            radius={ext.radius * 1.2 + (basePulse + secondaryPulse) * 15}
                            pathOptions={{
                                color: 'var(--cyan-300)',
                                weight: 0.8,
                                fillOpacity: 0,
                                opacity: 0.3 + basePulse * 0.1,
                                dashArray: '2, 15',
                                className: 'flood-edge'
                            }}
                        />
                        {/* 4. Depth Contour — Labels showing water level at point */}
                        <CircleMarker
                            center={[ext.lat, ext.lon]}
                            radius={2}
                            pathOptions={{ color: 'var(--cyan-100)', opacity: 0.8, fillOpacity: 1 }}
                        >
                            <Popup>
                                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--cyan-500)' }}>DEPTH DATA</div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>{ext.depth}m</div>
                                    <div style={{ color: 'var(--text-muted)' }}>Live telemetry</div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    </g>
                )
            })}
        </>
    )
}

/* ── View Mode Switcher Component ── */
function TileLayerSwitcher({ view }: { view: ViewMode }) {
    return (
        <TileLayer
            key={view}
            attribution={TILE_LAYERS[view].attr}
            url={TILE_LAYERS[view].url}
        />
    )
}

/* ── LAYER DEFINITIONS ── */
const LAYER_DEFS = [
    { id: 'floodExtent', label: 'Flood Extent', color: '#06B6D4', description: 'Live water spread' },
    { id: 'riskZones', label: 'Risk Zones', color: '#DC2626', description: 'Severity overlay' },
    { id: 'heatmap', label: 'Population Density', color: '#F97316', description: 'Heat map' },
    { id: 'drones', label: 'Drone Positions', color: '#F97316', description: 'Active fleet' },
    { id: 'ports', label: 'Ports', color: '#3B82F6' },
    { id: 'stations', label: 'Stations', color: '#A78BFA' },
    { id: 'markets', label: 'Markets', color: '#F59E0B' },
    { id: 'ships', label: 'Ships', color: '#60A5FA' },
    { id: 'flights', label: 'Flights', color: '#C084FC' },
    { id: 'shelters', label: 'Shelters', color: '#34D399' },
    { id: 'hospitals', label: 'Hospitals', color: '#F87171' },
    { id: 'traffic', label: 'Tactical Routes', color: '#FCD34D', description: 'Major corridors' },
    { id: 'terrain', label: 'Terrain Contours', color: '#6EE7B7', description: 'Elevation' },
    { id: 'evacZones', label: 'Evacuation Zones', color: '#10B981', description: 'Safe/Danger zones' },
    { id: 'activePaths', label: 'Operation Paths', color: '#A78BFA', description: 'Flight/Heli/Road' },
]

export default function MapPage() {
    const { zones, drones, landmarks, role, evacuationZones, activePaths, roadNetwork } = useAegisStore()
    const [activeLayers, setActiveLayers] = useState<Set<string>>(
        new Set(['floodExtent', 'riskZones', 'drones', 'stations', 'shelters', 'evacZones', 'activePaths'])
    )
    const [navPath, setNavPath] = useState<[number, number][]>([])
    const [navStart, setNavStart] = useState<string>('N1')
    const [navEnd, setNavEnd] = useState<string>('N5')
    const [viewMode, setViewMode] = useState<ViewMode>('satellite')
    const [selectedZone, setSelectedZone] = useState<string | null>(null)
    const selected = zones.find(z => z.name === selectedZone)

    const toggleLayer = (id: string) => {
        const next = new Set(activeLayers)
        next.has(id) ? next.delete(id) : next.add(id)
        setActiveLayers(next)
    }

    const roleAction = role === 'GOVERNMENT' ? 'ISSUE EVACUATION ORDER' :
        role === 'RESPONDER' ? 'DISPATCH RESCUE TEAM' : 'PLAN MY ESCAPE ROUTE'

    const [showDepthAnalysis, setShowDepthAnalysis] = useState(false)

    const runNavigation = () => {
        const pathIds = findShortestPath(roadNetwork as any, navStart, navEnd)
        const coords = pathIds.map(id => {
            const node = roadNetwork.nodes.find(n => n.id === id)
            return node ? [node.lat, node.lon] : null
        }).filter(c => c !== null) as [number, number][]
        setNavPath(coords)
    }

    return (
        <div className="page-enter" style={{
            height: 'calc(100vh - 64px - 64px)', position: 'relative',
            margin: 'calc(var(--space-8) * -1)',
        }}>
            <MapContainer center={[19.0500, 72.8600]} zoom={13}
                style={{ height: '100%', width: '100%', background: 'var(--bg-void)' }}
                zoomControl={false}>

                <TileLayerSwitcher view={viewMode} />

                {/* Live Flood Extent — animated water spreading */}
                {activeLayers.has('floodExtent') && <FloodExtentLayer />}

                {/* Risk Zones — color-coded circles */}
                {activeLayers.has('riskZones') && zones.map(zone => (
                    <Circle key={zone.name}
                        center={[zone.lat, zone.lon]}
                        radius={RISK_RADIUS[zone.risk] || 500}
                        pathOptions={{
                            color: RISK_COLORS[zone.risk], fillColor: RISK_COLORS[zone.risk],
                            fillOpacity: 0.22, weight: 1.5, dashArray: zone.risk === 'CRITICAL' ? '6,4' : undefined,
                        }}
                        eventHandlers={{ click: () => setSelectedZone(zone.name) }}>
                        <Popup><div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontSize: 13, background: 'var(--bg-surface)', padding: 4 }}>
                            <strong>{zone.name}</strong> — {zone.risk}<br />
                            Flood: {zone.floodLevel}m · Pop: {zone.population.toLocaleString()}
                        </div></Popup>
                    </Circle>
                ))}

                {/* Heat Map — population density circles */}
                {activeLayers.has('heatmap') && HEAT_POINTS.map((pt, i) => (
                    <Circle key={`heat-${i}`}
                        center={[pt.lat, pt.lon]}
                        radius={280 + pt.intensity * 200}
                        pathOptions={{
                            color: 'transparent',
                            fillColor: pt.intensity > 0.8 ? 'var(--red-600)' : pt.intensity > 0.6 ? 'var(--orange-500)' : 'var(--amber-500)',
                            fillOpacity: pt.intensity * 0.35,
                            weight: 0,
                        }} />
                ))}

                {/* Drone Markers */}
                {activeLayers.has('drones') && drones.filter(d => d.status === 'AIRBORNE').map(drone => (
                    <CircleMarker key={drone.id} center={[drone.lat, drone.lon]} radius={6}
                        pathOptions={{ color: 'var(--orange-500)', fillColor: 'var(--orange-500)', fillOpacity: 1, weight: 2 }}>
                        <Popup><div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: 11 }}>
                            {drone.id} — ALT: {drone.altitude}m<br />BAT: {drone.battery}% — SPD: {drone.speed}m/s
                        </div></Popup>
                    </CircleMarker>
                ))}

                {/* Landmarks - Shape Diversified */}
                {Object.keys(LANDMARK_STYLES).map(type => {
                    if (!activeLayers.has(`${type}s`) && !activeLayers.has(type)) return null
                    const cfg = LANDMARK_STYLES[type]
                    return landmarks.filter(l => l.type === type).map(lm => (
                        <CircleMarker key={lm.id} center={[lm.lat, lm.lon]} radius={6}
                            pathOptions={{ color: 'transparent', fillColor: 'transparent' }}>
                            <Popup><div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontSize: 12 }}>
                                <strong>{lm.name}</strong><br /><em>{type.toUpperCase()}</em>
                            </div></Popup>
                            <Marker position={[lm.lat, lm.lon]} icon={createShapeIcon(cfg.color, cfg.shape)} />
                        </CircleMarker>
                    ))
                })}

                {/* Tactical Navigation Path */}
                {navPath.length > 0 && (
                    <Polyline positions={navPath} pathOptions={{ color: 'var(--green-400)', weight: 5, opacity: 0.9, lineCap: 'round', dashArray: '10, 15', className: 'path-blink' }} />
                )}

                {/* Evacuation Zones */}
                {activeLayers.has('evacZones') && evacuationZones.map((zone: any) => (
                    <Polygon
                        key={zone.id}
                        positions={zone.coords}
                        pathOptions={{
                            fillColor: zone.type === 'SAFE' ? 'var(--green-500)' : 'var(--red-500)',
                            fillOpacity: 0.15,
                            color: zone.type === 'SAFE' ? 'var(--green-400)' : 'var(--red-400)',
                            weight: 2,
                            dashArray: zone.type === 'DANGER' ? '5, 10' : undefined
                        }}
                    >
                        <Popup>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{zone.name} ({zone.type})</div>
                        </Popup>
                    </Polygon>
                ))}

                {/* Depth Analysis Visualization */}
                {showDepthAnalysis && FLOOD_EXTENTS.map((ext, i) => (
                    <CircleMarker
                        key={`depth-an-${i}`}
                        center={[ext.lat, ext.lon]}
                        radius={15}
                        pathOptions={{ color: 'var(--purple-400)', weight: 1, dashArray: '2, 4', fillOpacity: 0.1 }}
                    >
                        <Popup>
                            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                                <div style={{ color: 'var(--text-muted)' }}>SENSOR DEPTH: {ext.depth}m</div>
                                <div style={{ color: 'var(--purple-400)', fontWeight: 700 }}>PROJECTED: {(ext.depth * 1.2).toFixed(1)}m</div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                {/* Path Layers */}
                {activeLayers.has('activePaths') && activePaths.map((path: any) => (
                    <Polyline
                        key={path.id}
                        positions={path.coords}
                        pathOptions={{
                            color: path.type === 'FLIGHT' ? 'var(--purple-400)' : path.type === 'HELI' ? 'var(--cyan-400)' : 'var(--amber-400)',
                            weight: 3,
                            opacity: 0.7,
                            dashArray: path.type === 'ROAD' ? '12, 12' : undefined,
                            className: path.type === 'ROAD' ? 'path-blink' : ''
                        }}
                    />
                ))}

                {/* Navigation Result Path */}
                {/* (Will be implemented with Dijkstra selection logic) */}
            </MapContainer>

            {/* ── Top Right: LIVE + View Mode Switcher ── */}
            <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 1000,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <div className="live-indicator">LIVE</div>
                <button
                    onClick={() => setShowDepthAnalysis(!showDepthAnalysis)}
                    style={{
                        background: showDepthAnalysis ? 'var(--purple-500)' : 'var(--bg-overlay)',
                        border: '1px solid var(--border-strong)',
                        color: showDepthAnalysis ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    <BarChart3 size={12} />
                    DEPTH ANALYSIS
                </button>
                <div style={{
                    display: 'flex', gap: 2, background: 'var(--bg-overlay)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)',
                    padding: 2,
                    backdropFilter: 'blur(8px)',
                }}>
                    {(Object.keys(TILE_LAYERS) as ViewMode[]).map(v => (
                        <button key={v} onClick={() => setViewMode(v)} style={{
                            padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-xs)',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                            transition: 'var(--transition-fast)',
                            background: viewMode === v ? 'var(--cyan-500)' : 'transparent',
                            color: viewMode === v ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        }}>{TILE_LAYERS[v].label}</button>
                    ))}
                </div>
            </div>

            {/* ── Left Panel: Layers + Legend ── */}
            <div className="glass-panel" style={{
                position: 'absolute', top: 16, left: 16, zIndex: 1000,
                width: 240, maxHeight: 'calc(100% - 32px)', overflowY: 'auto',
            }}>
                {/* Flood Risk Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Layers size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        FLOOD RISK
                    </span>
                </div>
                {['CRITICAL', 'SEVERE', 'MODERATE', 'LOW', 'SAFE'].map(level => (
                    <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, fontSize: 10, color: 'var(--text-secondary)' }}>
                        <div style={{ width: 14, height: 8, borderRadius: 2, background: RISK_COLORS[level] }} />
                        {level}
                    </div>
                ))}

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />

                {/* Layer Toggles */}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    LAYERS
                </div>
                {LAYER_DEFS.map(layer => (
                    <button key={layer.id} onClick={() => toggleLayer(layer.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        width: '100%', padding: '4px 0',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: activeLayers.has(layer.id) ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: 11, textAlign: 'left', fontFamily: 'var(--font-body)',
                        transition: 'var(--transition-fast)', opacity: activeLayers.has(layer.id) ? 1 : 0.5,
                    }}>
                        {activeLayers.has(layer.id) ? <Eye size={10} /> : <EyeOff size={10} />}
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: layer.color, flexShrink: 0 }} />
                        {layer.label}
                    </button>
                ))}

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />

                {/* City info */}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    MUMBAI · MAHARASHTRA<br />19.0760°N · 72.8777°E
                </div>
            </div>

            {/* ── Zone Detail Panel ── */}
            {selected && (
                <div style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, zIndex: 1000,
                    background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-strong)',
                    overflowY: 'auto', animation: 'slide-in-right 300ms ease both',
                    padding: 'var(--space-6)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{selected.name}</h2>
                        <button onClick={() => setSelectedZone(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
                    </div>
                    <span className={`badge badge--${selected.risk.toLowerCase()}`}>{selected.risk}</span>

                    <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>CURRENT FLOOD LEVEL</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-5xl)', fontWeight: 700 }}>{selected.floodLevel}m</div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>PREDICTED PEAK (72H)</span>
                                <span className="ai-badge" style={{ fontSize: 8, padding: '1px 5px' }}>AI</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--purple-400)' }}>{selected.predicted72h}m</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>POPULATION AT RISK</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--red-400)' }}>{selected.population.toLocaleString()}</div>
                        </div>

                        {/* 24/48/72H predictions */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[{ l: '24H', v: selected.predicted24h }, { l: '48H', v: selected.predicted48h }, { l: '72H', v: selected.predicted72h }].map(p => (
                                <div key={p.l} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center', border: '1px solid rgba(139,92,246,0.2)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-ai)', letterSpacing: '0.1em', marginBottom: 4 }}>{p.l}</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--purple-400)' }}>{p.v}m</div>
                                </div>))}
                        </div>

                        <button className={`btn ${role === 'GOVERNMENT' ? 'btn--danger' : role === 'RESPONDER' ? 'btn--warning' : 'btn--primary'} btn--lg btn--full`}
                            style={{ marginTop: 'var(--space-4)' }}>{roleAction}</button>
                    </div>
                </div>
            )}

            {/* ── Navigation Trigger (Government/Responder Only) ── */}
            {(role === 'GOVERNMENT' || role === 'RESPONDER') && (
                <div className="glass-panel" style={{
                    position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
                    width: 320, padding: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Navigation size={14} color="var(--cyan-400)" />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cyan-400)' }}>LOGISTICAL PATHFINDING</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 4 }}>ORIGIN</div>
                            <select value={navStart} onChange={e => setNavStart(e.target.value)} style={{ width: '100%', background: 'var(--bg-void)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontSize: 10, padding: 4 }}>
                                {roadNetwork.nodes.map(n => <option key={n.id} value={n.id}>{n.id} (Lat: {n.lat})</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 4 }}>DESTINATION</div>
                            <select value={navEnd} onChange={e => setNavEnd(e.target.value)} style={{ width: '100%', background: 'var(--bg-void)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontSize: 10, padding: 4 }}>
                                {roadNetwork.nodes.map(n => <option key={n.id} value={n.id}>{n.id} (Lat: {n.lat})</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={runNavigation} className="btn btn--primary btn--sm btn--full" style={{ gap: 8 }}>
                        <Compass size={12} />
                        CALCULATE TACTICAL ROUTE
                    </button>
                    {navPath.length > 0 && (
                        <button onClick={() => setNavPath([])} style={{ background: 'none', border: 'none', color: 'var(--red-400)', fontSize: 9, marginTop: 8, cursor: 'pointer', width: '100%' }}>CLEAR PATH</button>
                    )}
                </div>
            )}

            <style>{`
                .path-blink {
                    animation: dash-blink 1.5s infinite linear;
                }
                @keyframes dash-blink {
                    to { stroke-dashoffset: -24; }
                }
                .custom-map-icon {
                    background: transparent;
                    border: none;
                }
            `}</style>
        </div>
    )
}
