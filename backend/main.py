"""
AEGIS Cortex - FastAPI Backend
AI-Powered Predictive Flood Monitoring System
Target: Mumbai, Maharashtra, India
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import math
import time
import random
import sys
import os
import numpy as np
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from aegis_sim.engine import calculate_stockdon_runup, calculate_flood_risk
from aegis_sim.inference import InferenceEngine
from aegis_sim.recorder import get_recorder

app = FastAPI(title="AEGIS Cortex", version="1.0",
              description="AI-Powered Predictive Flood Monitoring - Mumbai, India")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

inference = InferenceEngine()
recorder = get_recorder()
sensor_buffer = deque(maxlen=24)
PREDICTION_MODE = "hybrid"


CITY = {
    "name": "Mumbai",
    "state": "Maharashtra, India",
    "lat": 19.0760,
    "lon": 72.8777,
    "timezone": "IST",
    "beach_slope": 0.035,
}

SECTORS = {
    "Sector 1 - Colaba": {
        "wall_height": 2.8, "population": 18000,
        "lat": 18.9067, "lon": 72.8147,
        "structural_integrity": 72, "grid_integrity": 78,
    },
    "Sector 2 - Worli Seaface": {
        "wall_height": 3.2, "population": 22000,
        "lat": 19.0176, "lon": 72.8150,
        "structural_integrity": 85, "grid_integrity": 88,
    },
    "Sector 3 - Dharavi": {
        "wall_height": 1.5, "population": 65000,
        "lat": 19.0438, "lon": 72.8534,
        "structural_integrity": 45, "grid_integrity": 52,
    },
    "Sector 4 - JNPT / Nhava Sheva": {
        "wall_height": 4.8, "population": 12000,
        "lat": 18.9500, "lon": 72.9500,
        "structural_integrity": 91, "grid_integrity": 93,
    },
    "Sector 5 - Juhu Beach": {
        "wall_height": 2.0, "population": 15000,
        "lat": 19.0988, "lon": 72.8267,
        "structural_integrity": 68, "grid_integrity": 74,
    },
}

ROADS = {
    "Marine Drive": 1.8,
    "Western Express Hwy": 4.5,
    "SV Road (Bandra)": 3.2,
    "LBS Marg (Kurla)": 2.5,
    "Harbour Link Road": 1.4,
    "Carter Road (Bandra)": 1.2,
}

SHELTERS = [
    {
        "id": "sh-1", "name": "BMC Community Hall - Dadar", "lat": 19.0178, "lon": 72.8478,
        "capacity": 800, "current_occupancy": 0, "status": "OPEN",
        "distance_km": 1.5, "supplies": ["Water", "Medical", "Wi-Fi", "Generator"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-2", "name": "Mumbai University Campus", "lat": 18.9316, "lon": 72.8316,
        "capacity": 2500, "current_occupancy": 0, "status": "OPEN",
        "distance_km": 3.2, "supplies": ["Water", "Medical", "Wi-Fi", "Food"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-3", "name": "NSCI Dome - Worli", "lat": 19.0200, "lon": 72.8190,
        "capacity": 3000, "current_occupancy": 120, "status": "OPEN",
        "distance_km": 2.1, "supplies": ["Water", "Medical", "Generator"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-4", "name": "KEM Hospital", "lat": 19.0000, "lon": 72.8400,
        "capacity": 1500, "current_occupancy": 450, "status": "OPEN",
        "distance_km": 2.8, "supplies": ["Water", "Medical", "Generator", "Food"],
        "safe_routes_available": True, "accessibility": "High Rating",
    },
    {
        "id": "sh-5", "name": "Andheri Sports Complex", "lat": 19.1197, "lon": 72.8464,
        "capacity": 1200, "current_occupancy": 0, "status": "STANDBY",
        "distance_km": 5.0, "supplies": ["Water", "Food"],
        "safe_routes_available": False, "accessibility": "Moderate",
    },
]

INFRASTRUCTURE = [
    {"name": "Bandra-Worli Sea Link", "lat": 19.0380, "lon": 72.8160,
     "type": "bridge", "score": 94, "risk": "Critical Failure Risk"},
    {"name": "Tata Power Trombay", "lat": 19.0050, "lon": 72.9100,
     "type": "power", "score": 82, "risk": "Moderate Risk"},
    {"name": "NDRF Station Andheri", "lat": 19.1136, "lon": 72.8697,
     "type": "shelter", "score": 55, "risk": "Stable Structure"},
    {"name": "BPCL Mahul Refinery", "lat": 19.0200, "lon": 72.9200,
     "type": "industrial", "score": 88, "risk": "Low Risk"},
    {"name": "Mumbai Port Trust", "lat": 18.9350, "lon": 72.8450,
     "type": "port", "score": 70, "risk": "Moderate Risk"},
]

DRONES = [
    {"id": "drone-alpha", "name": "Alpha", "status": "ACTIVE", "battery": 78,
     "altitude_m": 120, "speed_ms": 4.5, "lat": 19.0438, "lon": 72.8534,
     "signal_dbm": -42, "data_rate": "12kb/s"},
    {"id": "drone-bravo", "name": "Bravo", "status": "ACTIVE", "battery": 65,
     "altitude_m": 85, "speed_ms": 3.2, "lat": 19.0176, "lon": 72.8150,
     "signal_dbm": -55, "data_rate": "8kb/s"},
    {"id": "drone-charlie", "name": "Charlie", "status": "STANDBY", "battery": 92,
     "altitude_m": 0, "speed_ms": 0, "lat": 18.9316, "lon": 72.8316,
     "signal_dbm": -30, "data_rate": "0kb/s"},
    {"id": "drone-delta", "name": "Delta", "status": "RETURNING", "battery": 23,
     "altitude_m": 45, "speed_ms": 6.1, "lat": 19.0988, "lon": 72.8267,
     "signal_dbm": -68, "data_rate": "4kb/s"},
]

SHIPS = [
    {"id": "mv-101", "name": "MV Mumbai Maersk", "type": "cargo", "status": "In Transit", "speed_knots": 12.5, "lat": 18.8800, "lon": 72.9200, "heading": 310},
    {"id": "mv-102", "name": "INS Teg", "type": "military", "status": "Patrol", "speed_knots": 18.0, "lat": 18.9200, "lon": 72.7500, "heading": 290},
    {"id": "fv-201", "name": "Macchimar 7", "type": "fishing", "status": "Fishing", "speed_knots": 3.2, "lat": 19.0900, "lon": 72.8100, "heading": 120},
    {"id": "fv-202", "name": "Versova Star", "type": "fishing", "status": "Fishing", "speed_knots": 2.8, "lat": 19.1300, "lon": 72.8000, "heading": 140},
    {"id": "tnk-301", "name": "Reliance Tanker", "type": "tanker", "status": "Anchored", "speed_knots": 0.0, "lat": 18.9500, "lon": 72.9600, "heading": 0},
]

PORTS = [
    {"id": "port-1", "name": "Nhava Sheva (JNPT)", "lat": 18.9500, "lon": 72.9500, "status": "Active", "capacity": 90},
    {"id": "port-2", "name": "Sassoon Docks", "lat": 18.9100, "lon": 72.8350, "status": "Congested", "capacity": 95},
    {"id": "port-3", "name": "Mumbai Port Trust Docks", "lat": 18.9350, "lon": 72.8450, "status": "Active", "capacity": 65},
]

POPULATION_HOTSPOTS = [
    {"lat": 19.0438, "lon": 72.8534, "density": "Very High", "count": 65000, "label": "Dharavi"},
    {"lat": 19.0540, "lon": 72.8400, "density": "High", "count": 35000, "label": "Kurla West"},
    {"lat": 19.0176, "lon": 72.8150, "density": "High", "count": 22000, "label": "Worli Koliwada"},
    {"lat": 19.0988, "lon": 72.8267, "density": "Medium", "count": 15000, "label": "Juhu / Versova"},
]


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
        wind = max(1, 6.0 + 3.0 * math.sin(elapsed * 0.03) + random.uniform(-0.5, 0.5))
        pressure = max(970, 1008 - 8 * math.sin(elapsed * 0.02) + random.uniform(-1, 1))
        temp = get_coastal_temp()

        runup = calculate_stockdon_runup(H0, T, CITY["beach_slope"])
        min_wall = min(s["wall_height"] for s in SECTORS.values())
        overall_risk = calculate_flood_risk(runup, min_wall)

        sensor_buffer.append([H0, T, temp, wind, pressure])
        
        lstm_prediction = None
        hybrid_prediction = None
        if len(sensor_buffer) >= 24:
            sequence = np.array(list(sensor_buffer), dtype=np.float32)
            lstm_prediction = inference.predict_lstm(sequence)
            hybrid_prediction = inference.predict_hybrid(sequence, runup, alpha=0.6)

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
                alert_log.append({"time": ts, "message": f"{name} - Risk Level CRITICAL",
                                  "severity": "critical", "type": "risk"})
            elif s["status"] == "HIGH" and random.random() < 0.008:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": f"{name} - Risk Updated to HIGH",
                                  "severity": "high", "type": "risk"})
        
        while len(alert_log) > 30:
            alert_log.pop(0)

        peak_prediction_time = "06:00 AM" if H0 < 2.5 else "04:30 AM"

        recorder.record_telemetry(
            ocean={"wave_height_m": H0, "wave_period_s": T, "wind_speed_mps": wind,
                   "pressure_hpa": pressure, "temp_c": temp},
            physics={"runup_m": runup, "overall_risk": overall_risk},
            lstm=lstm_prediction,
            system={"inference_device": inference.get_device_status(),
                    "model_loaded": inference.lstm_loaded},
            mode=PREDICTION_MODE,
        )

        payload = {
            "type": "telemetry",
            "timestamp": time.time(),
            "city": CITY,
            "ocean": {
                "wave_height_m": round(H0, 2),
                "wave_period_s": round(T, 1),
                "wind_speed_mps": round(wind, 2),
                "pressure_hpa": round(pressure, 1),
                "temp_c": temp,
            },
            "physics": {
                "runup_m": round(runup, 3),
                "overall_risk": overall_risk,
                "max_runup_m": round(max(f["runup_m"] for f in forecast), 3),
            },
            "lstm_prediction": lstm_prediction,
            "hybrid_prediction": hybrid_prediction,
            "prediction_mode": PREDICTION_MODE,
            "risk_zone": risk_zone,
            "window_for_action": window,
            "key_metrics": {
                "max_wave_runup": round(runup, 2),
                "affected_population": total_affected,
                "safe_routes": f"{safe_routes}/{len(roads)}",
                "coastal_temp_c": temp,
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
            "recording": recorder.get_stats(),
            "system": {
                "inference_device": inference.get_device_status(),
                "onnx_providers": inference.providers,
                "model_loaded": inference.session is not None,
                "lstm_loaded": inference.lstm_loaded,
                "update_hz": 2,
                "physics_engine": "Stockdon2006",
                "lstm_engine": "AEGIS-LSTM-v1" if inference.lstm_loaded else "Mock",
                "prediction_mode": PREDICTION_MODE,
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
                alert_log.append({"time": ts, "message": "EVACUATION AUTHORIZED by Commander",
                                  "severity": "critical", "type": "action"})
                await mgr.broadcast({"type": "alert", "action": "EVACUATION_AUTHORIZED"})
            elif "DEPLOY_WARNING" in msg:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": "Warning deployed to all zones",
                                  "severity": "high", "type": "action"})
                await mgr.broadcast({"type": "alert", "action": "WARNING_DEPLOYED"})
            elif "EMERGENCY_BROADCAST" in msg:
                ts = time.strftime("%H:%M")
                alert_log.append({"time": ts, "message": "Emergency broadcast sent to all users",
                                  "severity": "critical", "type": "broadcast"})
                await mgr.broadcast({"type": "alert", "action": "EMERGENCY_BROADCAST"})
    except WebSocketDisconnect:
        mgr.disconnect(ws)

@app.get("/")
def root():
    return {"status": "AEGIS Cortex Online", "version": "1.0", "city": CITY["name"],
            "lstm_loaded": inference.lstm_loaded, "prediction_mode": PREDICTION_MODE}

@app.get("/api/system")
def system_status():
    return {
        "name": "AEGIS",
        "version": "1.0",
        "city": CITY,
        "inference_device": inference.get_device_status(),
        "onnx_providers": inference.providers,
        "physics_engine": "Stockdon2006",
        "lstm_engine": "AEGIS-LSTM-v1" if inference.lstm_loaded else "Not Loaded",
        "prediction_mode": PREDICTION_MODE,
        "model_status": inference.get_model_status(),
        "sectors": list(SECTORS.keys()),
        "roads": list(ROADS.keys()),
        "shelters": [s["name"] for s in SHELTERS],
        "drones": [d["name"] for d in DRONES],
        "ships": [s["name"] for s in SHIPS],
    }

@app.get("/api/recordings")
def get_recordings():
    """Return recent recorded telemetry entries for audit trail."""
    return {
        "stats": recorder.get_stats(),
        "recent": recorder.get_recent(50),
    }

@app.get("/api/model-status")
def model_status():
    """Return comprehensive model and inference status."""
    return inference.get_model_status()
