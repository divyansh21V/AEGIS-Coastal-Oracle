import { useState, useRef, useEffect } from 'react'
import {
    Upload,
    Layers, Download, Cpu, MapPin
} from 'lucide-react'
import { useAegisStore } from '../store'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/* ───────────────────────────────────────────
   Region-specific Terrain + Scene Configs
   Expanded to provide unique 3D data for ALL drones
─────────────────────────────────────────────────── */
type RegionConfig = {
    terrainColor: string
    terrainStyle: 'coastal' | 'hilly' | 'flat' | 'ridged' | 'river' | 'urban'
    fogColor: string
    accentColor: string
    waterLevel?: number
    annotations: { pos: [number, number]; label: string; type: 'risk' | 'asset' | 'mission' }[]
    structures: { pos: [number, number]; height: number; type: 'industrial' | 'residential' | 'utility' }[]
    droneName: string
    droneId: string
    locationName: string
    lat: string
    lon: string
}

const REGION_CONFIGS: Record<string, RegionConfig> = {
    'MDL-001': {
        locationName: 'Dharavi Industrial Core – Mumbai',
        lat: '19.0410', lon: '72.8523',
        terrainStyle: 'urban',
        terrainColor: '#1a1a2e',
        fogColor: '#0d1117',
        accentColor: '#22d3ee',
        droneName: 'Sentinel Alpha', droneId: 'AEGIS-01',
        annotations: [
            { pos: [72.8524, 19.0412], label: 'STRUCTURAL RISK: Bldg-14A', type: 'risk' },
            { pos: [72.8510, 19.0405], label: 'EMERGENCY REFUGE ALPHA', type: 'asset' },
        ],
        structures: [
            { pos: [72.852, 19.041], height: 35, type: 'industrial' },
            { pos: [72.853, 19.042], height: 20, type: 'residential' },
        ]
    },
    'MDL-002': {
        locationName: 'Mithi River Flood Zone – Zone F',
        lat: '19.0660', lon: '72.8545',
        terrainStyle: 'river',
        terrainColor: '#0c1a0c',
        fogColor: '#061206',
        accentColor: '#34d399',
        droneName: 'Sentinel Bravo', droneId: 'AEGIS-02',
        annotations: [
            { pos: [72.8546, 19.0662], label: 'EMBANKMENT BREACH POINT', type: 'risk' },
            { pos: [72.8530, 19.0655], label: 'MOBILE PUMP UNIT 04', type: 'asset' },
        ],
        structures: [
            { pos: [72.854, 19.066], height: 12, type: 'utility' },
        ]
    },
    'MDL-003': {
        locationName: 'JNPT Port Complex – Nhava Sheva',
        lat: '18.9500', lon: '72.9300',
        terrainStyle: 'coastal',
        terrainColor: '#0a1628',
        fogColor: '#060d1a',
        accentColor: '#60a5fa',
        droneName: 'Guardian Charlie', droneId: 'AEGIS-03',
        annotations: [
            { pos: [72.9302, 18.9502], label: 'UNSTABLE CONTAINER STACK', type: 'risk' },
            { pos: [72.9280, 18.9490], label: 'TUG BOAT HUB', type: 'asset' },
        ],
        structures: [
            { pos: [72.931, 18.951], height: 45, type: 'industrial' },
        ]
    },
    'MDL-004': {
        locationName: 'Sahyadri Ridge – Western Ghats',
        lat: '19.2200', lon: '73.1700',
        terrainStyle: 'ridged',
        terrainColor: '#14241a',
        fogColor: '#0a150e',
        accentColor: '#86efac',
        droneName: 'Sentinel Delta', droneId: 'AEGIS-04',
        annotations: [
            { pos: [73.1705, 19.2205], label: 'LANDSLIDE ANOMALY DETECTED', type: 'risk' },
            { pos: [73.1680, 19.2190], label: 'FOREST RANGER OUTPOST', type: 'asset' },
        ],
        structures: [
            { pos: [73.172, 19.222], height: 50, type: 'utility' },
        ]
    },
    'MDL-005': {
        locationName: 'Kurla Slum Redevelopment — Zone C',
        lat: '19.0726', lon: '72.8912',
        terrainStyle: 'flat',
        terrainColor: '#1c1208',
        fogColor: '#110b04',
        accentColor: '#fb923c',
        droneName: 'Sentinel Echo', droneId: 'AEGIS-05',
        annotations: [
            { pos: [72.8915, 19.0728], label: 'UTILITY LINE RUPTURE', type: 'risk' },
            { pos: [72.8900, 19.0710], label: 'COMMUNITY MEDICAL CAMP', type: 'asset' },
        ],
        structures: [
            { pos: [72.892, 19.073], height: 25, type: 'residential' },
        ]
    },
    'MDL-006': {
        locationName: 'BKC Financial District – Bandra',
        lat: '19.0594', lon: '72.8659',
        terrainStyle: 'urban',
        terrainColor: '#0d0d1f',
        fogColor: '#070710',
        accentColor: '#a78bfa',
        droneName: 'Guardian Foxtrot', droneId: 'AEGIS-06',
        annotations: [
            { pos: [72.8662, 19.0600], label: 'HIGH-RISE EVACUATION LOBBY', type: 'asset' },
            { pos: [72.8650, 19.0585], label: 'BASEMENT FLOOD SENSOR 09', type: 'risk' },
        ],
        structures: [
            { pos: [72.867, 19.061], height: 80, type: 'industrial' },
        ]
    },
}

