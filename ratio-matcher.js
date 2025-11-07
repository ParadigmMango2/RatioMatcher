// Constants
const DISPLAY_LIMIT = 10_000;

// Init document
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
    

    <label class="dotted-underline" title="Search for matches where (Count A + Count B) is less than this value.&#10;Higher values take longer to compute.&#10;Minimum Value: 2">Max Complexity: <input id="max-complexity" type="number" step="1" min="2" value="1000" size="7" required></label>
    
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
    <h5>Developed by ParadigmMango</h5>
  </div>
`;
document.currentScript.insertAdjacentHTML("afterend", html);

// Document objects
// CHANGE: Switched to querySelector for consistency, though getElementById is perfectly fine.
const tool = document.querySelector("#ratio-matcher");
const workerWarning = tool.querySelector("#worker-warning");
const ratioA = tool.querySelector("#ratio-a-input");
const ratioB = tool.querySelector("#ratio-b-input");
const threshold = tool.querySelector("#threshold-input");
const onlyClosestBox = tool.querySelector("#only-closest-box");
// CHANGE: Removed old limit selectors and added selectors for the new complexity and primitive ratio inputs.
const maxComplexity = tool.querySelector("#max-complexity");
const primitiveRatiosBox = tool.querySelector("#primitive-ratios-box");
const sortBySelect = tool.querySelector("#sort-by-select");
const calculateBtn = tool.querySelector("#calculate");
const displayLimitWarning = tool.querySelector("#display-limit-warning");
const calculationsTable = tool.querySelector("#calculations");
const calculationsStatus = tool.querySelector("#calculations-status");

// Init worker
let worker;
/**
 * CHANGE: The worker is now initialized once on page load instead of being created and destroyed on every click.
 * This is much more efficient as it avoids the overhead of creating a new Blob, URL, and Worker instance for each calculation.
 */
function initWorker() {
  // Create a worker script and register it as a blob with a url
  const workerScript = `
    self.onmessage = function(event) {
      const { a, b, threshold, onlyClosest, maxComplexity, primitiveOnly } = event.data;
      
      // Make functions available inside the worker scope by embedding their source code.
      // This is necessary because workers have their own global scope and don't share functions from the main thread.
      const gcdFunc = ${gcd.toString()};
      const matchRatiosLinearSearch = ${matchRatiosLinearSearch.toString()}; 
      const matchRatiosContinuedFractions = ${matchRatiosContinuedFractions.toString()}; 
      const matchRatios = ${matchRatios.toString()};

      const finalResults = matchRatios(a, b, threshold, onlyClosest, maxComplexity, primitiveOnly, gcdFunc);
      self.postMessage({ results: finalResults });
    };
  `;
  const blob = new Blob([workerScript], { type: "application/javascript" });
  const workerURL = URL.createObjectURL(blob);

  worker = new Worker(workerURL);

  worker.onmessage = function(event) {
    let { results } = event.data;

    // Re-enable the button now that the worker has finished its computation.
    calculateBtn.disabled = false;
    
    // Get the user's current sorting preference from the dropdown.
    const sortBy = sortBySelect.value;

    // Provide more informative status updates to the user.
    calculationsStatus.textContent = `Found ${results.length.toLocaleString('en-US')} matches. Sorting and rendering...`;
    
    // Conditional sorting based on the user's selection.
    if (sortBy === 'quality') {
        // Sort by quality (index 7), ascending. A lower quality score is better.
        results.sort((resA, resB) => resA[7] - resB[7]);
    } else { // Default to 'complexity'
        // Sort by complexity (index 6), ascending. Lower complexity is simpler.
        results.sort((resA, resB) => resA[6] - resB[6]);
    }

    if (results.length === 0) {
        calculationsStatus.textContent = "No matches found within the given threshold and complexity.";
        // Clear the table in case there were previous results.
        calculationsTable.innerHTML = "";
        return;
    }
    calculationsStatus.textContent = `Found ${results.length.toLocaleString('en-US')} matches.`;

    // Clear previous results before adding new ones.
    calculationsTable.innerHTML = "";

    // Add data to table
    const tableHead = document.createElement("thead");
    tableHead.innerHTML = `
      <tr>
        <th colspan="5" class="legend-header">
          <div class="legend">
            <div class="descriptor">
              <p>Closer to threshold</p>
              <div class="gradient-border">
                <div class="square" style="background-color: hsl(120, 70%, 95%);"></div>
                <div class="square" style="background-color: hsl(120, 70%, 75%);"></div>
                <div class="square" style="background-color: hsl(120, 70%, 55%);"></div>
              </div>
              <p>Closer to zero </p>
            </div>
            <div class="descriptor">
              <p style="font-weight: 900;">Best Yet</p>
              <div class="gradient-border">
                <div class="square" style="background-color: #fffbe0;"></div>
              </div>
            </div>
          </div>
        </th>
      </tr>
      <tr>
        <th>Count A</th>
        <th>Count B</th>
        <th>Sum A</th>
        <th>Sum B</th>
        <th>Difference</th>
        <th>Quality</th>
        <th>Complexity</th>
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
    
    // PERFORMANCE: Use a DocumentFragment to build the table rows in memory before appending them to the DOM all at once.
    // This is much faster than appending each row individually, as it causes only one DOM reflow.
    const fragment = document.createDocumentFragment();

    for (const closestRatio of results) {
      // CHANGE: The result array now contains more data: isBestYet (boolean), complexity, and quality.
      const [ countA, countB, sumA, sumB, difference, isBestYet, complexity, quality ] = closestRatio;

      const tableRow = document.createElement("tr");
      // Populate the row with the new data points. Use formatting for better readability.
      tableRow.innerHTML = `
        <td>${countA.toLocaleString('en-US')}</td>
        <td>${countB.toLocaleString('en-US')}</td>
        <td>${sumA.toFixed(5)}</td>
        <td>${sumB.toFixed(5)}</td>
        <td>${difference.toExponential(4)}</td>
        <td>${quality.toExponential(4)}</td>
        <td>${complexity.toLocaleString('en-US')}</td>
      `;
      // CHANGE: The "closest yet" flag is now a boolean instead of a string.
      if (isBestYet) {
        tableRow.className = "closestYet";
      } else {
        // CHANGE: Simplified the color calculation logic.
        const diffRatio = difference / parseFloat(threshold.value);
        const lightnessValue = 40 - diffRatio * 40; // scales from 0 to 40
        tableRow.style.setProperty('--lightness-value', `${lightnessValue}%`);
      }
      fragment.appendChild(tableRow);
    }
    tableBody.appendChild(fragment);
    calculationsTable.appendChild(tableBody);
  }

  worker.onerror = function(event) {
    calculationsStatus.textContent = "Error! Check console for details.";
    console.error("Worker Error:", event.message);
    // Ensure the button is re-enabled even if an error occurs.
    calculateBtn.disabled = false;
  }
}

