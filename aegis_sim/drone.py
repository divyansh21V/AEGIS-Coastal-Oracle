import time
import math
import random
from datetime import datetime

class DroneSimulator:
    def __init__(self, lat_start=34.0, lon_start=-118.0, speed=10.0):
        self.lat = lat_start
        self.lon = lon_start
        self.speed = speed
        self.start_time = time.time()
        
    def stream_telemetry(self):
        """
        Yields a stream of dictionary data simulating drone sensor fusion.
        Simulates:
        - Movement along a flight path.
        - Varying Ocean Conditions (Perlin-like noise).
        """
        t = 0
        while True:
            # Simulate flight path (Orbiting a point of interest)
            # Simple circular path
            radius = 0.005 # approx 500m
            angle = t * 0.1
            
            lat_current = self.lat + radius * math.sin(angle)
            lon_current = self.lon + radius * math.cos(angle)
            
            # Simulate Wave Data (H0, T)
            # Superposition of 2 sine waves + noise
            base_wave = 2.0 + math.sin(t * 0.05) * 1.0 # 1m to 3m
            period_wave = 10.0 + math.cos(t * 0.02) * 2.0 # 8s to 12s
            
            # Random "Gust"
            noise = random.uniform(-0.2, 0.2)
            
            yield {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "latitude": lat_current,
                "longitude": lon_current,
                "altitude": 50.0 + math.sin(t*0.5)*2.0,
                "wave_height": round(base_wave + noise, 2),
                "wave_period": round(period_wave, 1),
                "battery": max(0, 100 - t * 0.1)
            }
            
            t += 1
            time.sleep(1.0) # 1Hz refresh rate for simulation

if __name__ == "__main__":
    drone = DroneSimulator()
    for data in drone.stream_telemetry():
        print(data)
