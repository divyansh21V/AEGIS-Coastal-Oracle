import { create } from 'zustand'
import { supabase } from './lib/supabase'

export type Role = 'CIVILIAN' | 'RESPONDER' | 'GOVERNMENT'

export interface DroneData {
    id: string
    name: string
    status: 'AIRBORNE' | 'RETURNING' | 'OFFLINE' | 'CHARGING'
    battery: number
    altitude: number
    speed: number
    signal: number
    zone: string
    lat: number
    lon: number
}

export interface ZoneData {
    name: string
    risk: 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW' | 'SAFE'
    population: number
    floodLevel: number
    predicted24h: number
    predicted48h: number
    predicted72h: number
    evacuationStatus: 'CLEARED' | 'IN_PROGRESS' | 'PENDING' | 'NOT_STARTED'
    utilityStatus: 'STABLE' | 'DISRUPTED' | 'CRITICAL'
    lat: number
    lon: number
}

export interface AlertData {
    id: string
    severity: 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW'
    title: string
    zone: string
    time: string
    description: string
    read: boolean
}

export interface LandmarkData {
    id: string
    type: 'port' | 'station' | 'market' | 'ship' | 'flight' | 'shelter' | 'hospital'
    name: string
    lat: number
    lon: number
}

export interface RoadNode {
    id: string
    lat: number
    lon: number
}

export interface RoadEdge {
    from: string
    to: string
    weight: number
}

export interface EvacuationZone {
    id: string
    name: string
    type: 'SAFE' | 'DANGER' | 'RESTRICTED'
    coords: [number, number][]
}

export interface PathData {
    id: string
    type: 'FLIGHT' | 'HELI' | 'ROAD'
    status: 'ACTIVE' | 'ARCHIVED'
    coords: [number, number][]
}

interface AegisStore {
    isAuthenticated: boolean
    currentUser: {
        id: string
        name: string
        email: string
        avatar?: string
    } | null
    login: (role: Role) => void
    logout: () => void
    role: Role
    setRole: (role: Role) => void
    theme: 'light' | 'dark'
    toggleTheme: () => void
    drones: DroneData[]
    zones: ZoneData[]
    alerts: AlertData[]
    landmarks: LandmarkData[]
    workUnits: any[]
    activeAlerts: number
    zonesMonitored: number
    dronesAirborne: number
    predictedRise24h: number
    peopleAtRisk: number
    aiConfidence: number
    aiModelHealth: number
    aiDrift: number
    inferenceLatency: number
    reliefSuccessRate: number
    assistanceRequests: number
    climateLatency: number
    atmosphericPressure: number
    coordIndex: number
    lastSync: number
    isLoading: boolean
    initializeData: () => Promise<void>
    deployAllDrones: () => void
    weatherSync: 'ACTIVE' | 'SYNCING' | 'OFFLINE'
    windSpeed: number
    windDirection: string
    humidity: number
    precipitationChance: number
    uvIndex: number
    visibility: number
    waterLevel: number
    currentRisk: number
    roadNetwork: { nodes: RoadNode[], edges: RoadEdge[] }
    evacuationZones: EvacuationZone[]
    activePaths: PathData[]
}

