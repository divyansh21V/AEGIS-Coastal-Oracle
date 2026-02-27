"""
AEGIS Synthetic Data Pipeline
Generates realistic time-series data for LSTM training with cyclone events,
seasonal patterns, and Brownian-motion weather transitions.
"""

import csv
import random
import os
import math
import json
import numpy as np
from datetime import datetime, timedelta

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
TRAINING_DIR = os.path.join(DATA_DIR, "floodnet_yolo")

NUM_TELEMETRY = 17520
NUM_SECTORS = 400
NUM_INFRA = 800
NUM_YOLO_LABELS = 200
NUM_CYCLONE_EVENTS = 18
CYCLONE_DURATION_HRS = (48, 120)

BUOY_STATIONS = [
    {"id": "BUOY-MUM-01", "name": "Mumbai Offshore",    "lat": 19.08, "lon": 72.70, "region": "Konkan Coast"},
    {"id": "BUOY-MUM-02", "name": "Juhu Nearshore",     "lat": 19.10, "lon": 72.80, "region": "Konkan Coast"},
    {"id": "BUOY-MUM-03", "name": "Nhava Sheva",        "lat": 18.95, "lon": 72.95, "region": "Konkan Coast"},
    {"id": "BUOY-GOA-01", "name": "Goa Offshore",       "lat": 15.30, "lon": 73.80, "region": "Canara Coast"},
    {"id": "BUOY-RNG-01", "name": "Ratnagiri Buoy",     "lat": 16.99, "lon": 73.30, "region": "Konkan Coast"},
    {"id": "BUOY-ALB-01", "name": "Alibaug Coastal",    "lat": 18.64, "lon": 72.87, "region": "Konkan Coast"},
    {"id": "BUOY-THN-01", "name": "Thane Creek",        "lat": 19.18, "lon": 72.97, "region": "Konkan Coast"},
    {"id": "BUOY-GUJ-01", "name": "Porbandar Offshore", "lat": 21.60, "lon": 69.60, "region": "Gujarat Coast"},
    {"id": "BUOY-KOC-01", "name": "Kochi Buoy",         "lat":  9.97, "lon": 76.25, "region": "Malabar Coast"},
    {"id": "BUOY-DVK-01", "name": "Daman Buoy",         "lat": 20.40, "lon": 72.80, "region": "Gujarat Coast"},
]

COASTAL_REGIONS = [
    {"name": "Gujarat Coast",    "lat_range": (20.0, 24.0), "lon_range": (68.0, 72.0)},
    {"name": "Konkan Coast",     "lat_range": (15.0, 20.0), "lon_range": (72.5, 74.0)},
    {"name": "Canara Coast",     "lat_range": (12.0, 15.0), "lon_range": (74.0, 75.0)},
    {"name": "Malabar Coast",    "lat_range": (8.0, 12.0),  "lon_range": (75.0, 77.0)},
    {"name": "Coromandel Coast", "lat_range": (10.0, 16.0), "lon_range": (79.0, 81.0)},
    {"name": "Andhra Coast",     "lat_range": (14.0, 19.0), "lon_range": (80.0, 85.0)},
    {"name": "Utkal Coast",      "lat_range": (19.0, 22.0), "lon_range": (84.0, 87.5)},
    {"name": "Bengal Coast",     "lat_range": (21.0, 22.5), "lon_range": (87.5, 89.0)},
]


def calculate_stockdon_runup(H0, T, beta_f=0.045):
    """Stockdon et al. (2006) R2% wave run-up."""
    g = 9.81
    L0 = (g * (T ** 2)) / (2 * math.pi)
    if H0 <= 0 or L0 <= 0:
        return 0.0
    setup = 0.35 * beta_f * math.sqrt(H0 * L0)
    swash = math.sqrt(H0 * L0 * (0.563 * (beta_f ** 2) + 0.004))
    R2 = 1.1 * (setup + (swash / 2))
    return max(0.0, round(R2, 4))


