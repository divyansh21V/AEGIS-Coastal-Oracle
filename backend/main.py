"""
AEGIS Cortex v5.3 — FastAPI Backend
AI-Powered Predictive Flood Monitoring System
Target: Visakhapatnam (Vizag), Andhra Pradesh, India
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import math
import time
import random
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from poseidon.engine import calculate_stockdon_runup, calculate_flood_risk
from poseidon.inference import InferenceEngine

app = FastAPI(title="AEGIS Cortex", version="5.3",
              description="AI-Powered Predictive Flood Monitoring — Visakhapatnam, India")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

inference = InferenceEngine()

# ═══════════════════════════════════════════════════════════
# VISAKHAPATNAM (VIZAG) — COASTAL CITY DATA
# ═══════════════════════════════════════════════════════════

CITY = {
    "name": "Visakhapatnam",
    "state": "Andhra Pradesh, India",
    "lat": 17.6868,
    "lon": 83.2185,
    "timezone": "IST",
    "beach_slope": 0.045,
}

SECTORS = {
    "Sector 1 — RK Beach": {
        "wall_height": 2.5, "population": 12000,
        "lat": 17.7145, "lon": 83.3255,
        "structural_integrity": 78, "grid_integrity": 85,
    },
    "Sector 2 — Rushikonda": {
        "wall_height": 3.0, "population": 5000,
        "lat": 17.7583, "lon": 83.3783,
        "structural_integrity": 91, "grid_integrity": 92,
    },
    "Sector 3 — Fishing Harbour": {
        "wall_height": 1.8, "population": 25000,
        "lat": 17.6920, "lon": 83.2938,
        "structural_integrity": 62, "grid_integrity": 71,
    },
    "Sector 4 — Port Area": {
        "wall_height": 4.5, "population": 8000,
        "lat": 17.6808, "lon": 83.2790,
        "structural_integrity": 88, "grid_integrity": 90,
    },
    "Sector 5 — Lawson's Bay": {
        "wall_height": 2.2, "population": 6500,
        "lat": 17.7285, "lon": 83.3408,
        "structural_integrity": 74, "grid_integrity": 80,
    },
}

ROADS = {
    "Beach Road": 1.6,
    "NH-16 (Coastal Hwy)": 3.5,
    "Simhachalam Road": 5.0,
    "Old Gajuwaka Road": 2.8,
    "Harbour Approach Rd": 1.2,
    "RK Beach Promenade": 1.0,
}

SHELTERS = [
    {
        "id": "sh-1", "name": "GVMC Community Hall", "lat": 17.7120, "lon": 83.3180,
        "capacity": 500, "current_occupancy": 0, "status": "OPEN",
        "distance_km": 1.2, "supplies": ["Water", "Medical", "Wi-Fi", "Generator"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-2", "name": "Andhra University Campus", "lat": 17.7311, "lon": 83.3186,
        "capacity": 2000, "current_occupancy": 0, "status": "OPEN",
        "distance_km": 2.8, "supplies": ["Water", "Medical", "Wi-Fi", "Food"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-3", "name": "Central High Gym", "lat": 17.7050, "lon": 83.3000,
        "capacity": 350, "current_occupancy": 84, "status": "OPEN",
        "distance_km": 1.5, "supplies": ["Water", "Medical"],
        "safe_routes_available": True, "accessibility": "Moderate",
    },
    {
        "id": "sh-4", "name": "King George Hospital", "lat": 17.7147, "lon": 83.3017,
        "capacity": 1500, "current_occupancy": 320, "status": "OPEN",
        "distance_km": 3.1, "supplies": ["Water", "Medical", "Generator", "Food"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-5", "name": "Port Trust School", "lat": 17.6850, "lon": 83.2830,
        "capacity": 600, "current_occupancy": 0, "status": "STANDBY",
        "distance_km": 4.2, "supplies": ["Water", "Food"],
        "safe_routes_available": False, "accessibility": "Limited",
    },
]

INFRASTRUCTURE = [
    {"name": "North River Bridge", "lat": 17.7200, "lon": 83.3150,
     "type": "bridge", "score": 92, "risk": "Critical Failure Risk"},
    {"name": "Downtown Substation", "lat": 17.7100, "lon": 83.3050,
     "type": "power", "score": 78, "risk": "Moderate Risk"},
    {"name": "Eastside Shelter", "lat": 17.7050, "lon": 83.3200,
     "type": "shelter", "score": 45, "risk": "Stable Structure"},
    {"name": "HPCL Refinery", "lat": 17.6560, "lon": 83.2420,
     "type": "industrial", "score": 88, "risk": "Low Risk"},
    {"name": "Vizag Port", "lat": 17.6808, "lon": 83.2790,
     "type": "port", "score": 65, "risk": "Moderate Risk"},
]

DRONES = [
    {"id": "drone-alpha", "name": "Alpha", "status": "ACTIVE", "battery": 78,
     "altitude_m": 120, "speed_ms": 4.5, "lat": 17.7145, "lon": 83.3255,
     "signal_dbm": -42, "data_rate": "12kb/s"},
    {"id": "drone-bravo", "name": "Bravo", "status": "ACTIVE", "battery": 65,
     "altitude_m": 85, "speed_ms": 3.2, "lat": 17.6920, "lon": 83.2938,
     "signal_dbm": -55, "data_rate": "8kb/s"},
    {"id": "drone-charlie", "name": "Charlie", "status": "STANDBY", "battery": 92,
     "altitude_m": 0, "speed_ms": 0, "lat": 17.7311, "lon": 83.3186,
     "signal_dbm": -30, "data_rate": "0kb/s"},
    {"id": "drone-delta", "name": "Delta", "status": "RETURNING", "battery": 23,
     "altitude_m": 45, "speed_ms": 6.1, "lat": 17.7583, "lon": 83.3783,
     "signal_dbm": -68, "data_rate": "4kb/s"},
]

# New Maritime Data for v5.3
SHIPS = [
    {"id": "mv-101", "name": "MV Bengal Tiger", "type": "cargo", "status": "In Transit", "speed_knots": 12.5, "lat": 17.6500, "lon": 83.3500, "heading": 310},
    {"id": "mv-102", "name": "INS Jalashwa", "type": "military", "status": "Patrol", "speed_knots": 18.0, "lat": 17.6200, "lon": 83.4000, "heading": 290},
    {"id": "fv-201", "name": "Krishna 8", "type": "fishing", "status": "Fishing", "speed_knots": 3.2, "lat": 17.7000, "lon": 83.3600, "heading": 120},
    {"id": "fv-202", "name": "Ganga Star", "type": "fishing", "status": "Fishing", "speed_knots": 2.8, "lat": 17.7100, "lon": 83.3700, "heading": 140},
    {"id": "tnk-301", "name": "Global Energy", "type": "tanker", "status": "Anchored", "speed_knots": 0.0, "lat": 17.6600, "lon": 83.3200, "heading": 0},
]

PORTS = [
    {"id": "port-1", "name": "Vizag Container Terminal", "lat": 17.6900, "lon": 83.2900, "status": "Active", "capacity": 85},
    {"id": "port-2", "name": "Fishing Harbour Jetties", "lat": 17.6950, "lon": 83.2980, "status": "Congested", "capacity": 98},
    {"id": "port-3", "name": "Naval Dockyard", "lat": 17.6850, "lon": 83.2750, "status": "Restricted", "capacity": 60},
]

POPULATION_HOTSPOTS = [
    {"lat": 17.7145, "lon": 83.3255, "density": "High", "count": 12000, "label": "RK Beach Tourist Zone"},
    {"lat": 17.7285, "lon": 83.3408, "density": "Medium", "count": 6500, "label": "Lawson's Bay Residential"},
    {"lat": 17.6920, "lon": 83.2938, "density": "Very High", "count": 25000, "label": "Old Town / Harbour"},
    {"lat": 17.7583, "lon": 83.3783, "density": "Low", "count": 5000, "label": "Rushikonda IT Park"},
]

# ═══════════════════════════════════════════════════════════

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)
    async def broadcast(self, msg: dict):
        for ws in list(self.active):
            try:
                await ws.send_json(msg)
            except:
                pass

mgr = ConnectionManager()

def generate_forecast(base_H0: float, base_T: float, beta: float, hours: int = 4):
    forecast = []
    for minute in range(0, hours * 60, 10):
        storm_factor = 1.0 + 0.25 * math.sin(minute * 0.015) + 0.08 * (minute / 240)
        H0 = max(0.3, base_H0 * storm_factor + random.uniform(-0.15, 0.15))
        T = max(4, base_T + math.sin(minute * 0.01) * 1.2)
        runup = calculate_stockdon_runup(H0, T, beta)
        forecast.append({
            "time_offset_min": minute,
            "label": f"+{minute}m",
            "wave_height": round(H0, 2),
            "runup_m": round(runup, 3),
        })
    return forecast

def compute_sector_risks(runup: float):
    sectors = {}
    for name, info in SECTORS.items():
        margin = info["wall_height"] - runup
        if margin < 0:
            score = min(100, int(88 + abs(margin) * 12))
            status = "CRITICAL"
            rate = f"+{abs(margin)*8:.1f}cm/hr"
        elif margin < 0.5:
            score = int(68 + (0.5 - margin) * 40)
            status = "HIGH"
            rate = f"+{(0.5-margin)*6:.1f}cm/hr"
        elif margin < 1.5:
            score = int(30 + (1.5 - margin) * 25)
            status = "MODERATE"
            rate = f"+{(1.5-margin)*3:.1f}cm/hr"
        else:
            score = max(5, int(28 - margin * 5))
            status = "LOW"
            rate = "Stable"
        
        affected_pop = int(info["population"] * max(0, min(1, (runup / info["wall_height"])**2)))
        sectors[name] = {
            "score": min(100, max(0, score)),
            "status": status,
            "wall_height": info["wall_height"],
            "population": info["population"],
            "affected_population": affected_pop,
            "lat": info["lat"],
            "lon": info["lon"],
            "structural_integrity": info["structural_integrity"],
            "grid_integrity": info["grid_integrity"],
            "rate_of_rise": rate,
        }
    return sectors

def compute_road_status(runup: float):
    result = {}
    safe_count = 0
    for road, elev in ROADS.items():
        depth = max(0, runup - elev)
        if depth <= 0:
            result[road] = {"depth_cm": 0, "status": "DRY", "color": "green", "passable": True}
            safe_count += 1
        elif depth < 0.15:
            result[road] = {"depth_cm": round(depth * 100, 1), "status": "WET", "color": "yellow", "passable": True}
            safe_count += 1
        elif depth < 0.30:
            result[road] = {"depth_cm": round(depth * 100, 1), "status": "SHALLOW", "color": "orange", "passable": False}
        else:
            result[road] = {"depth_cm": round(depth * 100, 1), "status": "FLOODED", "color": "red", "passable": False}
    return result, safe_count

def get_coastal_temp():
    hour = int(time.strftime("%H"))
    base = 28.0
    variation = -2 * math.cos((hour - 14) * math.pi / 12)
    return round(base + variation + random.uniform(-0.5, 0.5), 1)

def get_risk_zone(overall_risk: str, runup: float, min_wall: float):
    margin = min_wall - runup
    if overall_risk == "CRITICAL":
        return {"zone": "RED ZONE", "color": "red", "message": "Immediate flooding detected. Evacuate now.",
                "evac_mins": max(5, int(margin * -30))}
    elif margin < 0.5:
        return {"zone": "YELLOW ZONE", "color": "yellow",
                "message": "Increasing water levels detected. Prepare to evacuate.",
                "evac_mins": max(15, int(margin * 60))}
    else:
        return {"zone": "GREEN ZONE", "color": "green",
                "message": "Water levels stable. Normal operations.", "evac_mins": 0}

def compute_window_for_action(runup: float, min_wall: float):
    """Countdown to when water reaches critical threshold of sea wall."""
    margin = min_wall - runup
    if margin <= 0:
        return {"hours": 0, "mins": 0, "secs": 0, "total_secs": 0, "urgent": True}
    # Estimate ~0.1m/hr rise rate
    hours_remaining = margin / 0.1
    total_secs = int(hours_remaining * 3600)
    h = total_secs // 3600
    m = (total_secs % 3600) // 60
    s = total_secs % 60
    return {"hours": min(h, 99), "mins": m, "secs": s, "total_secs": total_secs, "urgent": total_secs < 3600}

alert_log = []

async def telemetry_loop():
    t0 = time.time()
    while True:
        await asyncio.sleep(0.5)
        elapsed = time.time() - t0

        H0 = max(0.5, 2.0 + 1.2 * math.sin(elapsed * 0.025) + random.uniform(-0.1, 0.1))
        T = max(5, 9.0 + 2.0 * math.cos(elapsed * 0.018))

        runup = calculate_stockdon_runup(H0, T, CITY["beach_slope"])
        min_wall = min(s["wall_height"] for s in SECTORS.values())
        overall_risk = calculate_flood_risk(runup, min_wall)

        sectors = compute_sector_risks(runup)
        roads, safe_routes = compute_road_status(runup)
        forecast = generate_forecast(H0, T, CITY["beach_slope"], hours=4)
        
        total_affected = sum(s["affected_population"] for s in sectors.values())
        risk_zone = get_risk_zone(overall_risk, runup, min_wall)
        window = compute_window_for_action(runup, min_wall)

        # Simulate drone updates
        for d in DRONES:
            if d["status"] == "ACTIVE":
                d["lat"] += random.uniform(-0.0005, 0.0005)
                d["lon"] += random.uniform(-0.0005, 0.0005)
                d["battery"] = max(10, d["battery"] - random.uniform(0, 0.05))
                d["altitude_m"] += random.uniform(-2, 2)
                d["speed_ms"] = max(0, d["speed_ms"] + random.uniform(-0.3, 0.3))
        
        # Simulate Ship Movement
        for s in SHIPS:
            if s["speed_knots"] > 0:
                s["lat"] += random.uniform(-0.0002, 0.0002) * (s["speed_knots"]/20)
                s["lon"] += random.uniform(-0.0002, 0.0002) * (s["speed_knots"]/20)
                s["heading"] = (s["heading"] + random.uniform(-2, 2)) % 360
        
        # Update shelter occupancy
        for sh in SHELTERS:
            if sh["status"] == "OPEN" and risk_zone["zone"] != "GREEN ZONE":
                pct = sh["current_occupancy"] / sh["capacity"]
                if pct < 0.9:
                    sh["current_occupancy"] = min(sh["capacity"],
                        sh["current_occupancy"] + random.randint(0, 3))

        # Generate alerts
        for name, s in sectors.items():
            if s["status"] == "CRITICAL" and random.random() < 0.015:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": f"{name} — Risk Level CRITICAL",
                                  "severity": "critical", "type": "risk"})
            elif s["status"] == "HIGH" and random.random() < 0.008:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": f"{name} — Risk Updated to HIGH",
                                  "severity": "high", "type": "risk"})
        
        while len(alert_log) > 30:
            alert_log.pop(0)

        peak_prediction_time = "06:00 AM" if H0 < 2.5 else "04:30 AM"

        payload = {
            "type": "telemetry",
            "timestamp": time.time(),
            "city": CITY,
            "ocean": {
                "wave_height_m": round(H0, 2),
                "wave_period_s": round(T, 1),
            },
            "physics": {
                "runup_m": round(runup, 3),
                "overall_risk": overall_risk,
                "max_runup_m": round(max(f["runup_m"] for f in forecast), 3),
            },
            "risk_zone": risk_zone,
            "window_for_action": window,
            "key_metrics": {
                "max_wave_runup": round(runup, 2),
                "affected_population": total_affected,
                "safe_routes": f"{safe_routes}/{len(roads)}",
                "coastal_temp_c": get_coastal_temp(),
                "est_water_level_m": round(runup, 1),
                "rate_of_rise": f"+{random.uniform(0.2, 0.8):.1f}cm/hr",
                "risk_velocity": round(random.uniform(8, 18), 1),
                "peak_prediction": peak_prediction_time,
                "flood_water_rise_12h": round(runup * 0.6, 1),
            },
            "sectors": sectors,
            "roads": roads,
            "forecast": forecast,
            "shelters": SHELTERS,
            "infrastructure": INFRASTRUCTURE,
            "drones": DRONES,
            "ships": SHIPS,
            "ports": PORTS,
            "population_hotspots": POPULATION_HOTSPOTS,
            "alerts": alert_log[-10:],
            "system": {
                "inference_device": inference.get_device_status(),
                "onnx_providers": inference.providers,
                "model_loaded": inference.session is not None,
                "update_hz": 2,
                "physics_engine": "Stockdon2006",
            }
        }
        await mgr.broadcast(payload)

@app.on_event("startup")
async def startup():
    asyncio.create_task(telemetry_loop())

@app.websocket("/ws/telemetry")
async def ws_telemetry(ws: WebSocket):
    await mgr.connect(ws)
    try:
        while True:
            msg = await ws.receive_text()
            if "AUTHORIZE" in msg:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": "⚡ EVACUATION AUTHORIZED by Commander",
                                  "severity": "critical", "type": "action"})
                await mgr.broadcast({"type": "alert", "action": "EVACUATION_AUTHORIZED"})
            elif "DEPLOY_WARNING" in msg:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": "🔊 Warning deployed to all zones",
                                  "severity": "high", "type": "action"})
                await mgr.broadcast({"type": "alert", "action": "WARNING_DEPLOYED"})
            elif "EMERGENCY_BROADCAST" in msg:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": "📡 Emergency broadcast sent to all users",
                                  "severity": "critical", "type": "broadcast"})
                await mgr.broadcast({"type": "alert", "action": "EMERGENCY_BROADCAST"})
    except WebSocketDisconnect:
        mgr.disconnect(ws)

@app.get("/")
def root():
    return {"status": "AEGIS Cortex Online", "version": "5.3", "city": CITY["name"]}

@app.get("/api/system")
def system_status():
    return {
        "name": "AEGIS",
        "version": "5.3",
        "city": CITY,
        "inference_device": inference.get_device_status(),
        "onnx_providers": inference.providers,
        "physics_engine": "Stockdon2006",
        "sectors": list(SECTORS.keys()),
        "roads": list(ROADS.keys()),
        "shelters": [s["name"] for s in SHELTERS],
        "drones": [d["name"] for d in DRONES],
        "ships": [s["name"] for s in SHIPS],
    }
