"""
AEGIS — YOLOv8 FloodNet Training Pipeline
==========================================
Dataset: FloodNet (IEEE DataPort)
Paper:   "FloodNet: A High Resolution Aerial Imagery Dataset
          for Post Flood Scene Understanding" (IEEE Access 2021)
Link:    https://ieee-dataport.org/open-access/floodnet

Classes: water | road | building | debris | vehicle | vegetation
Model:   YOLOv8n (Nano) — optimized for edge/drone deployment
Export:  ONNX (opset=12) for DirectML / TensorRT inference
"""

from ultralytics import YOLO
import os
import json
from datetime import datetime

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATASET_CONFIG = os.path.join(os.path.dirname(__file__), "..", "data", "floodnet_yolo", "data.yaml")
MODEL_BASE     = "yolov8n.pt"  # Nano for speed — switch to yolov8s.pt for accuracy
EPOCHS         = 100
IMG_SIZE       = 640
BATCH_SIZE     = 16
OPTIMIZER      = "AdamW"
LR_INIT        = 0.001
EXPORT_FORMAT  = "onnx"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Training Pipeline
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def train():
    """Full YOLOv8 training on FloodNet dataset."""
    print("━" * 60)
    print("  AEGIS Neural Engine — YOLOv8 FloodNet Training")
    print("━" * 60)

    # 1. Verify dataset
    if not os.path.exists(DATASET_CONFIG):
        raise FileNotFoundError(
            f"Dataset config not found: {DATASET_CONFIG}\n"
            f"Download FloodNet from: https://ieee-dataport.org/open-access/floodnet\n"
            f"Extract to: data/floodnet_yolo/ with images/ and labels/ subdirectories."
        )
    print(f"✅ Dataset config: {DATASET_CONFIG}")

    # 2. Load pretrained model
    model = YOLO(MODEL_BASE)
    print(f"✅ Base model loaded: {MODEL_BASE}")

    # 3. Train
    print(f"\n🚀 Starting training: {EPOCHS} epochs, {IMG_SIZE}px, batch={BATCH_SIZE}")
    results = model.train(
        data=DATASET_CONFIG,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        optimizer=OPTIMIZER,
        lr0=LR_INIT,
        lrf=0.01,
        warmup_epochs=3,
        mosaic=1.0,
        mixup=0.15,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        flipud=0.5,
        fliplr=0.5,
        project="runs/aegis",
        name="floodnet_v1",
        exist_ok=True,
        verbose=True,
    )

    # 4. Log metrics
    metrics = {
        "timestamp": datetime.now().isoformat(),
        "model": MODEL_BASE,
        "epochs": EPOCHS,
        "dataset": "FloodNet (IEEE DataPort)",
        "classes": ["water", "road", "building", "debris", "vehicle", "vegetation"],
        "mAP50": round(results.results_dict.get("metrics/mAP50(B)", 0), 4),
        "mAP50-95": round(results.results_dict.get("metrics/mAP50-95(B)", 0), 4),
        "precision": round(results.results_dict.get("metrics/precision(B)", 0), 4),
        "recall": round(results.results_dict.get("metrics/recall(B)", 0), 4),
    }
    print(f"\n📊 Training Results:")
    for k, v in metrics.items():
        print(f"   {k}: {v}")

    with open("runs/aegis/floodnet_v1/training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # 5. Export to ONNX for edge deployment
    print(f"\n📦 Exporting to {EXPORT_FORMAT.upper()}...")
    export_path = model.export(format=EXPORT_FORMAT, opset=12, dynamic=True)
    print(f"✅ Model exported: {export_path}")

    return metrics


def validate(model_path: str = "runs/aegis/floodnet_v1/weights/best.pt"):
    """Run validation on the trained model."""
    model = YOLO(model_path)
    results = model.val(data=DATASET_CONFIG, imgsz=IMG_SIZE)
    print(f"\n📊 Validation mAP@50: {results.results_dict.get('metrics/mAP50(B)', 0):.4f}")
    print(f"📊 Validation mAP@50-95: {results.results_dict.get('metrics/mAP50-95(B)', 0):.4f}")
    return results


def predict(source: str, model_path: str = "runs/aegis/floodnet_v1/weights/best.pt"):
    """Run inference on new drone imagery."""
    model = YOLO(model_path)
    results = model.predict(
        source=source,
        imgsz=IMG_SIZE,
        conf=0.25,
        iou=0.45,
        save=True,
        project="runs/aegis",
        name="predictions",
    )
    print(f"✅ Predictions saved for {len(results)} frames")
    return results


if __name__ == "__main__":
    train()
