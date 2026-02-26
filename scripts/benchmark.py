import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import time
import numpy as np
from poseidon.engine import calculate_stockdon_runup
from poseidon.inference import InferenceEngine

def benchmark_engine(n=100000):
    print(f"🌊 Starting Stress Test: {n} Wave Calculations...")
    
    # Generate random "Real Life" data
    H0s = np.random.uniform(0.5, 5.0, n)
    Ts = np.random.uniform(5.0, 15.0, n)
    betas = np.random.uniform(0.01, 0.1, n)
    
    start_time = time.time()
    
    # Run loop
    for h, t, b in zip(H0s, Ts, betas):
        _ = calculate_stockdon_runup(h, t, b)
        
    end_time = time.time()
    duration = end_time - start_time
    fps = n / duration
    
    print(f"✅ Physics Engine Speed: {fps:.2f} calcs/sec")
    print(f"⚡ Latency per prediction: {1000/fps:.4f} ms")
    
    if fps > 60:
        print("🚀 STATUS: REAL-TIME READY (Runs faster than 60Hz)")
    else:
        print("⚠️ STATUS: LAG DETECTED")

def benchmark_inference():
    print("\n🧠 Testing AI Inference Speed (Mock/Simulated)...")
    engine = InferenceEngine()
    
    start_time = time.time()
    for _ in range(100): # 100 frames
        engine.predict_dummy(np.zeros((224, 224, 3)))
    duration = time.time() - start_time
    
    print(f"✅ Inference Speed: {100/duration:.2f} FPS")

if __name__ == "__main__":
    benchmark_engine()
    benchmark_inference()