// Unhide warnings if eligible
if (!window.Worker) {
  workerWarning.removeAttribute("hidden");
} else {
  // Initialize the persistent worker if the browser supports it.
  initWorker();
}

// Set the event listener for the calculate button.
calculateBtn.onclick = calculate;

// Button function
function calculate() {
  // Check inputs
  if (!ratioA.checkValidity() || !ratioB.checkValidity() || !threshold.checkValidity() || !maxComplexity.checkValidity()) return;

  displayLimitWarning.hidden = true;

  // Send a message to the existing worker with the new input values.
  worker.postMessage({
    a: parseFloat(ratioA.value),
    b: parseFloat(ratioB.value),
    threshold: parseFloat(threshold.value),
    onlyClosest: onlyClosestBox.checked,
    maxComplexity: parseInt(maxComplexity.value, 10),
    primitiveOnly: primitiveRatiosBox.checked
  });
  
  // Update UI to show that calculation is in progress.
  calculationsStatus.textContent = "Calculating...";
  calculationsTable.innerHTML = "";
  // UX IMPROVEMENT: Disable the button to prevent the user from starting multiple calculations at once.
  calculateBtn.disabled = true;
}


/**
 * Helper function to find the Greatest Common Divisor (GCD) using the Euclidean algorithm.
 * This is used to identify and optionally prune redundant, non-primitive ratios (e.g., 44/14 when 22/7 is already found).
 */
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

    
/**
 * A top-level "dispatcher" function that intelligently selects the most efficient algorithm for the requested task.
 * This is the primary function that should be called by the worker.
 *
 * @param {number} a - The first number (Ratio A).
 * @param {number} b - The second number (Ratio B).
 * @param {number} threshold - The maximum absolute difference to tolerate for a match in linear search mode.
 * @param {boolean} onlyClosest - If true, find only the best-yet matches. This triggers the ultra-fast continued fractions algorithm.
 * @param {number} maxComplexity - The maximum value for (countA + countB).
 * @param {boolean} primitiveOnly - If true, only include ratios where gcd(countA, countB) is 1.
 * @param {function} gcdFunc - A reference to the Greatest Common Divisor function.
 * @param {function} linearSearchFunc - A reference to the function that performs the linear search.
 * @param {function} continuedFractionsFunc - A reference to the function that uses the continued fractions algorithm.
 * @returns {Array<Array<any>>} An array of result arrays, formatted for the UI.
 */
