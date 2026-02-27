# AEGIS Dataset Documentation

Documentation for the data pipeline and ML training infrastructure.

---

## 1. Aggregated Buoy Telemetry (Hourly)
**File:** `data/aggregated_buoy_telemetry.csv`
**Scale:** 17,520 records (2 years hourly)

| Parameter | Unit | Description |
|:---|:---|:---|
| `wave_height_m` | m | Significant wave height |
| `period_s` | s | Wave period |
| `wind_speed_mps`| m/s | Wind velocity at 10m MSL |
| `pressure_hpa` | hPa | Central barometric pressure |
| `temp_c` | C | Sea Surface Temperature |
| `runup_m` | m | Stockdon R2% wave run-up (training target) |
| `risk_level` | - | SAFE / HIGH / CRITICAL |
| `is_cyclone_event` | 0/1 | Whether record is during a cyclone |
| `cyclone_intensity` | 0-1 | Cyclone severity factor |

---

## 2. Coastal Sectors
**File:** `data/scraped_coastal_sectors.csv`
**Scale:** 400 sectors across 8 Indian coastal states

| Field | Description |
|:---|:---|
| `risk_level` | Elevation-correlated risk |
| `population` | Census-mapped residents |
| `elevation_m` | Mean terrain elevation |
| `slope_beta` | Beach profile slope |
| `drainage_score` | Drainage capacity (20-95) |

---

## 3. Infrastructure Registry
**File:** `data/infrastructure_master.csv`
**Scale:** 800+ assets (sea walls, bridges, shelters, hospitals, etc.)

---

## 4. Historical Cyclone Catalog
**File:** `data/historical_cyclones_extended.csv`
**Scale:** 46 records (16 real IMD + 30 synthetic), 1970-2024

---

## 5. YOLO Training Labels
**Location:** `data/floodnet_yolo/labels/sample/`
**Scale:** 200 annotated frames (YOLOv8 format)

---

## 6. LSTM Model

### Architecture
| Component | Detail |
|:---|:---|
| Type | 2-layer LSTM + FC Head |
| Input | (batch, 24, 5) - 24h lookback x 5 features |
| Output | (batch, 6) - 6h runup forecast |
| Hidden | 64 units, dropout 0.2 |
| Export | PyTorch .pt + ONNX .onnx |

### Model Files
- `models/aegis_lstm.pt` - PyTorch checkpoint
- `models/aegis_lstm.onnx` - ONNX for DirectML inference
- `models/scaler_params.json` - Feature normalization
- `models/onnx_scale.json` - Target denormalization

### Pipeline
```bash
python scripts/massive_data_pipeline.py
python training/train_lstm.py --epochs 15
python -m uvicorn backend.main:app --reload --port 8000
```

---

## 7. Timestamp Data Recording
**Location:** `data/recordings/recording_YYYY-MM-DD.csv`

Records every prediction tick with ISO timestamps, physics output, LSTM forecasts, and risk levels for audit trails.