def calculate_risk(runup, wall_height=2.5):
    margin = wall_height - runup
    if margin < 0:
        return "CRITICAL"
    elif margin < 1.0:
        return "HIGH"
    else:
        return "SAFE"


def get_seasonal_baselines(month):
    """Return seasonal baseline parameters based on Indian monsoon patterns."""
    if month in [6, 7, 8, 9]:
        return {"wave_base": 2.2, "wave_var": 1.0, "wind_base": 8.5, "wind_var": 4.0,
                "pressure_base": 1002, "pressure_var": 8, "temp_base": 28.5, "temp_var": 1.5,
                "period_base": 9.0, "period_var": 2.5}
    elif month in [10, 11]:
        return {"wave_base": 1.8, "wave_var": 1.2, "wind_base": 6.0, "wind_var": 5.0,
                "pressure_base": 1005, "pressure_var": 10, "temp_base": 27.5, "temp_var": 2.0,
                "period_base": 8.5, "period_var": 3.0}
    elif month in [3, 4, 5]:
        return {"wave_base": 1.4, "wave_var": 0.6, "wind_base": 5.0, "wind_var": 3.0,
                "pressure_base": 1008, "pressure_var": 5, "temp_base": 30.0, "temp_var": 2.0,
                "period_base": 8.0, "period_var": 2.0}
    else:
        return {"wave_base": 0.9, "wave_var": 0.4, "wind_base": 3.5, "wind_var": 2.0,
                "pressure_base": 1012, "pressure_var": 4, "temp_base": 25.5, "temp_var": 1.5,
                "period_base": 7.5, "period_var": 1.5}


def brownian_step(current, target, volatility, dt=1.0):
    """Ornstein-Uhlenbeck mean-reverting random walk."""
    theta = 0.15
    drift = theta * (target - current) * dt
    diffusion = volatility * math.sqrt(dt) * random.gauss(0, 1)
    return current + drift + diffusion


def generate_cyclone_events(start_date, total_hours):
    events = []
    cyclone_templates = [
        {"cat": "VSCS", "max_wind": 140, "min_pressure": 976, "max_wave": 6.5},
        {"cat": "ESCS", "max_wind": 195, "min_pressure": 950, "max_wave": 8.0},
        {"cat": "SCS",  "max_wind": 100, "min_pressure": 988, "max_wave": 5.0},
        {"cat": "SuCS", "max_wind": 240, "min_pressure": 920, "max_wave": 9.0},
        {"cat": "CS",   "max_wind": 85,  "min_pressure": 992, "max_wave": 4.0},
    ]
    for i in range(NUM_CYCLONE_EVENTS):
        month_target = random.choice([4, 5, 10, 11, 12, 6])
        year_offset = random.choice([0, 1])
        target_date = start_date.replace(
            year=start_date.year + year_offset, month=month_target,
            day=random.randint(1, 25)
        )
        hour_offset = int((target_date - start_date).total_seconds() / 3600)
        if 0 <= hour_offset < total_hours - 120:
            template = random.choice(cyclone_templates)
            duration = random.randint(*CYCLONE_DURATION_HRS)
            affected_stations = random.sample(range(len(BUOY_STATIONS)), k=random.randint(2, 5))
            events.append({
                "start_hour": hour_offset, "duration": duration,
                "peak_hour": hour_offset + duration // 2,
                "template": template, "affected_stations": affected_stations,
                "name": f"TC-{start_date.year + year_offset}-{i+1:02d}",
            })
    return events


def get_cyclone_intensity(hour, event):
    start = event["start_hour"]
    duration = event["duration"]
    if hour < start or hour > start + duration:
        return 0.0
    pos = (hour - start) / duration
    if pos < 0.4:
        return (pos / 0.4) ** 1.5
    else:
        return ((1.0 - pos) / 0.6) ** 1.2


def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(TRAINING_DIR, "labels", "sample"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "recordings"), exist_ok=True)