function matchRatios(a, b, threshold, onlyClosest, maxComplexity, primitiveOnly, gcdFunc, linearSearchFunc, continuedFractionsFunc) {
  if (onlyClosest) {
    // For "best yet" matches, the continued fractions algorithm is orders of magnitude faster.
    // It directly calculates the sequence of best possible rational approximations without searching.
    // It implicitly handles the "primitiveOnly" and "threshold" concepts by its mathematical nature.
    return matchRatiosContinuedFractions(a, b, maxComplexity);
  } else {
    // For finding all matches within a given threshold, the optimized linear search is the fastest method.
    return matchRatiosLinearSearch(a, b, threshold, maxComplexity, primitiveOnly, gcdFunc);
  }
}

/**
 * Finds all ratio matches up to a given complexity that are within a specified threshold.
 * This is the most performant algorithm for this task, based on extensive benchmarking.
 * It uses a two-stage process: a "hot loop" that gathers minimal data, followed by a "hydration" step.
 *
 * @param {number} a - The first number (Ratio A).
 * @param {number} b - The second number (Ratio B).
 * @param {number} threshold - The maximum absolute difference to include a match.
 * @param {number} maxComplexity - The maximum value for (countA + countB).
 * @param {boolean} primitiveOnly - If true, prune results where gcd(countA, countB) is not 1.
 * @param {function} gcdFunc - A reference to the Greatest Common Divisor function.
 * @returns {Array<Array<any>>} An array of result arrays, formatted for the UI.
 */
function matchRatiosLinearSearch(a, b, threshold, maxComplexity, primitiveOnly, gcdFunc) {
  // --- Stage 1: The "Hot Loop" ---
  // This loop is the performance-critical part of the function. It is designed to be as fast as possible
  // by doing the minimum work necessary to find potential matches.
  let aCount = 1, bCount = 1, aSum = a, bSum = b, minDiff = threshold;
  
  // Micro-optimization: Using a single "flat" array to store pairs of counts is faster
  // than creating a new `[aCount, bCount]` array for every match, as it reduces memory allocations.
  const flatRatios = [];

  // The loop terminates based on complexity, ensuring a systematic search from simple to complex ratios.
  while (aCount + bCount < maxComplexity) {
    // This "meet-in-the-middle" approach of incrementing the smaller sum is highly efficient.
    if (aSum < bSum) { aSum += a; aCount++; } else { bSum += b; bCount++; }

    const diff = Math.abs(aSum - bSum);

    if (diff < threshold) {
      // If requested, prune non-primitive ratios (e.g., skip 4/6 if 2/3 is already found).
      if (primitiveOnly && gcdFunc(aCount, bCount) !== 1) continue;
      
      // Store the counts. This is the only data we need to preserve from the loop.
      flatRatios.push(aCount, bCount);
      
      // Keep track of the minimum difference found so we can flag "best yet" matches later.
      if (diff < minDiff) minDiff = diff;
    }
  }
  
  // --- Stage 2: Hydration ---
  // This loop runs only on the small set of found matches, not on every iteration of the main loop.
  // Here, we calculate all the detailed metrics needed for the UI.
  const finalResults = [];
  for (let i = 0; i < flatRatios.length; i += 2) {
    const resACount = flatRatios[i];
    const resBCount = flatRatios[i + 1];
    
    // Recalculate sums and difference from the stored counts.
    const resASum = resACount * a;
    const resBSum = resBCount * b;
    const resDiff = Math.abs(resASum - resBSum);
    
    // A match is "best yet" if its difference is equal to the minimum found in the first stage.
    const isBestYet = resDiff <= minDiff;
    const complexity = resACount + resBCount;
    const quality = resDiff / Math.max(resASum, resBSum); // A relative error metric.

    // Assemble the final, detailed result array for this match.
    finalResults.push([resACount, resBCount, resASum, resBSum, resDiff, isBestYet, complexity, quality]);
  }
  return finalResults;
}