export const useAegisStore = create<AegisStore>((set, get) => ({
    isAuthenticated: false,
    currentUser: null,
    login: (role) => set({
        isAuthenticated: true,
        role,
        currentUser: { id: 'OP-7721', name: role === 'GOVERNMENT' ? 'Strategic Commander' : 'Field Operator', email: role === 'GOVERNMENT' ? 'admin@aegis.gov' : 'operator@aegis.com' }
    }),
    logout: () => set({ isAuthenticated: false, currentUser: null }),
    role: 'RESPONDER',
    setRole: (role) => set({ role }),
    theme: 'dark',
    toggleTheme: () => set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', nextTheme)
        return { theme: nextTheme }
    }),
    drones: [],
    zones: [],
    alerts: [],
    landmarks: [],
    workUnits: [],
    activeAlerts: 4,
    zonesMonitored: 8,
    dronesAirborne: 0,
    predictedRise24h: 0,
    peopleAtRisk: 0,
    aiConfidence: 0,
    aiModelHealth: 99.4,
    aiDrift: 0.02,
    inferenceLatency: 42,
    reliefSuccessRate: 94.2,
    isLoading: false,
    weatherSync: 'ACTIVE',
    windSpeed: 18.5,
    windDirection: 'SW',
    humidity: 72,
    precipitationChance: 65,
    uvIndex: 4,
    visibility: 8.2,
    waterLevel: 2.1,
    currentRisk: 0.45,
    assistanceRequests: 1422,
    climateLatency: 124,
    atmosphericPressure: 1008.4,
    coordIndex: 88,
    lastSync: Date.now(),

    initializeData: async () => {
        set({ isLoading: true })
        try {
            // Fetch Zones
            const { data: zonesData } = await supabase.from('zones').select('*')
            if (zonesData) {
                const mappedZones = zonesData.map(z => ({
                    name: z.name, risk: z.risk, population: z.population,
                    floodLevel: Number(z.flood_level), predicted24h: Number(z.predicted_24h),
                    predicted48h: Number(z.predicted_48h), predicted72h: Number(z.predicted_72h),
                    evacuationStatus: z.evacuation_status, utilityStatus: z.utility_status,
                    lat: Number(z.lat), lon: Number(z.lon)
                }))
                set({ zones: mappedZones, zonesMonitored: mappedZones.length })
            }

            // Fetch Drones
            const { data: dronesData } = await supabase.from('drones').select('*')
            if (dronesData) {
                const mappedDrones = dronesData.map(d => ({
                    id: d.id, name: d.name, status: d.status, battery: d.battery,
                    altitude: d.altitude, speed: Number(d.speed), signal: d.signal,
                    zone: d.zone, lat: Number(d.lat), lon: Number(d.lon)
                }))
                set({ drones: mappedDrones, dronesAirborne: mappedDrones.filter(d => d.status === 'AIRBORNE').length })
            }

            // Fetch Alerts
            const { data: alertsData } = await supabase.from('alerts').select('*').order('created_at', { ascending: false })
            if (alertsData) {
                set({
                    alerts: alertsData.map(a => ({
                        id: a.id, severity: a.severity, title: a.title, zone: a.zone,
                        time: a.time_label, description: a.description, read: a.read
                    })),
                    activeAlerts: alertsData.filter(a => !a.read).length
                })
            }

            // Fetch KPIs
            const { data: kpiData } = await supabase.from('system_kpis').select('*')
            if (kpiData) {
                const kpis: any = {}
                kpiData.forEach(k => { kpis[k.key] = Number(k.value) })
                set({ ...kpis })
            }

            // Real-time Subscriptions
            supabase.channel('drone-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'drones' }, payload => {
                const currentDrones = get().drones
                if (payload.eventType === 'UPDATE') {
                    set({ drones: currentDrones.map(d => d.id === payload.new.id ? { ...d, ...payload.new, lat: Number(payload.new.lat), lon: Number(payload.new.lon), speed: Number(payload.new.speed) } : d) })
                }
            }).subscribe()

        } catch (error) {
            console.error('Error initializing data:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    deployAllDrones: () => set((state) => ({
        drones: state.drones.map(d =>
            d.status === 'CHARGING' || d.status === 'RETURNING' || d.status === 'OFFLINE'
                ? { ...d, status: 'AIRBORNE', battery: d.battery > 0 ? d.battery : 100, altitude: 100, speed: 10 }
                : d
        )
    })),

    roadNetwork: {
        nodes: [{ id: 'N1', lat: 18.940, lon: 72.836 }, { id: 'N2', lat: 19.018, lon: 72.843 }, { id: 'N3', lat: 19.043, lon: 72.853 }, { id: 'N4', lat: 19.073, lon: 72.870 }, { id: 'N5', lat: 19.114, lon: 72.870 }, { id: 'N6', lat: 18.971, lon: 72.830 }, { id: 'N7', lat: 19.030, lon: 72.835 }],
        edges: [{ from: 'N1', to: 'N6', weight: 4.2 }, { from: 'N6', to: 'N2', weight: 5.1 }, { from: 'N2', to: 'N3', weight: 3.5 }, { from: 'N3', to: 'N4', weight: 4.8 }, { from: 'N4', to: 'N5', weight: 6.2 }, { from: 'N7', to: 'N2', weight: 2.8 }, { from: 'N7', to: 'N3', weight: 2.1 }]
    },
    evacuationZones: [{ id: 'ZONE-RED-1', name: 'Mithi River Basin', type: 'DANGER', coords: [[19.050, 72.850], [19.060, 72.860], [19.080, 72.870], [19.070, 72.880], [19.040, 72.860]] }, { id: 'ZONE-GREEN-1', name: 'Bandra Reclamation High', type: 'SAFE', coords: [[19.030, 72.815], [19.035, 72.825], [19.025, 72.825], [19.020, 72.815]] }],
    activePaths: [{ id: 'FLIGHT-A', type: 'FLIGHT', status: 'ACTIVE', coords: [[19.043, 72.853], [19.073, 72.860], [19.113, 72.880]] }, { id: 'HELI-B', type: 'HELI', status: 'ACTIVE', coords: [[19.010, 72.845], [19.030, 72.835], [19.055, 72.840]] }, { id: 'ROAD-C', type: 'ROAD', status: 'ACTIVE', coords: [[18.940, 72.836], [18.971, 72.830], [19.018, 72.843]] }]
}))
