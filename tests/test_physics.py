import unittest
import math
import sys
import os

# Add parent dir to path to import poseidon
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from poseidon.engine import calculate_stockdon_runup

class TestPoseidonPhysics(unittest.TestCase):
    def test_stockdon_runup(self):
        # Known inputs
        H0 = 4.0
        T = 10.0
        beta = 0.05
        
        # Manual calculation check
        # L0 = 9.81 * 100 / (2 * pi) = 156.131
        # Setup = 0.35 * 0.05 * sqrt(624.524) = 0.0175 * 24.99 = 0.4373
        # Swash Term Inner = 0.563 * 0.0025 + 0.004 = 0.0014075 + 0.004 = 0.0054075
        # Swash = sqrt(624.524 * 0.0054075) = sqrt(3.377) = 1.8377
        # R2 = 1.1 * (0.4373 + 1.8377/2) = 1.1 * (0.4373 + 0.9188) = 1.1 * 1.3561 = 1.4917
        
        r2 = calculate_stockdon_runup(H0, T, beta)
        print(f"Calculated R2%: {r2}")
        
        # Allow small float deviation
        self.assertAlmostEqual(r2, 1.49, delta=0.05)
        
    def test_zero_wave(self):
        self.assertEqual(calculate_stockdon_runup(0, 10, 0.05), 0.0)

if __name__ == '__main__':
    unittest.main()