def generate_telemetry():
    print(f"Generating {NUM_TELEMETRY:,} telemetry records...")
    file_path = os.path.join(DATA_DIR, "aggregated_buoy_telemetry.csv")
    start_date = datetime(2023, 1, 1)
    cyclone_events = generate_cyclone_events(start_date, NUM_TELEMETRY)
    print(f"  Injecting {len(cyclone_events)} cyclone events")

    station_states = {}
    for station in BUOY_STATIONS:
        station_states[station["id"]] = {
            "wave_height": 1.2 + random.uniform(-0.3, 0.3),
            "wind_speed": 5.0 + random.uniform(-1, 1),
            "pressure": 1010 + random.uniform(-3, 3),
            "temp": 27.0 + random.uniform(-1, 1),
            "period": 8.0 + random.uniform(-1, 1),
        }

    records = []
    storm_count = 0

    for i in range(NUM_TELEMETRY):
        timestamp = start_date + timedelta(hours=i)
        month = timestamp.month
        hour_of_day = timestamp.hour
        station_idx = i % len(BUOY_STATIONS)
        station = BUOY_STATIONS[station_idx]
        state = station_states[station["id"]]
        season = get_seasonal_baselines(month)
        diurnal = -1.5 * math.cos((hour_of_day - 14) * math.pi / 12)

        cyclone_factor = 0.0
        active_cyclone = None
        for event in cyclone_events:
            if station_idx in event["affected_stations"]:
                intensity = get_cyclone_intensity(i, event)
                if intensity > cyclone_factor:
                    cyclone_factor = intensity
                    active_cyclone = event

        if cyclone_factor > 0.1:
            templ = active_cyclone["template"]
            target_wave = season["wave_base"] + cyclone_factor * (templ["max_wave"] - season["wave_base"])
            target_wind = season["wind_base"] + cyclone_factor * (templ["max_wind"] / 3.6 - season["wind_base"])
            target_pressure = season["pressure_base"] - cyclone_factor * (season["pressure_base"] - templ["min_pressure"])
            target_period = season["period_base"] + cyclone_factor * 3.0

            state["wave_height"] = brownian_step(state["wave_height"], target_wave, 0.4)
            state["wind_speed"]  = brownian_step(state["wind_speed"], target_wind, 1.5)
            state["pressure"]    = brownian_step(state["pressure"], target_pressure, 2.0)
            state["period"]      = brownian_step(state["period"], target_period, 0.3)
            state["temp"]        = brownian_step(state["temp"], season["temp_base"] + diurnal - cyclone_factor * 2, 0.3)
        else:
            state["wave_height"] = brownian_step(state["wave_height"], season["wave_base"], season["wave_var"] * 0.15)
            state["wind_speed"]  = brownian_step(state["wind_speed"], season["wind_base"], season["wind_var"] * 0.2)
            state["pressure"]    = brownian_step(state["pressure"], season["pressure_base"], season["pressure_var"] * 0.3)
            state["period"]      = brownian_step(state["period"], season["period_base"], season["period_var"] * 0.1)
            state["temp"]        = brownian_step(state["temp"], season["temp_base"] + diurnal, 0.2)

        wave_h = round(max(0.1, state["wave_height"]), 2)
        period = round(max(4.0, min(18.0, state["period"])), 1)
        wind   = round(max(0.5, state["wind_speed"]), 2)
        press  = round(max(900, min(1020, state["pressure"])), 1)
        temp   = round(max(20.0, min(35.0, state["temp"])), 1)

        runup = calculate_stockdon_runup(wave_h, period)
        risk  = calculate_risk(runup)
        is_cyclone = 1 if cyclone_factor > 0.1 else 0
        if is_cyclone and cyclone_factor > 0.5:
            storm_count += 1

        records.append([
            timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
            station["id"], station["lat"], station["lon"],
            wave_h, period, temp, wind, press,
            runup, risk, is_cyclone,
            round(cyclone_factor, 3) if is_cyclone else 0.0,
        ])

    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp", "station_id", "lat", "lon",
            "wave_height_m", "period_s", "temp_c", "wind_speed_mps", "pressure_hpa",
            "runup_m", "risk_level", "is_cyclone_event", "cyclone_intensity"
        ])
        writer.writerows(records)

    storm_records = sum(1 for r in records if r[11] == 1)
    critical_records = sum(1 for r in records if r[10] == "CRITICAL")
    print(f"  Total: {len(records):,} | Storm: {storm_records:,} | Critical: {critical_records:,}")
    print(f"  Range: {records[0][0]} to {records[-1][0]}")

    meta = {
        "generated_at": datetime.now().isoformat(),
        "total_records": len(records),
        "date_range": {"start": records[0][0], "end": records[-1][0]},
        "stations": len(BUOY_STATIONS),
        "cyclone_events_injected": len(cyclone_events),
        "storm_records": storm_records,
        "critical_records": critical_records,
        "features": ["wave_height_m", "period_s", "temp_c", "wind_speed_mps", "pressure_hpa"],
        "targets": ["runup_m", "risk_level"],
        "physics_model": "Stockdon2006",
    }
    meta_path = os.path.join(DATA_DIR, "telemetry_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    return records


def generate_sectors():
    print(f"Generating {NUM_SECTORS} coastal sectors...")
    file_path = os.path.join(DATA_DIR, "scraped_coastal_sectors.csv")
    risks = ["SAFE", "LOW", "MODERATE", "SEVERE", "CRITICAL"]
    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "sector_id", "name", "region", "lat", "lon",
            "risk_level", "population", "elevation_m", "slope_beta",
            "drainage_score", "vegetation_cover_pct", "urbanization_pct"
        ])
        for i in range(NUM_SECTORS):
            region = random.choice(COASTAL_REGIONS)
            lat = round(random.uniform(*region["lat_range"]), 4)
            lon = round(random.uniform(*region["lon_range"]), 4)
            elevation = round(random.uniform(0.5, 25.0), 2)
            if elevation < 3:
                risk = random.choices(risks, weights=[5, 10, 20, 35, 30])[0]
            elif elevation < 8:
                risk = random.choices(risks, weights=[15, 25, 30, 20, 10])[0]
            else:
                risk = random.choices(risks, weights=[40, 30, 20, 8, 2])[0]
            writer.writerow([
                f"SEC-{i:04d}", f"{region['name'].split()[0]} Sector {i}",
                region["name"], lat, lon, risk,
                random.randint(2000, 150000), elevation,
                round(random.uniform(0.01, 0.08), 3),
                random.randint(20, 95), random.randint(5, 80), random.randint(10, 95),
            ])


