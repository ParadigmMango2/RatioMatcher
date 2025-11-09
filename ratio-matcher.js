// constants
const DISPLAY_LIMIT = 10_000;


// init document
const html = `
  <div id="ratio-matcher" class="ratio-matcher">
    <h3 id="worker-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support web workers.</h3>
    <details>
      <summary>Tool Explainer</summary>
      <p>This tool finds integer multiples of two numbers (A and B) such that <code>countA * A ≈ countB * B</code>. By default, it prioritizes finding the simplest ratios first and provides quality metrics for each match.</p>
    </details><br>
    <div>
      <label class="dotted-underline" title="First number to match.&#10;Minimum Value: > 0">Ratio A: <input id="ratio-a-input" type="number" step="any" min="0.00000000001" value="3.14159265359" size="12" required></label>
      <label class="dotted-underline" title="Second number to match.&#10;Minimum Value: > 0">Ratio B: <input id="ratio-b-input" type="number" step="any" min="0.00000000001" value="1" size="12" required></label>
      <label class="dotted-underline" title="The maximum absolute difference to include a match.&#10;Minimum Value: > 0">Threshold: <input id="threshold-input" type="number" step="any" min="0.00000000001" value="0.05" size="12" required></label>
    </div>
    <label class="dotted-underline" title="Search for matches where (Count A + Count B) is greater than or equal to this value.&#10;Minimum Value: 0">Min Complexity: <input id="min-complexity" type="number" step="1" min="0" value="0" size="20" required></label>
    <label class="dotted-underline" title="Search for matches where (Count A + Count B) is less than this value.&#10;Higher values take longer to compute.&#10;Minimum Value: 2">Max Complexity: <input id="max-complexity" type="number" step="1" min="2" value="1000" size="20" required></label>
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
    <p id="display-limit-warning" class="warning" hidden>Display limit reached! Showing the simplest ${DISPLAY_LIMIT.toLocaleString('en-US')} results.</p>
    <div id="calculations-scroll">
      <table id="calculations"></table>
    </div>
    <h5>Developed by ParadigmMango & InfiniteQuery</h5>
  </div>
`;
document.currentScript.insertAdjacentHTML("afterend", html);


// document objects
const tool                = document.querySelector("#ratio-matcher");
const workerWarning       = tool.querySelector("#worker-warning");
const ratioA              = tool.querySelector("#ratio-a-input");
const ratioB              = tool.querySelector("#ratio-b-input");
const threshold           = tool.querySelector("#threshold-input");
const onlyClosestBox      = tool.querySelector("#only-closest-box");
const minComplexity       = tool.querySelector("#min-complexity");
const maxComplexity       = tool.querySelector("#max-complexity");
const primitiveRatiosBox  = tool.querySelector("#primitive-ratios-box");
const sortBySelect        = tool.querySelector("#sort-by-select");
const calculateBtn        = tool.querySelector("#calculate");
const displayLimitWarning = tool.querySelector("#display-limit-warning");
const calculationsTable   = tool.querySelector("#calculations");
const calculationsStatus  = tool.querySelector("#calculations-status");


// init worker
let worker;
let workerURL;

function cleanupWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerURL) {
    URL.revokeObjectURL(workerURL);
    workerURL = null;
  }
}

