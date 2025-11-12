// ================================================
// Constants
// ================================================
const DISPLAY_LIMIT = 10_000;
const FRACTION_DIGITS = 5;
const MAX_ITERATIONS = 100_000_000;


// ================================================
// Core Algorithm Functions
// ================================================
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}


function matchRatios(a, b, threshold, onlyClosest, minComplexity, maxComplexity, primitiveOnly, gcdFunc) {
  if (onlyClosest) {
    return matchRatiosContinuedFractions(a, b, minComplexity, maxComplexity);
  } else {
    return matchRatiosLinearSearch(a, b, threshold, minComplexity, maxComplexity, primitiveOnly, gcdFunc);
  }
}


function matchRatiosLinearSearch(a, b, threshold, minComplexity, maxComplexity, primitiveOnly, gcdFunc) {
  let iterations = 0;
  let aCount = 1, bCount = 1, aSum = a, bSum = b;
  const flatRatios = [];
  let iterationLimitReached = false;

  while (aCount + bCount < maxComplexity) {
    if (iterations > MAX_ITERATIONS) {
      iterationLimitReached = true;
      break;
    }

    if (aSum < bSum) {
      aSum += a;
      aCount++;
    } else {
      bSum += b;
      bCount++;
    }

    const diff = Math.abs(aSum - bSum);

    if (diff < threshold) {
      if (aCount + bCount < minComplexity) continue;
      if (primitiveOnly && gcdFunc(aCount, bCount) !== 1) continue;

      flatRatios.push(aCount, bCount);
    }

    iterations++;
  }

  const finalResults = [];
  let minDiff = threshold;
  for (let i = 0; i < flatRatios.length; i += 2) {
    const resACount = flatRatios[i];
    const resBCount = flatRatios[i + 1];
    const resASum = resACount * a;
    const resBSum = resBCount * b;
    const resDiff = Math.abs(resASum - resBSum);
    const complexity = resACount + resBCount;
    const quality = resDiff / Math.max(resASum, resBSum);
    let isBestYet;
    if (resDiff < minDiff) {
      minDiff = resDiff;
      isBestYet = true;
    } else {
      isBestYet = false;
    }
    finalResults.push([resACount, resBCount, resASum, resBSum, resDiff, complexity, quality, isBestYet]);
  }

  return { results: finalResults, iterationLimitReached };
}


function matchRatiosContinuedFractions(a, b, minComplexity, maxComplexity) {
  let iterations = 0;
  const target = a / b;
  const lightweightRatios = [];
  let temp = target;
  let h_prev = 0, h_curr = 1;
  let k_prev = 1, k_curr = 0;
  let iterationLimitReached = false;

  while (true) {
    if (iterations > MAX_ITERATIONS) {
      iterationLimitReached = true;
      break;
    }

    const int_part = Math.floor(temp);
    const h_next = int_part * h_curr + h_prev;
    const k_next = int_part * k_curr + k_prev;
    const complexity = h_next + k_next;

    if (complexity > maxComplexity) break;

    if (complexity >= minComplexity) {
      lightweightRatios.push([k_next, h_next]);
    }

    h_prev = h_curr; h_curr = h_next;
    k_prev = k_curr; k_curr = k_next;

    const frac_part = temp - int_part;
    if (frac_part < 1e-15) break;

    temp = 1 / frac_part;
    iterations++;
  }

  const finalResults = [];
  for (const ratio of lightweightRatios) {
    const [resACount, resBCount] = ratio;
    const resASum = resACount * a;
    const resBSum = resBCount * b;
    const resDiff = Math.abs(resASum - resBSum);
    const complexity = resACount + resBCount;
    const quality = resDiff / Math.max(resASum, resBSum);
    const isBestYet = true;
    finalResults.push([resACount, resBCount, resASum, resBSum, resDiff, complexity, quality, isBestYet]);
  }

  return { results: finalResults, iterationLimitReached };
}


// ================================================
// Web Component
// ================================================
class RatioMatcher extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Format the HTML with the constants
    // Warning: This only replaces the first occurrence of the strings
    const formattedHTML = HTML
        .replace('__DISPLAY_LIMIT__', DISPLAY_LIMIT.toLocaleString('en-US'))
        .replace('__MAX_ITERATIONS__', MAX_ITERATIONS.toLocaleString('en-US'));

    this.root.innerHTML = `<style>${CSS}</style>${formattedHTML}`;
  }
}
customElements.define('ratio-matcher', RatioMatcher);
const ratioMatcher = document.createElement("ratio-matcher");

document.currentScript.insertAdjacentElement("afterend", ratioMatcher);
