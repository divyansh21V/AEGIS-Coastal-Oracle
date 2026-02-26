# AEGIS Large-Scale Dataset Documentation (v3.0)

This document describes the high-density automated data pipeline powering the AEGIS platform. The system simulates raw data scraping from multiple national and international environmental sources.

---

## 🚀 Data Acquisition Pipeline
All datasets in this version are generated/scraped via the [`scripts/massive_data_pipeline.py`](./scripts/massive_data_pipeline.py) automation suite. This simulates high-frequency ingestion from buoy networks, satellite registries, and municipal infrastructure databases.

---

## 🌊 1. Aggregated Buoy Telemetry (Hourly)
**File:** [`data/aggregated_buoy_telemetry.csv`](./data/aggregated_buoy_telemetry.csv)
**Scale:** **1,500+ records**
**Source:** Simulated INCOIS / NOAA / NDBC global buoy ingestion.

| Parameter | Unit | Description |
|:---|:---|:---|
| `wave_height_m` | m | Significant wave height (includes storm stochasticity) |
| `wind_speed_mps`| m/s | Real-time wind velocity at 10m MSL |
| `pressure_hpa` | hPa | Central barometric pressure (critical for storm tracking) |
| `temp_c` | °C | Sea Surface Temperature (SST) |

**AI Usage:** Training the Neural Engine on long-term time-series trends and seasonal anomalies.

---

## 🗺️ 2. Scraped Coastal Sectors (Spatial)
**File:** [`data/scraped_coastal_sectors.csv`](./data/scraped_coastal_sectors.csv)
**Scale:** **300 unique sectors**
**Coverage:** 9 Indian Coastal States (Gujarat to Bengal).

| Field | Description |
|:---|:---|
| `risk_level` | Model-derived risk (`SAFE` to `CRITICAL`) |
| `population` | Census-mapped residents within sector polygon |
| `elevation_m` | Mean terrain elevation (SRTM/CartoDEM) |
| `slope_beta` | Beach profile slope for run-up calculation |

---

## 🏗️ 3. Infrastructure Master Asset Registry
**File:** [`data/infrastructure_master.csv`](./data/infrastructure_master.csv)
**Scale:** **600+ registered assets**
**Types:** Bridges, Sea Walls, Shelters, Hospitals, Power Plants, Roads.

| Asset Type | Primary Mitigation Use |
|:---|:---|
| `sea_wall` | Overtopping and barrier integrity analysis |
| `shelter` | Dynamic evacuation capacity mapping |
| `road_segment` | Graph-theory based emergency routing |

---

## 👁️ 4. ML Training Corpus (YOLOv8)
**Format:** YOLO v8 (Deep Annotation Matrix)
**Location:** [`data/floodnet_yolo/labels/sample/`](./data/floodnet_yolo/labels/sample/)
**Scale:** **150+ annotated frames** (Simulating a part of the 2,000 image FloodNet set).

**Classification Matrix:**
0. `water` 
1. `road` 
2. `building` 
3. `debris` 
4. `vehicle` 
5. `vegetation`

**Training Flow:**
The [`training/train_yolo.py`](../training/train_yolo.py) script is configured to process this high-density annotation matrix, exporting to **ONNX** for real-time edge inference on AEGIS drones.

---

## 🛠️ Automated Pipeline Execution
To refresh the dataset with new stochastic variances, run:
```bash
python scripts/massive_data_pipeline.py
```
This script acts as the "Scraper Engine" for the hackathon demonstration, showing how raw data is converted into actionable intelligence.
