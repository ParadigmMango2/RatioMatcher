/**
 * To run this benchmark, save the code as a file (e.g., `ratio_benchmarks.js`)
 * and execute it in your terminal using the Deno runtime:
 *
 * deno bench ratio_benchmarks.js
 */

// ==================================================================================
// ALGORITHM DEFINITIONS
// ==================================================================================

// --- GCD Implementation ---
function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// --- Old Baseline Algorithm ---
function matchRatiosSumLimits(a, b, min, max, threshold) {
  var aCount = Math.floor(min / a), bCount = Math.floor(min / b), aSum = a * aCount, bSum = b * bCount, diff = Math.abs(aSum - bSum), minDiff;
  const closestRatios = [];
  if (diff < threshold && aCount != 0 && bCount != 0) { minDiff = diff; closestRatios.push([aCount, bCount, aSum, bSum, diff, "Closest Yet"]); } else { minDiff = threshold; }
  while (aSum < max && bSum < max) {
    if (aSum < bSum) { aSum += a; aCount++; } else { bSum += b; bCount++; }
    diff = Math.abs(aSum - bSum);
    if (diff <= threshold) { if (diff < minDiff) { minDiff = diff; closestRatios.push([aCount, bCount, aSum, bSum, diff, "Closest Yet"]); } else { closestRatios.push([aCount, bCount, aSum, bSum, diff, "Not Closest Yet"]); } }
  }
  return closestRatios;
}

// --- Optimized Linear Search Algorithm (Winner for "All Ratios") ---
function matchRatiosLinearSearch(a, b, threshold, onlyClosest, maxComplexity, primitiveOnly, gcdFunc) {
  let aCount = 1, bCount = 1, aSum = a, bSum = b, minDiff = threshold;
  const lightweightRatios = [];
  while (aCount + bCount < maxComplexity) {
    if (aSum < bSum) { aSum += a; aCount++; } else { bSum += b; bCount++; }
    const diff = Math.abs(aSum - bSum);
    if (diff < threshold) {
      if (primitiveOnly && gcdFunc(aCount, bCount) !== 1) continue;
      if (onlyClosest) { if (diff < minDiff) { minDiff = diff; lightweightRatios.length = 0; lightweightRatios.push([aCount, bCount]); } } else { lightweightRatios.push([aCount, bCount]); }
    }
  }
  if (onlyClosest && lightweightRatios.length > 0) { minDiff = Math.abs((lightweightRatios[0][0] * a) - (lightweightRatios[0][1] * b)); }
  const finalResults = [];
  for (const ratio of lightweightRatios) {
    const [resACount, resBCount] = ratio;
    const resASum = resACount * a, resBSum = resBCount * b, resDiff = Math.abs(resASum - resBSum);
    finalResults.push([resACount, resBCount, resASum, resBSum, resDiff, resDiff <= minDiff, resACount + resBCount, resDiff / Math.max(resASum, resBSum)]);
  }
  return finalResults;
}

// --- Continued Fractions Algorithm (Winner for "Best Yet Only") ---
function matchRatiosContinuedFractions(a, b, maxComplexity) {
    const target = a / b;
    const lightweightRatios = [];
    let temp = target, h_prev = 0, h_curr = 1, k_prev = 1, k_curr = 0;
    while (true) {
      const int_part = Math.floor(temp);
      const h_next = int_part * h_curr + h_prev;
      const k_next = int_part * k_curr + k_prev;
      if (h_next + k_next > maxComplexity) break;
      lightweightRatios.push([k_next, h_next]);
      h_prev = h_curr; h_curr = h_next; k_prev = k_curr; k_curr = k_next;
      const frac_part = temp - int_part;
      if (frac_part < 1e-15) break;
      temp = 1 / frac_part;
    }
    const finalResults = [];
    for (const ratio of lightweightRatios) {
        const [resACount, resBCount] = ratio;
        const resASum = resACount * a, resBSum = resBCount * b, resDiff = Math.abs(resASum - resBSum);
        finalResults.push([resACount, resBCount, resASum, resBSum, resDiff, true, resACount + resBCount, resDiff / Math.max(resASum, resBSum)]);
    }
    return finalResults;
}

// ==================================================================================
// BENCHMARK DEFINITIONS
// ==================================================================================

const A = Math.PI;
const B = 1;
const THRESHOLD = 0.01;
const LIMIT = 200_000_000; // A high enough limit for meaningful results

Deno.bench({
  name: "Baseline: Old Method (Sum Limits)",
  group: "Ratio Finding",
  baseline: true,
  fn: () => {
    matchRatiosSumLimits(A, B, 1, LIMIT * B, THRESHOLD);
  }
});

Deno.bench({
    name: "Linear Search: Primitives Only",
    group: "Ratio Finding",
    fn: () => {
      matchRatiosLinearSearch(A, B, THRESHOLD, false, LIMIT, true, gcd);
    }
});

Deno.bench({
  name: "Linear Search: Best Yet Only",
  group: "Ratio Finding",
  fn: () => {
    matchRatiosLinearSearch(A, B, THRESHOLD, true, LIMIT, false, gcd);
  }
});

Deno.bench({
    name: "Algorithmic Change: Continued Fractions (Best Yet Only)",
    group: "Ratio Finding",
    fn: () => {
      matchRatiosContinuedFractions(A, B, LIMIT);
    }
});