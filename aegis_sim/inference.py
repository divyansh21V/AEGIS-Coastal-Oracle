import numpy as np
import logging

try:
    import onnxruntime as ort
    HAVE_ORT = True
except ImportError:
    HAVE_ORT = False

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Aegis.Inference")

class InferenceEngine:
    def __init__(self, model_path: str = None):
        self.providers = []
        if HAVE_ORT:
            try:
                self.providers = ort.get_available_providers()
            except:
                self.providers = [] # Fallback
        
        self.use_directml = 'DmlExecutionProvider' in self.providers
        
        logger.info(f"Available ONNX Providers: {self.providers}")
        if self.use_directml:
            logger.info("✅ AMD DirectML Acceleration ENGAGED.")
            self.execution_providers = ['DmlExecutionProvider', 'CPUExecutionProvider']
        elif HAVE_ORT:
            logger.warning("⚠️ DirectML not found. Falling back to CPU.")
            self.execution_providers = ['CPUExecutionProvider']
        else:
            logger.warning("⚠️ ONNX Runtime not found. Using Mock Inference.")
            self.execution_providers = []
            
        self.model_path = model_path
        self.session = None
        
        if self.model_path and HAVE_ORT:
            try:
                self.session = ort.InferenceSession(self.model_path, providers=self.execution_providers)
                logger.info(f"Model loaded from {self.model_path}")
            except Exception as e:
                logger.error(f"Failed to load user model: {e}")
                
    def predict_dummy(self, data_input):
        """
        Mock inference for Hackathon MVP if no trained model is present.
        Returns randomized 'Storm Index' (0.0 - 1.0).
        """
        # Ensure input is processed even if dummy
        _ = np.array(data_input) 
        
        # Simulate processing time on NPU
        import time
        if self.use_directml:
            # Fast!
            pass 
        else:
            # Simulate CPU lag? (Optional: keep it fast for UX)
            pass
            
        # Return a deterministic mock value based on data shape or randomness
        import random
        return random.random()

    def get_device_status(self):
        return "AMD Ryzen AI (NPU)" if self.use_directml else "CPU (Fallback)"