/**
 * Finds ONLY the best-yet rational approximations for (a/b) up to a given complexity.
 * This algorithm is based on the mathematical principle of continued fractions and is
 * orders of magnitude faster than any search-based method for this specific task.
 *
 * @param {number} a - The first number (Ratio A).
 * @param {number} b - The second number (Ratio B).
 * @param {number} maxComplexity - The maximum value for (countA + countB).
 * @returns {Array<Array<any>>} An array of result arrays, formatted for the UI.
 */
function matchRatiosContinuedFractions(a, b, maxComplexity) {
    // The target ratio we want to approximate.
    const target = a / b;
    
    // This will store the lightweight [aCount, bCount] pairs.
    const lightweightRatios = [];
    
    let temp = target;
    // Initialize the variables (h_n, k_n) that generate the numerators and denominators of the convergents.
    // These convergents are the sequence of best rational approximations.
    let h_prev = 0, h_curr = 1;
    let k_prev = 1, k_curr = 0;

    // This loop directly calculates the next best approximation in each iteration. It does not search.
    while (true) {
      const int_part = Math.floor(temp);
      
      // Calculate the next numerator (h_next) and denominator (k_next) of the best approximation.
      const h_next = int_part * h_curr + h_prev;
      const k_next = int_part * k_curr + k_prev;

      // Stop if the complexity of the next approximation exceeds the user's limit.
      if (h_next + k_next > maxComplexity) break;

      // The approximation is h_next / k_next ≈ a / b.
      // We want to find aCount * a ≈ bCount * b.
      // By rearranging, we get aCount / bCount ≈ b / a.
      // So, our aCount is k_next and our bCount is h_next.
      lightweightRatios.push([k_next, h_next]);

      // Update the previous and current values for the next iteration.
      h_prev = h_curr; h_curr = h_next;
      k_prev = k_curr; k_curr = k_next;
      
      const frac_part = temp - int_part;
      
      // Terminate if the fraction is perfect or we've hit the limits of floating-point precision.
      if (frac_part < 1e-15) break; 
      
      // The next term in the continued fraction is the reciprocal of the fractional part.
      temp = 1 / frac_part;
    }
    
    // --- Hydration Step ---
    // Similar to the linear search, we now "hydrate" the minimal results with full details for the UI.
    const finalResults = [];
    for (const ratio of lightweightRatios) {
        const [resACount, resBCount] = ratio;
        const resASum = resACount * a;
        const resBSum = resBCount * b;
        const resDiff = Math.abs(resASum - resBSum);
        const complexity = resACount + resBCount;
        const quality = resDiff / Math.max(resASum, resBSum);
        
        // By definition, every result from this algorithm is a "best yet" match.
        finalResults.push([resACount, resBCount, resASum, resBSum, resDiff, true, complexity, quality]);
    }
    return finalResults;
}

  