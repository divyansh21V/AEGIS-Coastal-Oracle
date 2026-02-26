import math

def calculate_stockdon_runup(H0: float, T: float, beta_f: float) -> float:
    """
    Calculates the 2% exceedance wave run-up (R2%) using Stockdon et al. (2006) formulation.
    
    Args:
        H0 (float): Deep water wave height [meters].
        T (float): Wave period [seconds].
        beta_f (float): Beach slope (tan(theta)) [dimensionless].
        
    Returns:
        float: R2% Run-up level [meters].
    """
    g = 9.81  # Gravity [m/s^2]
    
    # Calculate Deep Water Wavelength (L0) using Linear Wave Theory
    # L0 = (g * T^2) / (2 * pi)
    L0 = (g * (T ** 2)) / (2 * math.pi)
    
    # Iribarren Number (Surf Similarity Parameter)
    # xi_0 = beta_f / sqrt(H0 / L0)
    if H0 <= 0 or L0 <= 0:
        return 0.0
        
    xi_0 = beta_f / math.sqrt(H0 / L0)
    
    # Stockdon Eq. 19 for general beaches (Dissipative + Intermediate)
    # R2 = 1.1 * (setup + S/2)
    # where setup = 0.35 * beta_f * sqrt(H0 * L0)
    #       S = sqrt(H0 * L0 * (0.563 * beta_f^2 + 0.004))
    
    setup = 0.35 * beta_f * math.sqrt(H0 * L0)
    swash = math.sqrt(H0 * L0 * (0.563 * (beta_f ** 2) + 0.004))
    
    R2 = 1.1 * (setup + (swash / 2))
    
    # Physical sanity check: Run-up cannot be negative
    return max(0.0, R2)

def calculate_flood_risk(runup_level: float, terrain_height: float) -> str:
    """
    Determines risk level based on run-up vs terrain height.
    """
    safety_margin = terrain_height - runup_level
    
    if safety_margin < 0:
        return "CRITICAL"  # Flooding
    elif safety_margin < 1.0:
        return "HIGH"      # Near breach
    else:
        return "SAFE"
