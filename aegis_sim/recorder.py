"""
AEGIS Timestamp Data Recorder
Logs predictions, sensor readings, and system events with ISO timestamps
to daily CSV files for audit trails and model retraining.
"""

import csv
import json
import os
import threading
from datetime import datetime, date
from typing import Optional


class DataRecorder:
    """Records prediction events with timestamps to auto-rotating daily CSV files."""

    FIELDS = [
        "timestamp", "station_id",
        "wave_height_m", "period_s", "temp_c", "wind_speed_mps", "pressure_hpa",
        "physics_runup_m", "physics_risk",
        "lstm_runup_1h", "lstm_runup_3h", "lstm_runup_6h", "lstm_confidence",
        "hybrid_runup_m", "hybrid_risk",
        "inference_device", "model_loaded", "prediction_mode",
        "is_cyclone", "event_type",
    ]

    def __init__(self, base_dir=None):
        if base_dir is None:
            root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            base_dir = os.path.join(root, "data", "recordings")
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        self._lock = threading.Lock()
        self._current_date = None
        self._current_file = None
        self._current_writer = None
        self._record_count = 0
        self._session_start = datetime.now().isoformat()

    def _get_filepath(self, d):
        return os.path.join(self.base_dir, f"recording_{d.isoformat()}.csv")

    def _ensure_file(self, d):
        if self._current_date == d and self._current_file is not None:
            return
        if self._current_file is not None:
            self._current_file.close()
        filepath = self._get_filepath(d)
        file_exists = os.path.exists(filepath)
        self._current_file = open(filepath, "a", newline="", encoding="utf-8")
        self._current_writer = csv.DictWriter(self._current_file, fieldnames=self.FIELDS)
        if not file_exists:
            self._current_writer.writeheader()
        self._current_date = d

    def record(self, data, event_type="tick"):
        now = datetime.now()
        record = {field: "" for field in self.FIELDS}
        record["timestamp"] = now.isoformat()
        record["event_type"] = event_type
        for key in self.FIELDS:
            if key in data:
                record[key] = data[key]
        with self._lock:
            self._ensure_file(now.date())
            self._current_writer.writerow(record)
            self._current_file.flush()
            self._record_count += 1

    def record_telemetry(self, ocean, physics, lstm=None, system=None, mode="physics"):
        data = {
            "wave_height_m": ocean.get("wave_height_m", ""),
            "period_s": ocean.get("wave_period_s", ""),
            "wind_speed_mps": ocean.get("wind_speed_mps", ""),
            "pressure_hpa": ocean.get("pressure_hpa", ""),
            "temp_c": ocean.get("temp_c", ""),
            "physics_runup_m": physics.get("runup_m", ""),
            "physics_risk": physics.get("overall_risk", ""),
            "prediction_mode": mode,
        }
        if lstm:
            data["lstm_runup_1h"] = lstm.get("runup_1h", "")
            data["lstm_runup_3h"] = lstm.get("runup_3h", "")
            data["lstm_runup_6h"] = lstm.get("runup_6h", "")
            data["lstm_confidence"] = lstm.get("confidence", "")
            data["hybrid_runup_m"] = lstm.get("hybrid_runup", "")
            data["hybrid_risk"] = lstm.get("hybrid_risk", "")
        if system:
            data["inference_device"] = system.get("inference_device", "")
            data["model_loaded"] = system.get("model_loaded", "")
        self.record(data, event_type="tick")

    def get_recent(self, n=50):
        today = date.today()
        filepath = self._get_filepath(today)
        if not os.path.exists(filepath):
            return []
        records = []
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
        return records[-n:]

    def get_stats(self):
        files = [f for f in os.listdir(self.base_dir) if f.startswith("recording_")]
        return {
            "session_start": self._session_start,
            "total_records": self._record_count,
            "recording_files": len(files),
            "current_date": str(self._current_date),
            "base_dir": self.base_dir,
        }

    def close(self):
        with self._lock:
            if self._current_file is not None:
                self._current_file.close()
                self._current_file = None


_recorder = None

def get_recorder(base_dir=None):
    global _recorder
    if _recorder is None:
        _recorder = DataRecorder(base_dir)
    return _recorder
