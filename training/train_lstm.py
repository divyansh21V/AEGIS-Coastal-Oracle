"""
AEGIS LSTM Flood Run-Up Prediction Model
Trains a PyTorch LSTM on buoy telemetry sequences to predict
future coastal run-up levels (6-hour horizon).

Usage:
  python training/train_lstm.py                  # full 50 epochs
  python training/train_lstm.py --epochs 5       # quick smoke test
  python training/train_lstm.py --export-only    # re-export existing .pt to ONNX
"""

import os
import sys
import json
import argparse
import time
import numpy as np
import pandas as pd

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MinMaxScaler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data", "aggregated_buoy_telemetry.csv")
MODEL_DIR = os.path.join(ROOT, "models")
MODEL_PT = os.path.join(MODEL_DIR, "aegis_lstm.pt")
MODEL_ONNX = os.path.join(MODEL_DIR, "aegis_lstm.onnx")
METRICS_PATH = os.path.join(ROOT, "training", "lstm_metrics.json")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler_params.json")

FEATURE_COLS = ["wave_height_m", "period_s", "temp_c", "wind_speed_mps", "pressure_hpa"]
TARGET_COL = "runup_m"
SEQ_LEN = 24
HORIZON = 6
HIDDEN_DIM = 64
NUM_LAYERS = 2
DROPOUT = 0.2
BATCH_SIZE = 64
LEARNING_RATE = 1e-3
TRAIN_SPLIT = 0.8


class TelemetryDataset(Dataset):
    """Sliding window dataset for LSTM sequence-to-horizon prediction."""

    def __init__(self, features, targets, seq_len=SEQ_LEN, horizon=HORIZON):
        self.features = features
        self.targets = targets
        self.seq_len = seq_len
        self.horizon = horizon
        self.length = len(features) - seq_len - horizon + 1

    def __len__(self):
        return max(0, self.length)

    def __getitem__(self, idx):
        x = self.features[idx : idx + self.seq_len]
        y = self.targets[idx + self.seq_len : idx + self.seq_len + self.horizon]
        return torch.FloatTensor(x), torch.FloatTensor(y)


class AegisLSTM(nn.Module):
    """2-layer LSTM for coastal run-up forecasting."""

    def __init__(self, n_features=5, hidden_dim=HIDDEN_DIM,
                 num_layers=NUM_LAYERS, dropout=DROPOUT, horizon=HORIZON):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=n_features, hidden_size=hidden_dim,
            num_layers=num_layers, batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32), nn.ReLU(),
            nn.Dropout(dropout), nn.Linear(32, horizon),
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        return self.fc(last_hidden)


def load_and_prepare_data():
    if not os.path.exists(DATA_PATH):
        print(f"Data not found: {DATA_PATH}")
        print("Run: python scripts/massive_data_pipeline.py first")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df):,} records from {os.path.basename(DATA_PATH)}")
    print(f"Date range: {df['timestamp'].iloc[0]} to {df['timestamp'].iloc[-1]}")

    df = df.sort_values("timestamp").reset_index(drop=True)
    features = df[FEATURE_COLS].values.astype(np.float32)
    targets = df[TARGET_COL].values.astype(np.float32)
    features = np.nan_to_num(features, nan=0.0, posinf=10.0, neginf=0.0)
    targets = np.nan_to_num(targets, nan=0.0, posinf=5.0, neginf=0.0)

    scaler = MinMaxScaler(feature_range=(0, 1))
    features_scaled = scaler.fit_transform(features)

    os.makedirs(MODEL_DIR, exist_ok=True)
    scaler_params = {
        "feature_cols": FEATURE_COLS,
        "min": scaler.data_min_.tolist(),
        "max": scaler.data_max_.tolist(),
        "scale": scaler.scale_.tolist(),
    }
    with open(SCALER_PATH, "w") as f:
        json.dump(scaler_params, f, indent=2)

    target_max = float(targets.max())
    target_min = float(targets.min())
    targets_scaled = (targets - target_min) / (target_max - target_min + 1e-8)

    split_idx = int(len(features_scaled) * TRAIN_SPLIT)
    print(f"Train: {split_idx:,} | Val: {len(features_scaled) - split_idx:,}")

    train_ds = TelemetryDataset(features_scaled[:split_idx], targets_scaled[:split_idx])
    val_ds = TelemetryDataset(features_scaled[split_idx:], targets_scaled[split_idx:])
    print(f"Train sequences: {len(train_ds):,} | Val sequences: {len(val_ds):,}")

    return train_ds, val_ds, target_min, target_max


