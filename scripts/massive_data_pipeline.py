import csv
import random
import os
import math
from datetime import datetime, timedelta

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
TRAINING_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "floodnet_yolo")
NUM_TELEMETRY = 1500
NUM_SECTORS = 300
NUM_INFRA = 600
NUM_YOLO_LABELS = 150

# Indian Coastal Locations (Approximate bounding boxes)
COASTAL_REGIONS = [
    {"name": "Gujarat Coast", "lat_range": (20.0, 24.0), "lon_range": (68.0, 72.0)},
    {"name": "Konkan Coast", "lat_range": (15.0, 20.0), "lon_range": (72.5, 74.0)},
    {"name": "Canara Coast", "lat_range": (12.0, 15.0), "lon_range": (74.0, 75.0)},
    {"name": "Malabar Coast", "lat_range": (8.0, 12.0), "lon_range": (75.0, 77.0)},
    {"name": "Coromandel Coast", "lat_range": (10.0, 16.0), "lon_range": (79.0, 81.0)},
    {"name": "Andhra Coast", "lat_range": (14.0, 19.0), "lon_range": (80.0, 85.0)},
    {"name": "Utkal Coast", "lat_range": (19.0, 22.0), "lon_range": (84.0, 87.5)},
    {"name": "Bengal Coast", "lat_range": (21.0, 22.5), "lon_range": (87.5, 89.0)},
]

def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(TRAINING_DIR, "labels", "sample"), exist_ok=True)

def generate_telemetry():
    print(f"Generating {NUM_TELEMETRY} telemetry records...")
    file_path = os.path.join(DATA_DIR, "aggregated_buoy_telemetry.csv")
    base_time = datetime(2024, 1, 1)
    
    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "station_id", "lat", "lon", "wave_height_m", "period_s", "temp_c", "wind_speed_mps", "pressure_hpa"])
        
        for i in range(NUM_TELEMETRY):
            region = random.choice(COASTAL_REGIONS)
            lat = round(random.uniform(*region["lat_range"]), 4)
            lon = round(random.uniform(*region["lon_range"]), 4)
            
            # Stochastic weather patterns
            is_storm = random.random() < 0.05
            if is_storm:
                wave_height = round(random.uniform(4.0, 8.5), 2)
                wind_speed = round(random.uniform(15.0, 35.0), 2)
                pressure = round(random.uniform(960, 990), 1)
            else:
                wave_height = round(random.uniform(0.5, 2.5), 2)
                wind_speed = round(random.uniform(2.0, 10.0), 2)
                pressure = round(random.uniform(1000, 1015), 1)
                
            timestamp = (base_time + timedelta(hours=i)).isoformat() + "Z"
            writer.writerow([
                timestamp,
                f"BUOY-{random.randint(100, 999)}",
                lat, lon,
                wave_height,
                round(random.uniform(6.0, 12.0), 1),
                round(random.uniform(24.0, 31.0), 1),
                wind_speed,
                pressure
            ])

def generate_sectors():
    print(f"Generating {NUM_SECTORS} coastal sectors...")
    file_path = os.path.join(DATA_DIR, "scraped_coastal_sectors.csv")
    risks = ["SAFE", "LOW", "MODERATE", "SEVERE", "CRITICAL"]
    
    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["sector_id", "name", "region", "lat", "lon", "risk_level", "population", "elevation_m", "slope_beta"])
        
        for i in range(NUM_SECTORS):
            region = random.choice(COASTAL_REGIONS)
            lat = round(random.uniform(*region["lat_range"]), 4)
            lon = round(random.uniform(*region["lon_range"]), 4)
            writer.writerow([
                f"SEC-{i:04d}",
                f"{region['name'].split()[0]} Sector {i}",
                region["name"],
                lat, lon,
                random.choice(risks),
                random.randint(2000, 150000),
                round(random.uniform(0.5, 25.0), 2),
                round(random.uniform(0.01, 0.08), 3)
            ])

def generate_infra():
    print(f"Generating {NUM_INFRA} infrastructure assets...")
    file_path = os.path.join(DATA_DIR, "infrastructure_master.csv")
    types = ["sea_wall", "bridge", "shelter", "hospital", "power_plant", "road_segment"]
    conditions = ["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"]
    
    with open(file_path, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["asset_id", "type", "name", "lat", "lon", "condition", "elevation_m", "capacity"])
        
        for i in range(NUM_INFRA):
            region = random.choice(COASTAL_REGIONS)
            a_type = random.choice(types)
            writer.writerow([
                f"AST-{i:04d}",
                a_type,
                f"{a_type.replace('_', ' ').title()} {i}",
                round(random.uniform(*region["lat_range"]), 4),
                round(random.uniform(*region["lon_range"]), 4),
                random.choice(conditions),
                round(random.uniform(-1.0, 15.0), 2),
                random.randint(50, 5000) if a_type in ["shelter", "hospital"] else "N/A"
            ])

def generate_yolo_labels():
    print(f"Generating {NUM_YOLO_LABELS} YOLO virtual labels...")
    label_dir = os.path.join(TRAINING_DIR, "labels", "sample")
    
    for i in range(NUM_YOLO_LABELS):
        file_name = f"scraped_flood_img_{i:04d}.txt"
        with open(os.path.join(label_dir, file_name), "w") as f:
            # Generate 3-8 bounding boxes per simulated image
            for _ in range(random.randint(3, 8)):
                cls = random.randint(0, 5) # water, road, building, debris, vehicle, vegetation
                x = round(random.random(), 4)
                y = round(random.random(), 4)
                w = round(random.uniform(0.05, 0.4), 4)
                h = round(random.uniform(0.05, 0.4), 4)
                f.write(f"{cls} {x} {y} {w} {h}\n")

if __name__ == "__main__":
    ensure_dirs()
    generate_telemetry()
    generate_sectors()
    generate_infra()
    generate_yolo_labels()
    print("\n Data Pipeline complete! All files fetched in /data.")