function MapLibreViewer({ config, status }: {
    config: RegionConfig; status: string
}) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const { waterLevel } = useAegisStore();

    const latNum = parseFloat(config.lat);
    const lonNum = parseFloat(config.lon);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tiles.stadiamaps.com/styles/alidade_satellite.json?api_key=2aa31eab-fb8f-4097-96fd-efb7ae69ebfa',
            center: [lonNum, latNum],
            zoom: 16,
            pitch: 65,
            bearing: -15
        });

        map.current.on('style.load', () => {
            const m = map.current;
            if (!m) return;

            // 1. 3D Terrain
            m.addSource('terrain-source', {
                type: 'raster-dem',
                tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                encoding: 'terrarium',
                tileSize: 256,
                maxzoom: 14
            });
            m.setTerrain({ source: 'terrain-source', exaggeration: 2.5 });

            // 2. Resource Markers Layer (GeoJSON)
            m.addSource('resources', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: config.annotations.map(a => ({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: a.pos },
                        properties: { label: a.label, type: a.type }
                    }))
                }
            });

            m.addLayer({
                id: 'resource-markers',
                type: 'circle',
                source: 'resources',
                paint: {
                    'circle-radius': 8,
                    'circle-color': [
                        'match', ['get', 'type'],
                        'risk', '#EF4444',
                        'asset', '#10B981',
                        'mission', '#3B82F6',
                        '#FFFFFF'
                    ],
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#FFFFFF'
                }
            });

            // 3. Volumetric Water Layer
            m.addSource('flood-plane', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [lonNum - 0.015, latNum - 0.015],
                            [lonNum + 0.015, latNum - 0.015],
                            [lonNum + 0.015, latNum + 0.015],
                            [lonNum - 0.015, latNum + 0.015],
                            [lonNum - 0.015, latNum - 0.015]
                        ]]
                    },
                    properties: {}
                }
            });

            m.addLayer({
                id: 'flood-volume',
                type: 'fill-extrusion',
                source: 'flood-plane',
                paint: {
                    'fill-extrusion-color': '#06B6D4',
                    'fill-extrusion-height': waterLevel * 25,
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.45
                }
            });

            // 4. Custom Prop Structures
            m.addSource('structures', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: (config.structures || []).map((s) => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[
                                [s.pos[0] - 0.0005, s.pos[1] - 0.0005],
                                [s.pos[0] + 0.0005, s.pos[1] - 0.0005],
                                [s.pos[0] + 0.0005, s.pos[1] + 0.0005],
                                [s.pos[0] - 0.0005, s.pos[1] + 0.0005],
                                [s.pos[0] - 0.0005, s.pos[1] - 0.0005]
                            ]]
                        },
                        properties: { height: s.height }
                    }))
                }
            });

            m.addLayer({
                id: 'custom-structures',
                type: 'fill-extrusion',
                source: 'structures',
                paint: {
                    'fill-extrusion-color': '#1E293B',
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.9
                }
            });
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [config.droneId, waterLevel]);

    useEffect(() => {
        if (map.current && map.current.isStyleLoaded()) {
            map.current.flyTo({ center: [lonNum, latNum], essential: true, zoom: 16 });
        }
    }, [latNum, lonNum]);

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%', outline: 'none' }} />
            <div style={{
                position: 'absolute', top: 16, left: 16,
                background: 'rgba(255, 255, 255, 0.9)', color: 'var(--text-primary)',
                padding: '14px 20px', borderRadius: 'var(--radius-lg)',
                border: `1px solid ${config.accentColor}55`,
                backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 100,
                display: 'flex', flexDirection: 'column', gap: 4
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: status === 'COMPLETE' ? '#10B981' : '#F59E0B',
                        animation: 'indicator-pulse 2s infinite',
                        // @ts-ignore
                        '--indicator-color-rgb': status === 'COMPLETE' ? '16, 185, 129' : '245, 158, 11'
                    } as React.CSSProperties} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        {config.locationName.split('–')[0].trim()}
                    </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    MISSION GEO: {config.lat}°N / {config.lon}°E
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <div style={{ background: `${config.accentColor}22`, color: config.accentColor, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>{config.droneId} ONLINE</div>
                    <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>LIVE Lidar</div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8 }}>
                {config.annotations.map((a, i) => (
                    <div key={i} style={{
                        background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: 6,
                        borderLeft: `3px solid ${a.type === 'risk' ? '#EF4444' : '#10B981'}`,
                        fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        <MapPin size={12} color={a.type === 'risk' ? '#EF4444' : '#10B981'} />
                        {a.label}
                    </div>
                ))}
            </div>
        </div>
    )
}

