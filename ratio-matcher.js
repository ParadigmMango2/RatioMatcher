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
      const matchRatiosFunc = ${matchRatios.toString()};

      const finalResults = matchRatiosFunc(a, b, threshold, onlyClosest, maxComplexity, primitiveOnly, gcdFunc);
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
              <p>Closer to zero</p>
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
 * Main Algorithm, heavily modified and improved
 * @param {function} gcdFunc - The GCD function, passed in as a dependency for use inside the worker.
 */
function matchRatios(a, b, threshold, onlyClosest, maxComplexity, primitiveOnly, gcdFunc) {
  let aCount = 1;
  let bCount = 1;
  let aSum = a;
  let bSum = b;
  let minDiff = threshold; // Initialize minDiff to the max allowed difference.
  const allRatios = [];

  // Change: The main loop is now bounded by total complexity (aCount + bCount), not arbitrary sum/count limits.
  // This ensures a systematic search from the simplest ratios to more complex ones.
  while (aCount + bCount < maxComplexity) {
    // This approach of always incrementing the smaller sum is a form of meet-in-the-middle search, which is efficient.
    if (aSum < bSum) {
      aSum += a;
      aCount++;
    } else {
      bSum += b;
      bCount++;
    }

    const diff = Math.abs(aSum - bSum);

    if (diff < threshold) {
        // Change: Prune non-primitive ratios if the option is checked. This is a key feature for reducing result noise.
        if (primitiveOnly && gcdFunc(aCount, bCount) !== 1) {
            continue; // Skip this ratio as it's a multiple of a simpler one (e.g., skip 44/14).
        }

        // Change: Introduce a complexity metric. It's simply the sum of the counts, providing a clear measure of a ratio's "simplicity".
        const complexity = aCount + bCount;
        
        // Change: Introduce a much better quality metric. Instead of just the absolute difference, this calculates a relative error.
        // A small difference is much more significant for small sums than for large sums. This metric captures that importance.
        const quality = diff / Math.max(aSum, bSum); 
        
        let isBestYet = false;
        if (diff < minDiff) {
            minDiff = diff;
            isBestYet = true;
        }
        
        // Add the result if it's the best one found so far, or if the user wants to see all matches.
        if (isBestYet || !onlyClosest) {
            // The result array now includes the new metrics for sorting and display.
            allRatios.push([aCount, bCount, aSum, bSum, diff, isBestYet, complexity, quality]);
        }
    }
  }

  return allRatios;
}