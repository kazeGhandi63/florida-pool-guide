// LSI = pH + TF + CF + AF - TDSF

// Temperature Factor (TF) - Based on Fahrenheit
const getTemperatureFactor = (tempF: number): number => {
  if (tempF <= 32) return 0.0;
  if (tempF <= 38) return 0.1;
  if (tempF <= 46) return 0.2;
  if (tempF <= 53) return 0.3;
  if (tempF <= 60) return 0.4;
  if (tempF <= 66) return 0.5;
  if (tempF <= 76) return 0.6;
  if (tempF <= 84) return 0.7;
  if (tempF <= 94) return 0.8;
  if (tempF <= 105) return 0.9;
  return 1.0;
};

// Calcium Hardness Factor (CF) - Based on ppm
const getCalciumFactor = (calcium: number): number => {
  if (calcium <= 25) return 1.0;
  if (calcium <= 50) return 1.3;
  if (calcium <= 100) return 1.6;
  if (calcium <= 200) return 1.9;
  if (calcium <= 400) return 2.2;
  if (calcium <= 800) return 2.5;
  return 2.6;
};

// Alkalinity Factor (AF) - Based on ppm
const getAlkalinityFactor = (alkalinity: number): number => {
  if (alkalinity <= 25) return 1.4;
  if (alkalinity <= 50) return 1.7;
  if (alkalinity <= 100) return 2.0;
  if (alkalinity <= 200) return 2.3;
  if (alkalinity <= 400) return 2.6;
  if (alkalinity <= 800) return 2.9;
  return 3.0;
};

// TDS Factor (TDSF)
// This is a simplified constant for TDS < 1000 ppm, common in pools.
const TDS_CONSTANT = 12.1;

export const calculateLSI = (
  ph: number | null,
  temperature: number | null,
  calciumHardness: number | null,
  alkalinity: number | null
): number | null => {
  if (ph === null || temperature === null || calciumHardness === null || alkalinity === null) {
    return null;
  }
  
  // Ensure values are not negative
  if (ph < 0 || temperature < 0 || calciumHardness < 0 || alkalinity < 0) {
    return null;
  }

  const tf = getTemperatureFactor(temperature);
  const cf = getCalciumFactor(calciumHardness);
  const af = getAlkalinityFactor(alkalinity);

  const lsi = ph + tf + cf + af - TDS_CONSTANT;

  return parseFloat(lsi.toFixed(2));
};