def generate_infra():
    print(f"Generating {NUM_INFRA} infrastructure assets...")
    file_path = os.path.join(DATA_DIR, "infrastructure_master.csv")
    types = ["sea_wall", "bridge", "shelter", "hospital", "power_plant", "road_segment", "water_pump", "telecom_tower"]
    conditions = ["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"]
    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "asset_id", "type", "name", "lat", "lon",
            "condition", "elevation_m", "capacity",
            "last_inspection", "structural_score"
        ])
        for i in range(NUM_INFRA):
            region = random.choice(COASTAL_REGIONS)
            a_type = random.choice(types)
            inspection_date = datetime(2023, 1, 1) + timedelta(days=random.randint(0, 700))
            writer.writerow([
                f"AST-{i:04d}", a_type,
                f"{a_type.replace('_', ' ').title()} {i}",
                round(random.uniform(*region["lat_range"]), 4),
                round(random.uniform(*region["lon_range"]), 4),
                random.choice(conditions),
                round(random.uniform(-1.0, 15.0), 2),
                random.randint(50, 5000) if a_type in ["shelter", "hospital"] else "N/A",
                inspection_date.strftime("%Y-%m-%d"),
                random.randint(15, 100),
            ])


def generate_yolo_labels():
    print(f"Generating {NUM_YOLO_LABELS} YOLO virtual labels...")
    label_dir = os.path.join(TRAINING_DIR, "labels", "sample")
    for i in range(NUM_YOLO_LABELS):
        file_name = f"scraped_flood_img_{i:04d}.txt"
        with open(os.path.join(label_dir, file_name), "w") as f:
            for _ in range(random.randint(3, 8)):
                cls = random.randint(0, 5)
                x = round(random.random(), 4)
                y = round(random.random(), 4)
                w = round(random.uniform(0.05, 0.4), 4)
                h = round(random.uniform(0.05, 0.4), 4)
                f.write(f"{cls} {x} {y} {w} {h}\n")