function initWorker() {
  // clean up previous worker and URL if they exist
  cleanupWorker();

  const workerScript = `
    self.onmessage = function(event) {
      const { a, b, threshold, onlyClosest, minComplexity, maxComplexity, primitiveOnly } = event.data;
      const gcdFunc = ${gcd.toString()};
      const matchRatiosLinearSearch = ${matchRatiosLinearSearch.toString()};
      const matchRatiosContinuedFractions = ${matchRatiosContinuedFractions.toString()};
      const matchRatios = ${matchRatios.toString()};
      const finalResults = matchRatios(a, b, threshold, onlyClosest, minComplexity, maxComplexity, primitiveOnly, gcdFunc);
      self.postMessage({ results: finalResults });
    };
  `;
  const blob = new Blob([workerScript], { type: "application/javascript" });
  workerURL = URL.createObjectURL(blob);
  worker = new Worker(workerURL);
  // worker keeps its own reference to the script, so we can revoke the URL now
  URL.revokeObjectURL(workerURL);
  workerURL = null;
  worker.onmessage = function (event) {
    let { results } = event.data;
    calculateBtn.disabled = false;
    const sortBy = sortBySelect.value;

    calculationsStatus.textContent = `Found ${results.length.toLocaleString('en-US')} matches. Sorting and rendering...`;

    if (sortBy === 'quality') {
      results.sort((resA, resB) => resA[6] - resB[6]);
    } else { // Default to 'complexity'
      results.sort((resA, resB) => resA[5] - resB[5]);
    }

    if (results.length === 0) {
      calculationsStatus.textContent = "No matches found within the given threshold and complexity.";
      calculationsTable.innerHTML = "";
      return;
    }

    calculationsStatus.textContent = `Found ${results.length.toLocaleString('en-US')} matches.`;
    calculationsTable.innerHTML = "";
    const tableHead = document.createElement("thead");
    tableHead.innerHTML = `
      <tr>
        <th colspan="7" class="legend-header">
          <div class="legend">
            <div id="gradient-descriptor" class="descriptor">
              <p>Closer to threshold</p>
              <div class="gradient-border">
                <div class="square" style="background-color: #000000;"></div>
                <div class="square" style="background-color: #0a1f0a;"></div>
                <div class="square" style="background-color: #143d14;"></div>
                <div class="square" style="background-color: #1f5c1f;"></div>
                <div class="square" style="background-color: #297a29;"></div>
                <div class="square" style="background-color: #339933;"></div>
              </div>
              <p>Closer to zero</p>
            </div>
            <div id="closest-yet-descriptor" class="descriptor">
              <p style="font-weight: 900;">Closest yet</p>
              <div class="gradient-border">
                <div class="square" style="background-color: #BA8E23;"></div>
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
    calculationsTable.appendChild(tableHead);
    const tableBody = document.createElement("tbody");

    if (results.length > DISPLAY_LIMIT) {
      results = results.slice(0, DISPLAY_LIMIT);
      const sortTypeText = sortBy === 'quality' ? 'best quality' : 'simplest';
      displayLimitWarning.textContent = `Display limit reached! Showing the ${DISPLAY_LIMIT.toLocaleString('en-US')} ${sortTypeText} results.`;
      displayLimitWarning.hidden = false;
    }

    const fragment = document.createDocumentFragment();
    for (const closestRatio of results) {
      const [countA, countB, sumA, sumB, difference, complexity, quality, isBestYet] = closestRatio;
      const tableRow = document.createElement("tr");
      tableRow.innerHTML = `
        <td>${countA.toLocaleString('en-US')}</td>
        <td>${countB.toLocaleString('en-US')}</td>
        <td>${complexity.toLocaleString('en-US')}</td>
        <td>${sumA.toFixed(5)}</td>
        <td>${sumB.toFixed(5)}</td>
        <td>${difference.toExponential(4)}</td>
        <td>${quality.toExponential(4)}</td>
      `;
      if (isBestYet) {
        tableRow.className = "closestYet";
      } else {
        const diffRatio = difference / parseFloat(threshold.value);
        const lightnessValue = 40 - diffRatio * 40;
        tableRow.style.setProperty('--lightness-value', `${lightnessValue}%`);
      }

      fragment.appendChild(tableRow);
    }

    tableBody.appendChild(fragment);
    calculationsTable.appendChild(tableBody);
  }

  worker.onerror = function (event) {
    calculationsStatus.textContent = "Error! Check console for details.";
    console.error("Worker Error:", event.message);
    calculateBtn.disabled = false;
  }
}


if (!window.Worker) {
  workerWarning.removeAttribute("hidden");
} else {
  initWorker();
}

// clean up worker on page unload
window.addEventListener("beforeunload", cleanupWorker);

calculateBtn.onclick = calculate;


function calculate() {
  if (!ratioA.checkValidity() || !ratioB.checkValidity() || !threshold.checkValidity() || !minComplexity.checkValidity() || !maxComplexity.checkValidity()) return;

  displayLimitWarning.hidden = true;

  worker.postMessage({
    a: parseFloat(ratioA.value),
    b: parseFloat(ratioB.value),
    threshold: parseFloat(threshold.value),
    onlyClosest: onlyClosestBox.checked,
    minComplexity: parseInt(minComplexity.value, 10),
    maxComplexity: parseInt(maxComplexity.value, 10),
    primitiveOnly: primitiveRatiosBox.checked
  });

  calculationsStatus.textContent = "Calculating...";
  calculationsTable.innerHTML = "";
  calculateBtn.disabled = true;
}


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
  const MAX_ITERATIONS = 20_000_000_000_000;
  let iterations = 0;
  let aCount = 1, bCount = 1, aSum = a, bSum = b;
  const flatRatios = [];

  while ((aCount + bCount < maxComplexity) && (iterations < MAX_ITERATIONS)) {
    if (aSum < bSum) { aSum += a; aCount++; } else { bSum += b; bCount++; }

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

  return finalResults;
}


function matchRatiosContinuedFractions(a, b, minComplexity, maxComplexity) {
  const MAX_ITERATIONS = 1_000_000_000;
  let iterations = 0;
  const target = a / b;
  const lightweightRatios = [];
  let temp = target;
  let h_prev = 0, h_curr = 1;
  let k_prev = 1, k_curr = 0;

  while (iterations < MAX_ITERATIONS) {
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

  return finalResults;
}