const MOCK_MODELS = [
    { id: 'MDL-001', zone: 'Dharavi Core', status: 'COMPLETE', vertices: '12.4M', coverage: '2.4 km²', resolution: '2.3 cm/px', odm: { engine: 'ODM v2.5.1' } },
    { id: 'MDL-002', zone: 'Mithi Basin', status: 'PROCESSING', vertices: '—', coverage: '1.8 km²', resolution: '3.1 cm/px', odm: { engine: 'ODM v2.5.1' } },
    { id: 'MDL-003', zone: 'JNPT Port', status: 'COMPLETE', vertices: '28.1M', coverage: '3.7 km²', resolution: '1.8 cm/px', odm: { engine: 'ODM v2.6.0' } },
    { id: 'MDL-004', zone: 'Sahyadri', status: 'COMPLETE', vertices: '15.2M', coverage: '2.9 km²', resolution: '2.5 cm/px', odm: { engine: 'ODM v2.6.0' } },
    { id: 'MDL-005', zone: 'Kurla Slum', status: 'PROCESSING', vertices: '—', coverage: '1.2 km²', resolution: '3.5 cm/px', odm: { engine: 'ODM v2.5.1' } },
    { id: 'MDL-006', zone: 'BKC District', status: 'COMPLETE', vertices: '42.6M', coverage: '4.8 km²', resolution: '1.5 cm/px', odm: { engine: 'ODM v2.6.1' } },
]

export default function Photogrammetry() {
    const [selected, setSelected] = useState('MDL-001')

    const config = REGION_CONFIGS[selected] || REGION_CONFIGS['MDL-001']
    const model = MOCK_MODELS.find(m => m.id === selected) || MOCK_MODELS[0]

    return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minHeight: '100vh', paddingBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 800, marginBottom: 4 }}>3D Mission Reconstruction</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        Precision Photogrammetry Pipeline — Edge-Processed via {config.droneId}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div className="npu-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3B82F633', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Cpu size={18} color="#3B82F6" className="animate-pulse" />
                        <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 800 }}>GEOMETRY ENGINE ACTIVE</span>
                    </div>
                    <button className="btn btn--primary shadow-glow" onClick={() => alert('Secure Upload Link Generated')}>
                        <Upload size={16} /> NEW DATASET
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: 'var(--space-4)', height: 'calc(100vh - 240px)', flex: 1 }}>
                {/* Mission List */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card__header" style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.02)' }}>
                        <span className="card__title" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.05em' }}>DRONE MISSION LOGS</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {MOCK_MODELS.map(m => {
                            const rc = REGION_CONFIGS[m.id]
                            return (
                                <div key={m.id} onClick={() => setSelected(m.id)} style={{
                                    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                                    borderLeft: m.id === selected ? `4px solid ${rc.accentColor}` : '4px solid transparent',
                                    background: m.id === selected ? 'rgba(0,0,0,0.02)' : 'transparent',
                                    transition: 'all 0.2s ease'
                                }} className="list-hover-effect">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color: m.id === selected ? rc.accentColor : 'inherit' }}>{m.id}</span>
                                        <span style={{ fontSize: 9, fontWeight: 800, color: m.status === 'COMPLETE' ? '#10B981' : '#F59E0B' }}>{m.status}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{rc.locationName}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.vertices} Vertices • {m.coverage}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 3D Map View */}
                <div className="card shadow-soft" style={{ padding: 0, overflow: 'hidden', position: 'relative', border: '1px solid var(--border-strong)' }}>
                    <MapLibreViewer config={config} status={model.status} />
                </div>

                {/* Analytics Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div className="card shadow-soft">
                        <div className="card__header">
                            <span className="card__title">ODM INFRASTRUCTURE</span>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>ENGINE PIPELINE</div>
                            <div style={{ fontWeight: 800, color: config.accentColor, fontSize: 18, fontFamily: 'var(--font-mono)' }}>{model.odm.engine}</div>

                            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>RESOLUTION</div>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{model.resolution}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>VERTICES</div>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{model.vertices}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-soft" style={{ flex: 1 }}>
                        <div className="card__header">
                            <span className="card__title">ACTION PROTOCOLS</span>
                        </div>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button className="btn btn--ghost w-full" style={{ justifyContent: 'flex-start' }} onClick={() => alert('HDS Export Initiated')}>
                                <Download size={14} /> EXPORT GEOTIFF (2GB)
                            </button>
                            <button className="btn btn--ghost w-full" style={{ justifyContent: 'flex-start' }} onClick={() => alert('Point Cloud Sent to CAD')}>
                                <Layers size={14} /> POINT CLOUD (LAS)
                            </button>
                            <div style={{ marginTop: 10, padding: 14, borderRadius: 8, background: 'rgba(0,0,0,0.03)', border: '1px dashed var(--border-strong)' }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: config.accentColor, marginBottom: 6 }}>AI ASSESSMENT</div>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>
                                    Detected {config.annotations.filter(a => a.type === 'risk').length} structural criticalities in current flight sector.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