def train_model(epochs=50):
    train_ds, val_ds, target_min, target_max = load_and_prepare_data()
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, drop_last=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    model = AegisLSTM(n_features=len(FEATURE_COLS)).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    print(f"Model params: {sum(p.numel() for p in model.parameters()):,}")

    best_val_loss = float("inf")
    metrics_log = []
    t0 = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss, train_batches = 0.0, 0
        for x_batch, y_batch in train_loader:
            x_batch, y_batch = x_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            pred = model(x_batch)
            loss = criterion(pred, y_batch)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()
            train_batches += 1

        avg_train = train_loss / max(1, train_batches)

        model.eval()
        val_loss, val_batches = 0.0, 0
        all_pred, all_true = [], []
        with torch.no_grad():
            for x_batch, y_batch in val_loader:
                x_batch, y_batch = x_batch.to(device), y_batch.to(device)
                pred = model(x_batch)
                loss = criterion(pred, y_batch)
                val_loss += loss.item()
                val_batches += 1
                all_pred.append(pred.cpu().numpy())
                all_true.append(y_batch.cpu().numpy())

        avg_val = val_loss / max(1, val_batches)
        scheduler.step(avg_val)

        if all_pred:
            all_pred = np.concatenate(all_pred)
            all_true = np.concatenate(all_true)
            pred_m = all_pred * (target_max - target_min) + target_min
            true_m = all_true * (target_max - target_min) + target_min
            mae = np.mean(np.abs(pred_m - true_m))
            rmse = np.sqrt(np.mean((pred_m - true_m) ** 2))
            ss_res = np.sum((true_m - pred_m) ** 2)
            ss_tot = np.sum((true_m - np.mean(true_m)) ** 2)
            r2 = 1 - (ss_res / (ss_tot + 1e-8))
        else:
            mae = rmse = r2 = 0.0

        elapsed = time.time() - t0
        epoch_metrics = {
            "epoch": epoch,
            "train_loss": round(float(avg_train), 6),
            "val_loss": round(float(avg_val), 6),
            "mae_m": round(float(mae), 4),
            "rmse_m": round(float(rmse), 4),
            "r2": round(float(r2), 4),
            "lr": float(optimizer.param_groups[0]["lr"]),
            "elapsed_s": round(elapsed, 1),
        }
        metrics_log.append(epoch_metrics)

        print(f"  Epoch {epoch:3d}/{epochs} | "
              f"Train: {avg_train:.5f} | Val: {avg_val:.5f} | "
              f"MAE: {mae:.4f}m | RMSE: {rmse:.4f}m | R2: {r2:.4f}")

        if avg_val < best_val_loss:
            best_val_loss = avg_val
            os.makedirs(MODEL_DIR, exist_ok=True)
            torch.save({
                "model_state_dict": model.state_dict(),
                "epoch": epoch, "val_loss": float(avg_val),
                "target_min": float(target_min), "target_max": float(target_max),
                "feature_cols": FEATURE_COLS, "seq_len": SEQ_LEN,
                "horizon": HORIZON, "hidden_dim": HIDDEN_DIM, "num_layers": NUM_LAYERS,
            }, MODEL_PT)

    print(f"\nTraining Complete | Best Val Loss: {best_val_loss:.6f} | "
          f"MAE: {metrics_log[-1]['mae_m']:.4f}m | R2: {metrics_log[-1]['r2']:.4f}")

    with open(METRICS_PATH, "w") as f:
        json.dump({
            "training_config": {
                "seq_len": SEQ_LEN, "horizon": HORIZON,
                "hidden_dim": HIDDEN_DIM, "num_layers": NUM_LAYERS,
                "dropout": DROPOUT, "batch_size": BATCH_SIZE,
                "learning_rate": LEARNING_RATE, "epochs": epochs,
                "feature_cols": FEATURE_COLS, "target_col": TARGET_COL,
            },
            "best_val_loss": float(best_val_loss),
            "final_metrics": metrics_log[-1],
            "epoch_log": metrics_log,
        }, f, indent=2)

    return model, target_min, target_max


def export_onnx(model=None, target_min=0.0, target_max=1.0):
    """Export trained PyTorch model to ONNX for DirectML inference."""
    print("Exporting to ONNX...")
    if model is None:
        if not os.path.exists(MODEL_PT):
            print(f"No model found at {MODEL_PT}")
            return
        checkpoint = torch.load(MODEL_PT, map_location="cpu", weights_only=False)
        model = AegisLSTM(
            n_features=len(checkpoint.get("feature_cols", FEATURE_COLS)),
            hidden_dim=checkpoint.get("hidden_dim", HIDDEN_DIM),
            num_layers=checkpoint.get("num_layers", NUM_LAYERS),
            horizon=checkpoint.get("horizon", HORIZON),
        )
        model.load_state_dict(checkpoint["model_state_dict"])
        target_min = checkpoint.get("target_min", 0.0)
        target_max = checkpoint.get("target_max", 1.0)

    model.eval()
    dummy_input = torch.randn(1, SEQ_LEN, len(FEATURE_COLS))
    os.makedirs(MODEL_DIR, exist_ok=True)
    torch.onnx.export(
        model, dummy_input, MODEL_ONNX,
        input_names=["sensor_sequence"], output_names=["runup_forecast"],
        dynamic_axes={"sensor_sequence": {0: "batch_size"}, "runup_forecast": {0: "batch_size"}},
        opset_version=14,
    )
    print(f"ONNX exported: {MODEL_ONNX} | Input: (batch, {SEQ_LEN}, {len(FEATURE_COLS)}) | Output: (batch, {HORIZON})")

    scale_info = {
        "target_min": float(target_min), "target_max": float(target_max),
        "seq_len": SEQ_LEN, "horizon": HORIZON, "features": FEATURE_COLS,
    }
    scale_path = os.path.join(MODEL_DIR, "onnx_scale.json")
    with open(scale_path, "w") as f:
        json.dump(scale_info, f, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AEGIS LSTM Training")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--export-only", action="store_true")
    args = parser.parse_args()

    if args.export_only:
        export_onnx()
    else:
        model, t_min, t_max = train_model(epochs=args.epochs)
        export_onnx(model, t_min, t_max)
