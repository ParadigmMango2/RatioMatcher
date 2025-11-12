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

    this.worker = null;
    this.workerURL = null;
  }

  connectedCallback() {
    // Format the HTML with the constants
    // Warning: This only replaces the first occurrence of the strings
    const formattedHTML = HTML
        .replace('__DISPLAY_LIMIT__', DISPLAY_LIMIT.toLocaleString('en-US'))
        .replace('__MAX_ITERATIONS__', MAX_ITERATIONS.toLocaleString('en-US'));

    this.root.innerHTML = `<style>${CSS}</style>${formattedHTML}`;

    // document objects
    this.workerWarning         = this.root.querySelector("#worker-warning");
    this.ratioA                = this.root.querySelector("#ratio-a-input");
    this.ratioB                = this.root.querySelector("#ratio-b-input");
    this.threshold             = this.root.querySelector("#threshold-input");
    this.onlyClosestBox        = this.root.querySelector("#only-closest-box");
    this.primitiveRatiosBox    = this.root.querySelector("#primitive-ratios-box");
    this.minComplexity         = this.root.querySelector("#min-complexity");
    this.maxComplexity         = this.root.querySelector("#max-complexity");
    this.sortBySelect          = this.root.querySelector("#sort-by-select");
    this.calculateBtn          = this.root.querySelector("#calculate");
    this.calculationsStatus    = this.root.querySelector("#calculations-status");
    this.displayLimitWarning   = this.root.querySelector("#display-limit-warning");
    this.iterationLimitWarning = this.root.querySelector("#iteration-limit-warning");
    this.calculationsTable     = this.root.querySelector("#calculations");

    // init worker
    if (!window.Worker) {
      this.workerWarning.removeAttribute("hidden");
    } else {
      this.initWorker();
    }

    // set up event listeners
    this.calculateBtn.onclick = () => this.calculate();

    // clean up worker on page unload
    window.addEventListener("beforeunload", () => this.cleanupWorker());
  }

  cleanupWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerURL) {
      URL.revokeObjectURL(this.workerURL);
      this.workerURL = null;
    }
  }

  calculate() {
    if (!this.ratioA.checkValidity() || !this.ratioB.checkValidity() || !this.threshold.checkValidity() || !this.minComplexity.checkValidity() || !this.maxComplexity.checkValidity()) return;

    this.displayLimitWarning.hidden = true;
    this.iterationLimitWarning.hidden = true;

    this.worker.postMessage({
      a: parseFloat(this.ratioA.value),
      b: parseFloat(this.ratioB.value),
      threshold: parseFloat(this.threshold.value),
      onlyClosest: this.onlyClosestBox.checked,
      minComplexity: parseInt(this.minComplexity.value, 10),
      maxComplexity: parseInt(this.maxComplexity.value, 10),
      primitiveOnly: this.primitiveRatiosBox.checked
    });

    this.calculationsStatus.textContent = "Calculating...";
    this.calculationsTable.innerHTML = "";
    this.calculationsTable.hidden = true;
    this.calculateBtn.disabled = true;
  }

  initWorker() {
    // clean up previous worker and URL if they exist
    this.cleanupWorker();

    const workerScript = `
      self.onmessage = function(event) {
        const MAX_ITERATIONS = ${MAX_ITERATIONS};
        const { a, b, threshold, onlyClosest, minComplexity, maxComplexity, primitiveOnly } = event.data;
        const gcdFunc = ${gcd.toString()};
        const matchRatiosLinearSearch = ${matchRatiosLinearSearch.toString()};
        const matchRatiosContinuedFractions = ${matchRatiosContinuedFractions.toString()};
        const matchRatios = ${matchRatios.toString()};
        const { results, iterationLimitReached } = matchRatios(a, b, threshold, onlyClosest, minComplexity, maxComplexity, primitiveOnly, gcdFunc);
        self.postMessage({ results, iterationLimitReached });
      };
    `;
    const blob = new Blob([workerScript], { type: "application/javascript" });
    this.workerURL = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerURL);
    // worker keeps its own reference to the script, so we can revoke the URL now
    URL.revokeObjectURL(this.workerURL);
    this.workerURL = null;
    this.worker.onmessage = (event) => {
      let { results, iterationLimitReached } = event.data;
      this.calculateBtn.disabled = false;
      const sortBy = this.sortBySelect.value;

      if (iterationLimitReached) {
        this.iterationLimitWarning.hidden = false;
      }

      this.calculationsStatus.textContent = `Found ${results.length.toLocaleString('en-US')} matches. Sorting and rendering...`;

      if (sortBy === 'quality') {
        results.sort((resA, resB) => resA[6] - resB[6]);
      } else { // Default to 'complexity'
        results.sort((resA, resB) => resA[5] - resB[5]);
      }

      if (results.length === 0) {
        this.calculationsStatus.textContent = "No matches found within the given threshold and complexity.";
        this.calculationsTable.innerHTML = "";
        return;
      }

      this.calculationsStatus.textContent = `Found ${results.length.toLocaleString('en-US')} matches.`;
      this.calculationsTable.innerHTML = "";
      const tableHead = document.createElement("thead");
      tableHead.innerHTML = `
        <tr>
          <th colspan="7" class="legend-header">
            <div class="legend">
              <div id="gradient-descriptor" class="descriptor">
                <p>Closer to threshold</p>
                <div class="gradient-border">
                  <div class="gradient-item square" style="--diff-ratio: 1.00;"></div>
                  <div class="gradient-item square" style="--diff-ratio: 0.8;"></div>
                  <div class="gradient-item square" style="--diff-ratio: 0.6;"></div>
                  <div class="gradient-item square" style="--diff-ratio: 0.4;"></div>
                  <div class="gradient-item square" style="--diff-ratio: 0.2;"></div>
                  <div class="gradient-item square" style="--diff-ratio: 0.0;"></div>
                </div>
                <p>Closer to zero</p>
              </div>
              <div id="closest-yet-descriptor" class="descriptor">
                <p style="font-weight: 900;">Best yet</p>
                <div class="gradient-border">
                  <div class="square" style="background-color: #dcb145;"></div>
                </div>
              </div>
            </div>
          </th>
        </tr>
        <tr>
          <th>Count A</th>
          <th>Count B</th>
          <th>Complexity</th>
          <th>Sum A</th>
          <th>Sum B</th>
          <th>Difference</th>
          <th>Quality</th>
        </tr>
      `;
      this.calculationsTable.appendChild(tableHead);
      const tableBody = document.createElement("tbody");

      if (results.length > DISPLAY_LIMIT) {
        results = results.slice(0, DISPLAY_LIMIT);
        const sortTypeText = sortBy === 'quality' ? 'best quality' : 'simplest';
        this.displayLimitWarning.textContent = `Display limit reached! Showing the ${DISPLAY_LIMIT.toLocaleString('en-US')} ${sortTypeText} results.`;
        this.displayLimitWarning.hidden = false;
      }

      const fragment = document.createDocumentFragment();
      for (const closestRatio of results) {
        const [countA, countB, sumA, sumB, difference, complexity, quality, isBestYet] = closestRatio;
        const tableRow = document.createElement("tr");
        tableRow.innerHTML = `
          <td>${countA.toLocaleString('en-US')}</td>
          <td>${countB.toLocaleString('en-US')}</td>
          <td>${complexity.toLocaleString('en-US')}</td>
          <td>${sumA.toLocaleString('en-US', { minimumFractionDigits: FRACTION_DIGITS, maximumFractionDigits: FRACTION_DIGITS })}</td>
          <td>${sumB.toLocaleString('en-US', { minimumFractionDigits: FRACTION_DIGITS, maximumFractionDigits: FRACTION_DIGITS })}</td>
          <td>${difference.toExponential(FRACTION_DIGITS)}</td>
          <td>${quality.toExponential(FRACTION_DIGITS)}</td>
        `;
        if (isBestYet) {
          tableRow.className = "bestYet";
        } else {
          const diffRatio = difference / parseFloat(this.threshold.value);
          tableRow.style.setProperty('--diff-ratio', `${diffRatio}`);
        }

        fragment.appendChild(tableRow);
      }

      tableBody.appendChild(fragment);
      this.calculationsTable.appendChild(tableBody);
      this.calculationsTable.hidden = false;
    };

    this.worker.onerror = (event) => {
      this.calculationsStatus.textContent = "Error! Check console for details.";
      console.error("Worker Error:", event.message);
      this.calculateBtn.disabled = false;
    };
  }
}
customElements.define('ratio-matcher', RatioMatcher);
const ratioMatcher = document.createElement("ratio-matcher");

document.currentScript.insertAdjacentElement("afterend", ratioMatcher);
