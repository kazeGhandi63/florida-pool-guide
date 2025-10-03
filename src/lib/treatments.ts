// Ideal range for Alkalinity: 80-120 ppm. Treat if < 80.
const IDEAL_ALKALINITY = 100;
const ALKALINITY_THRESHOLD = 80;
// For a 1,500 gallon pool, ~0.5 cups of sodium bicarbonate raises alkalinity by 10 ppm.
const ALKALINITY_CUP_FACTOR = 0.5;

export const calculateAlkalinityTreatment = (alkalinity: number | null): number => {
  if (alkalinity === null || alkalinity >= ALKALINITY_THRESHOLD) {
    return 0;
  }
  if (alkalinity < 0) return 0;

  const needed = IDEAL_ALKALINITY - alkalinity;
  const treatmentCups = (needed / 10) * ALKALINITY_CUP_FACTOR;
  
  return parseFloat(treatmentCups.toFixed(2));
};

// Ideal range for Calcium Hardness: 200-400 ppm. Treat if < 200.
const IDEAL_CALCIUM = 300;
const CALCIUM_THRESHOLD = 200;
// For a 1,500 gallon pool, ~0.4 cups of calcium chloride raises hardness by 10 ppm.
const CALCIUM_CUP_FACTOR = 0.4;

export const calculateCalciumTreatment = (calciumHardness: number | null): number => {
  if (calciumHardness === null || calciumHardness >= CALCIUM_THRESHOLD) {
    return 0;
  }
  if (calciumHardness < 0) return 0;

  const needed = IDEAL_CALCIUM - calciumHardness;
  const treatmentCups = (needed / 10) * CALCIUM_CUP_FACTOR;

  return parseFloat(treatmentCups.toFixed(2));
};