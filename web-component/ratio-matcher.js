const CSS = `
input,
select,
button {
  border: 1px solid #666666;
  border-radius: 2px;
}

input:invalid {
  background-color: #ff000055;
}

input[type='number'] {
  -moz-appearance:textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

.dotted-underline {
  text-decoration-line: underline;
  text-decoration-style: dashed;
}

.warning {
  color: red;
}

.legend {
  display: flex;
}

.descriptor {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

#closest-yet-descriptor {
  margin-left: auto;
}

.legend p {
  margin-top: 0;
  margin-bottom: 0;
}

.gradient-border {
  display: inline-flex;
  border: 1px solid;
}

.square {
  width: 20px;
  height: 20px;
}

#calculations tr:not(.closestYet),
.gradient-item {
  /* Calculate color based on closeness to 0 */
  --hue: 120deg;
  --lightness-value: calc(40% * var(--diff-ratio));
  background-color: light-dark(
    hsl(var(--hue), 50%, calc(60% + var(--lightness-value))),
    hsl(var(--hue), 50%, calc(40% - var(--lightness-value)))
  );
}

#calculations-scroll {
  max-height: 500px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  display: inline-block;
}

#calculations {
  /* Only way to have bordered sticky headers is through separate borders */
  border-collapse: separate;
  border-spacing: 0;

  td,
  th {
    border-bottom: 1px solid;
    border-right: 1px solid;
    padding: 5px;
  }

  th {
    /* sticky header */
    position: sticky;

    background-color: light-dark(white, black);

    border-top: 1px solid;
  }

  th.legend-header {
    font-weight: normal;

    border-bottom: 0;

    top: 0px;
  }

  th:not(.legend-header) {
    top: 33px;
  }

  td:first-child,
  th:first-child {
    border-left: 1px solid;
  }

  tr.bestYet {
    background-color: light-dark(#dcb145, #BA8E23);
    font-weight: 900;
  }
}

`;
const HTML = `
<div id="ratio-matcher" class="ratio-matcher">
  <h2>Ratio Matcher</h2>
  <h3 id="worker-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support web
    workers.</h3>
  <details>
    <summary>Tool Explainer</summary>
    <p>This tool helps you find when two different numbers can be made approximately equal by multiplying each one
      by whole numbers (integers).</p>
    <p><strong>Example:</strong> If you have the number 3.14 (like π) and the number 1, this tool will find that 7 ×
      3.14 ≈ 22 × 1 (both equal about 22). It shows you all the combinations where multiplying number A by some
      count and number B by some count gives you results that are very close to each other.</p>
    <p><strong>Approximating irrational numbers:</strong> When one of your numbers is 1 and the other is an
      irrational number (like π, √2, or e), the counts in the output can be used to create a fraction that
      approximates that irrational number. For example, if you see "Count A: 7, Count B: 22" with Ratio A = π and
      Ratio B = 1, then 22/7 is an approximation of π.</p>
    <p>The tool can sort matches by simplicity (lowest complexity first) or by best match (lowest quality score
      first). Each match shows how close it is, and the "best yet" matches (highlighted in gold) are the closest
      matches found so far.</p>
  </details><br>
  <div>
    <label class="dotted-underline" title="First number to match.&#10;Minimum Value: > 0">Ratio A: <input
        id="ratio-a-input" type="number" step="any" min="0.00000000001" value="3.14159265359" size="12"
        required></label>
    <label class="dotted-underline" title="Second number to match.&#10;Minimum Value: > 0">Ratio B: <input
        id="ratio-b-input" type="number" step="any" min="0.00000000001" value="1" size="12" required></label>
    <label class="dotted-underline"
      title="The maximum absolute difference to include a match.&#10;Minimum Value: > 0">Threshold: <input
        id="threshold-input" type="number" step="any" min="0.00000000001" value="0.05" size="12" required></label>
  </div>
  <label class="dotted-underline"
    title="Search for matches where (Count A + Count B) is greater than or equal to this value.&#10;Minimum Value: 0">Min
    Complexity: <input id="min-complexity" type="number" step="1" min="0" value="0" size="20" required></label>
  <label class="dotted-underline"
    title="Search for matches where (Count A + Count B) is less than this value.&#10;Higher values take longer to compute.&#10;Minimum Value: 2">Max
    Complexity: <input id="max-complexity" type="number" step="1" min="2" value="1000" size="20" required></label>
  <div>
    <input type="checkbox" id="only-closest-box" name="only-closest-box">
    <label for="only-closest-box"> Only show best-yet matches</label>
  </div>
  <div>
    <input type="checkbox" id="primitive-ratios-box" name="primitive-ratios-box" checked>
    <label for="primitive-ratios-box"> Only show primitive ratios (GCD=1)</label>
  </div>
  <div>
    <label for="sort-by-select">Sort by: </label>
    <select name="sort-by-select" id="sort-by-select">
      <option value="complexity">Simplicity (Lowest Complexity)</option>
      <option value="quality">Best Match (Lowest Quality Score)</option>
    </select>
  </div>
  <br>
  <button id="calculate">Calculate</button>
  <p id="calculations-status"></p><br>
  <p id="display-limit-warning" class="warning" hidden>Display limit reached! Showing the first
    __DISPLAY_LIMIT__ results.</p>
  <p id="iteration-limit-warning" class="warning" hidden>Iteration limit reached
    __MAX_ITERATIONS__ matches may have been missed.</p>
  <div id="calculations-scroll">
    <table id="calculations"></table>
  </div>
  <h5>Developed by ParadigmMango, InfiniteQuery, and Joshua Langley</h5>
</div>
`;

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
