"""
AEGIS Inference Engine
Supports ONNX DirectML inference for YOLO and LSTM models.
Falls back to physics-only when no trained model is present.
"""

import numpy as np
import json
import os
import math
import random
import logging

try:
    import onnxruntime as ort
    HAVE_ORT = True
except ImportError:
    HAVE_ORT = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Aegis.Inference")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT, "models")
LSTM_ONNX = os.path.join(MODEL_DIR, "aegis_lstm.onnx")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler_params.json")
SCALE_PATH = os.path.join(MODEL_DIR, "onnx_scale.json")


class InferenceEngine:
    """Unified inference engine supporting LSTM flood forecasting and YOLO detection."""

    def __init__(self, model_path=None):
        self.providers = []
        if HAVE_ORT:
            try:
                self.providers = ort.get_available_providers()
            except Exception:
                self.providers = []

        self.use_directml = 'DmlExecutionProvider' in self.providers

        if self.use_directml:
            self.execution_providers = ['DmlExecutionProvider', 'CPUExecutionProvider']
        elif HAVE_ORT:
            self.execution_providers = ['CPUExecutionProvider']
        else:
            self.execution_providers = []

        self.model_path = model_path
        self.session = None
        if self.model_path and HAVE_ORT:
            try:
                self.session = ort.InferenceSession(self.model_path, providers=self.execution_providers)
            except Exception as e:
                logger.error(f"Failed to load model: {e}")

        self.lstm_session = None
        self.lstm_loaded = False
        self.scaler_params = None
        self.target_scale = None
        self._load_lstm()

    def _load_lstm(self):
        if not HAVE_ORT or not os.path.exists(LSTM_ONNX):
            return
        try:
            self.lstm_session = ort.InferenceSession(LSTM_ONNX, providers=self.execution_providers)
            self.lstm_loaded = True
        except Exception as e:
            logger.error(f"LSTM model load failed: {e}")
            return

        if os.path.exists(SCALER_PATH):
            with open(SCALER_PATH, "r") as f:
                self.scaler_params = json.load(f)
        if os.path.exists(SCALE_PATH):
            with open(SCALE_PATH, "r") as f:
                self.target_scale = json.load(f)

    def predict_lstm(self, sequence):
        """
        Run LSTM inference on a sensor sequence.
        sequence: numpy array of shape (seq_len, n_features)
        Returns dict with runup forecasts and confidence.
        """
        if not self.lstm_loaded or self.lstm_session is None:
            return self._mock_lstm_prediction(sequence)
        try:
            scaled = self._scale_features(sequence)
            input_data = scaled.reshape(1, *scaled.shape).astype(np.float32)
            input_name = self.lstm_session.get_inputs()[0].name
            output_name = self.lstm_session.get_outputs()[0].name
            result = self.lstm_session.run([output_name], {input_name: input_data})[0]

            forecast = result[0]
            if self.target_scale:
                t_min = self.target_scale["target_min"]
                t_max = self.target_scale["target_max"]
                forecast = forecast * (t_max - t_min) + t_min
            forecast = np.clip(forecast, 0, 15)

            variance = float(np.var(forecast))
            confidence = max(0.3, min(0.99, 1.0 - variance * 2))

            return {
                "runup_1h": round(float(forecast[0]), 3) if len(forecast) > 0 else 0.0,
                "runup_3h": round(float(forecast[2]), 3) if len(forecast) > 2 else 0.0,
                "runup_6h": round(float(forecast[-1]), 3),
                "raw_forecast": [round(float(v), 3) for v in forecast],
                "confidence": round(confidence, 3),
                "source": "LSTM-ONNX",
                "device": self.get_device_status(),
            }
        except Exception as e:
            logger.warning(f"LSTM inference failed: {e}")
            return self._mock_lstm_prediction(sequence)

    def _scale_features(self, sequence):
        if self.scaler_params is None:
            return sequence
        mins = np.array(self.scaler_params["min"])
        maxs = np.array(self.scaler_params["max"])
        ranges = maxs - mins
        ranges[ranges == 0] = 1.0
        return (sequence - mins) / ranges

    def _mock_lstm_prediction(self, sequence):
        if sequence is not None and len(sequence) > 0:
            last = sequence[-1] if len(sequence.shape) > 1 else sequence
            wave_h = float(last[0]) if len(last) > 0 else 1.5
            period = float(last[1]) if len(last) > 1 else 8.0
            g = 9.81
            L0 = (g * period ** 2) / (2 * math.pi)
            beta = 0.045
            if wave_h > 0 and L0 > 0:
                setup = 0.35 * beta * math.sqrt(wave_h * L0)
                swash = math.sqrt(wave_h * L0 * (0.563 * beta**2 + 0.004))
                base_runup = 1.1 * (setup + swash / 2)
            else:
                base_runup = 0.5
            forecast = [
                round(base_runup * (1 + 0.02 * i + random.uniform(-0.05, 0.05)), 3)
                for i in range(6)
            ]
        else:
            forecast = [round(random.uniform(0.5, 2.0), 3) for _ in range(6)]

        return {
            "runup_1h": forecast[0], "runup_3h": forecast[2], "runup_6h": forecast[-1],
            "raw_forecast": forecast, "confidence": 0.45,
            "source": "Physics-Mock", "device": self.get_device_status(),
        }

    def predict_hybrid(self, sequence, physics_runup, alpha=0.6):
        """Blend physics (Stockdon) and LSTM predictions."""
        lstm_pred = self.predict_lstm(sequence)
        hybrid_forecast = []
        for i, lstm_val in enumerate(lstm_pred["raw_forecast"]):
            physics_proj = physics_runup * (1 + 0.015 * i)
            hybrid = alpha * lstm_val + (1 - alpha) * physics_proj
            hybrid_forecast.append(round(hybrid, 3))

        max_hybrid = max(hybrid_forecast) if hybrid_forecast else physics_runup
        if max_hybrid > 2.5:
            hybrid_risk = "CRITICAL"
        elif max_hybrid > 1.5:
            hybrid_risk = "HIGH"
        else:
            hybrid_risk = "SAFE"

        return {
            "hybrid_forecast": hybrid_forecast,
            "hybrid_runup": hybrid_forecast[-1] if hybrid_forecast else physics_runup,
            "hybrid_risk": hybrid_risk,
            "lstm": lstm_pred,
            "physics_runup": physics_runup,
            "alpha": alpha,
        }

    def predict_dummy(self, data_input):
        _ = np.array(data_input)
        return random.random()

    def get_device_status(self):
        if self.use_directml:
            return "AMD Ryzen AI (NPU)"
        elif HAVE_ORT:
            return "CPU (ONNX Runtime)"
        return "CPU (No ONNX)"

    def get_model_status(self):
        return {
            "inference_device": self.get_device_status(),
            "onnx_providers": self.providers,
            "directml_available": self.use_directml,
            "yolo_loaded": self.session is not None,
            "lstm_loaded": self.lstm_loaded,
            "lstm_model_path": LSTM_ONNX if self.lstm_loaded else None,
            "scaler_loaded": self.scaler_params is not None,
        }