def generate_cyclone_catalog():
    print(f"Generating extended cyclone catalog...")
    file_path = os.path.join(DATA_DIR, "historical_cyclones_extended.csv")
    seed_path = os.path.join(DATA_DIR, "historical_cyclones_imd.csv")
    seeds = []
    if os.path.exists(seed_path):
        with open(seed_path, "r") as f:
            reader = csv.DictReader(f)
            seeds = list(reader)

    categories = [
        "Cyclonic Storm", "Severe Cyclonic Storm",
        "Very Severe Cyclonic Storm", "Extremely Severe Cyclonic Storm",
        "Super Cyclonic Storm"
    ]
    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "cyclone_id", "name", "year", "month", "category",
            "max_wind_kmh", "central_pressure_hpa",
            "landfall_lat", "landfall_lon", "landfall_location",
            "surge_height_m", "rainfall_mm_24h",
            "affected_population", "deaths", "damage_inr_cr",
            "duration_hours", "track_length_km", "source"
        ])
        for s in seeds:
            writer.writerow([
                s.get("cyclone_id", ""), s.get("name", ""), s.get("year", ""), "",
                s.get("category", ""), s.get("max_wind_kmh", ""),
                s.get("central_pressure_hpa", ""), s.get("landfall_lat", ""),
                s.get("landfall_lon", ""), s.get("landfall_location", ""),
                s.get("surge_height_m", ""), s.get("rainfall_mm_24h", ""),
                s.get("affected_population", ""), s.get("deaths", ""),
                s.get("damage_inr_cr", ""), "", "", s.get("source", "IMD-Bulletin")
            ])
        names = [
            "DIYA", "SURYA", "VAAYU", "JALA", "MEGH", "ROSHNI", "AGNI", "NEERJA",
            "TARA", "GARJANA", "SHREYA", "MANDIRA", "DAKSHA", "SAHARA", "URJA",
            "TEJAS", "VARUN", "AMRIT", "KAVERI", "GODAVARI", "NARMADA", "TAPTI",
            "SABARI", "GIRI", "UDAY", "SHANTI", "ANKUR", "PRITHVI", "VEERA", "SINDHU"
        ]
        regions_lf = [
            (19.08, 72.88, "Mumbai MH"), (18.95, 72.95, "Nhava Sheva MH"),
            (16.99, 73.30, "Ratnagiri MH"), (15.30, 73.80, "Goa"),
            (23.10, 68.45, "Jakhau Gujarat"), (18.64, 72.87, "Alibaug MH"),
        ]
        for i in range(30):
            year = random.randint(1970, 2024)
            month = random.choice([4, 5, 10, 11, 12])
            cat = random.choice(categories)
            lf = random.choice(regions_lf)
            writer.writerow([
                f"TC-SYN-{i+1:03d}", names[i], year, month, cat,
                random.randint(65, 260), random.randint(910, 995),
                round(lf[0] + random.uniform(-0.5, 0.5), 2),
                round(lf[1] + random.uniform(-0.5, 0.5), 2), lf[2],
                round(random.uniform(0.5, 7.0), 1), random.randint(80, 500),
                random.randint(500000, 15000000), random.randint(0, 500),
                random.randint(100, 30000), random.randint(36, 168),
                random.randint(300, 2500), "Synthetic-IMD-Pattern"
            ])


if __name__ == "__main__":
    ensure_dirs()
    generate_telemetry()
    generate_sectors()
    generate_infra()
    generate_yolo_labels()
    generate_cyclone_catalog()
    print("\nData Pipeline complete. All files written to /data")
