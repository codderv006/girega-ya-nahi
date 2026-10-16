/** Physical constants and the "standard-issue" glucose biscuit. */
export const G = 9.81; // m/s²
export const R_GAS = 8.314; // J/(mol·K)
export const KELVIN = 273.15;

/** A nominal rectangular glucose biscuit (measured with great seriousness). */
export const STANDARD_BISCUIT = {
  lengthM: 0.056,
  widthM: 0.042,
  thicknessM: 0.0048,
  massKg: 0.0054,
  /** Effective capillary pore radius (Washburn r). */
  poreRadiusM: 0.45e-6,
  porosity: 0.42,
  /** Path length multiplier for crooked pores. */
  tortuosity: 3.2,
  /** Dry flexural strength (Pa). */
  dryStrengthPa: 0.9e6,
};

export const CHAI_DENSITY = 1015; // kg/m³ (milk adds a little)
