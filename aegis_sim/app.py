import streamlit as st
import pydeck as pdk
import pandas as pd
import numpy as np
import time
from datetime import datetime

# Import Aegis modules
from aegis_sim.engine import calculate_stockdon_runup, calculate_flood_risk
from aegis_sim.inference import InferenceEngine
from aegis_sim.drone import DroneSimulator

# Page Config
st.set_page_config(
    page_title="Aegis: Coastal Oracle",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CSS Styling for "Hackathon Cool" ---
st.markdown("""
    <style>
    .stApp {
        background-color: #0E1117;
        color: #FAFAFA;
    }
    .metric-card {
        background-color: #262730;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #4B4B4B;
        text-align: center;
    }
    h1, h2, h3 {
        color: #00B4D8;
    }
    </style>
    """, unsafe_allow_html=True)

# --- Title Header ---
col1, col2 = st.columns([1, 4])
with col1:
    st.image("https://img.icons8.com/color/96/000000/tsunami.png", width=80) 
with col2:
    st.title("PROJECT AEGIS")
    st.markdown("**The Offline-First Drone Prediction Engine** | *AMD Ryzen AI Powered*")

# --- Sidebar Controls (Commander's View) ---
st.sidebar.header("Mission Control")
mission_status = st.sidebar.radio("Drone Status", ["Grounded", "Airborne"])

st.sidebar.subheader("Physics Overrides")
beta_slope = st.sidebar.slider("Beach Slope (tan β)", 0.01, 0.20, 0.05, 0.01)
terrain_height = st.sidebar.slider("Sea Wall Height (m)", 2.0, 10.0, 4.0, 0.1)

# --- Initialization ---
if 'history' not in st.session_state:
    st.session_state['history'] = []
    
if 'drone' not in st.session_state:
    st.session_state['drone'] = DroneSimulator(lat_start=34.01, lon_start=-118.50) # Santa Monica approx
    
if 'engine' not in st.session_state:
    st.session_state['engine'] = InferenceEngine() # Initializes DirectML check

drone = st.session_state['drone']
engine = st.session_state['engine']

# --- Main Dashboard ---

# Layout
placeholder_map = st.empty()
placeholder_metrics = st.empty()

# Mock Coastline Data (Grid of points) for visualization
# Generate a simple grid around the drone start
coast_lat = 34.01
coast_lon = -118.50
# Create a static grid for the "Digital Twin" terrain
df_terrain = pd.DataFrame({
    'lat': [coast_lat + np.random.uniform(-0.01, 0.01) for _ in range(100)],
    'lon': [coast_lon + np.random.uniform(-0.01, 0.01) for _ in range(100)],
    'height': [np.random.uniform(2, 8) for _ in range(100)] # Elevation
})

def run_mission_step():
    # 1. Get Drone Data
    try:
        # We manually iterate the generator for one step per rerun if possible,
        # but Streamlit runs the whole script. 
        # Better: create a new generator or just call a method.
        # Modified drone.py to have a `step()` method would be better, but generator works if we persist it?
        # Generators cannot easily be pickled in session_state.
        # Let's make a manual step here using the drone's internal state + time.
        
        # Simulating the generator logic manually for Streamlit's loop
        t = time.time()
        import math, random
        radius = 0.005
        angle = t * 0.5
        lat = 34.01 + radius * math.sin(angle)
        lon = -118.50 + radius * math.cos(angle)
        
        # Ocean Params
        H0 = 2.0 + math.sin(t * 0.5) * 1.5
        T = 10.0 + math.cos(t * 0.2) * 2.0
        
        telemetry = {
            "latitude": lat,
            "longitude": lon,
            "wave_height": abs(H0),
            "wave_period": abs(T),
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        
    except Exception as e:
        st.error(f"Drone Link Lost: {e}")
        return

    # 2. Physics Calculation
    R2 = calculate_stockdon_runup(telemetry['wave_height'], telemetry['wave_period'], beta_slope)
    risk = calculate_flood_risk(R2, terrain_height)
    
    # 3. Inference Status (AMD Check)
    npu_status = engine.get_device_status()
    
    # 4. Visualization Data Prep
    # Drone Position
    df_drone = pd.DataFrame([telemetry])
    
    # Flood Layer (Dynamic Red Zone)
    # We want to color our terrain points based on risk
    # Simple logic: if point['height'] < R2 -> Red
    df_terrain['color'] = df_terrain['height'].apply(lambda h: [200, 30, 0, 160] if h < R2 else [0, 255, 100, 160])
    
    # 5. Render PyDeck
    deck = pdk.Deck(
        map_style='mapbox://styles/mapbox/dark-v10',
        initial_view_state=pdk.ViewState(
            latitude=34.01,
            longitude=-118.50,
            zoom=14,
            pitch=50,
        ),
        layers=[
            # Terrain / Risk Map
            pdk.Layer(
                'ColumnLayer',
                data=df_terrain,
                get_position='[lon, lat]',
                get_elevation='height',
                elevation_scale=100,
                radius=100,
                get_fill_color='color', # Dynamic Color
                pickable=True,
                auto_highlight=True,
            ),
            # Drone Position
            pdk.Layer(
                'ScatterplotLayer',
                data=df_drone,
                get_position='[longitude, latitude]',
                get_color=[0, 255, 255, 200],
                get_radius=200,
                pickable=True,
            ),
        ],
        tooltip={"html": "<b>Elevation:</b> {height}m"}
    )
    
    # 6. Update UI
    with placeholder_map.container():
        st.pydeck_chart(deck)
        
    with placeholder_metrics.container():
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Wave Height (H0)", f"{telemetry['wave_height']:.2f} m")
        m2.metric("Wave Period (T)", f"{telemetry['wave_period']:.1f} s")
        m3.metric("Run-Up (R2%)", f"{R2:.2f} m", delta_color="inverse")
        m4.metric("Risk Level", risk, delta_color="inverse" if risk=="SAFE" else "normal")
        
        st.caption(f"Inference Device: {npu_status} | Last Update: {telemetry['timestamp']}")

# --- Run Loop ---
if mission_status == "Airborne":
    run_mission_step()
    # Streamlit Auto-Rerun Hack for Animation Loop
    time.sleep(1) # regulate speed
    st.rerun()
else:
    st.info("Drone is grounded. Switch to 'Airborne' to start mission.")
    # Show initial map
    st.pydeck_chart(pdk.Deck(
        map_style='mapbox://styles/mapbox/dark-v10',
        initial_view_state=pdk.ViewState(latitude=34.01, longitude=-118.50, zoom=14, pitch=50)
    ))

