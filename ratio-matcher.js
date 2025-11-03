// Constants
const DISPLAY_LIMIT = 10_000;

// Init document
const html = `
  <div id="ratio-matcher" class="ratio-matcher">
    <h3 id="worker-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support web workers.</h1>
    <h3 id="blob-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support blobs.</h1>
    <h3 id="url-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support blob URLs.</h1>
    <label>Ratio A: <input id="ratio-a-input" type="number" step="any" min="0" value="3.14159265359" size="12"></label>
    <label>Ratio B: <input id="ratio-b-input" type="number" step="any" min="0" value="1" size="12"></label>
    <label>Threshold: <input id="threshold-input" type="number" step="any" min="0" value="0.1" size="12"></label>
    <input type="checkbox" id="only-closest-box" name="only-closest-box">
    <label for="only-closest-box"> Only closest yet matches</label>
    <fieldset>
      <legend>Limit</legend>
      <label for="limit-type-select">Type: </label>
      <select name="limit-type-select" id="limit-type-select">
        <option value="sums">Sums</option>
        <option value="counts">Counts</option>
      </select>
      <label>Min: <input id="min-limit" type="number" step="any" min="0" max="1000000" value="0" size="7"></label>
      <label>Max: <input id="max-limit" type="number" step="any" min="0" max="1000000" value="100" size="7"></label>
    </fieldset><br>
    <button id="calculate" onclick="calculate();">Calculate</button>
    <p id="status"></p><br>
    <p id="display-limit-warning" class="warning" hidden>Max display limit reached! Limiting results to ${DISPLAY_LIMIT.toLocaleString('en-US')} entries.</p>
    <div id="calculations-scroll">
      <table id="calculations"></table>
    </div>
  </div>
`;
document.currentScript.insertAdjacentHTML("afterend", html);

// Document objects
const tool = document.getElementById("ratio-matcher");
const workerWarning = document.getElementById("worker-warning");
const blobWarning = document.getElementById("blob-warning");
const urlWarning = document.getElementById("url-warning");
const ratioA = document.getElementById("ratio-a-input");
const ratioB = document.getElementById("ratio-b-input");
const threshold = document.getElementById("threshold-input");
const onlyClosestBox = document.getElementById("only-closest-box");
const limitType = document.getElementById("limit-type-select");
const minLimit = document.getElementById("min-limit");
const maxLimit = document.getElementById("max-limit");
const calculateBtn = document.getElementById("calculate");
const displayLimitWarning = document.getElementById("display-limit-warning");
const calculationsTable = document.getElementById("calculations");
const status = document.getElementById("status");

// Unhide warnings if eligible
if (!window.Worker) workerWarning.removeAttribute("hidden");
if (!window.Blob) blobWarning.removeAttribute("hidden");
if (!window.URL) urlWarning.removeAttribute("hidden");


// Button function
function calculate() {
  console.log("calc called");
  console.log(ratioA.value);
  console.log(ratioB.value);
  console.log(threshold.value);
  console.log(onlyClosestBox.checked);
  console.log(limitType.value);
  console.log(minLimit.value);
  console.log(maxLimit.value);

  displayLimitWarning.hidden = true;

  // console.log(matchRatios(ratioA.value, ratioB.value, threshold.value, limitType.value, minLimit.value, maxLimit.value));
  // console.log(matchRatios.toString());

  // Create a worker script and register it as a blob with a url
  const workerScript = `
    self.onmessage = function(event) {
      const { a, b, threshold, onlyClosest, limitType, min, max } = event.data;
      const results = ${matchRatios.name}(a, b, threshold, onlyClosest, limitType, min, max);
      self.postMessage({ results });
    };

    ${matchRatios.toString()}
  `;
  const blob = new Blob([workerScript], { type: "application/javascript" });
  const workerURL = URL.createObjectURL(blob);

  console.log(workerURL);

  const worker = new Worker(workerURL);

  worker.postMessage({
    a: parseFloat(ratioA.value),
    b: parseFloat(ratioB.value),
    threshold: parseFloat(threshold.value),
    onlyClosest: onlyClosestBox.checked,
    limitType: limitType.value,
    min: parseFloat(minLimit.value),
    max: parseFloat(maxLimit.value)
  });
  status.textContent = "Rendering...";
  calculationsTable.innerHTML = "";

  worker.onmessage = function(event) {
    var { results } = event.data;
    console.log(event.data);
    console.log(results);

    // Cleanup
    worker.terminate();
    URL.revokeObjectURL(workerURL);

    status.textContent = "";

    // Add data to table
    const tableHead = document.createElement("thead");
    tableHead.innerHTML = `
      <tr>
        <th colspan="5" class="legend-header">
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
              <p>Closest yet</p>
              <div class="gradient-border">
                <div class="square" style="background-color: #BA8E23;"></div>
              </div>
            </div>
          </div>
        </th>
      </tr>
      <tr>
        <th>Count of A</th>
        <th>Count of B</th>
        <th>Sum of A</th>
        <th>Sum of B</th>
        <th>Difference</th>
      </tr>
    `;
    calculationsTable.appendChild(tableHead);

    const tableBody = document.createElement("tbody");
    calculationsTable.appendChild(tableBody);

    if (results.length > DISPLAY_LIMIT) {
      results = results.slice(0, DISPLAY_LIMIT);
      displayLimitWarning.hidden = false;
    }

    for (const closestRatio of results) {
      const [ countA, countB, sumA, sumB, difference, closestYet ] = closestRatio;

      const tableRow = document.createElement("tr");
      tableRow.innerHTML = `
        <td>${countA}</td>
        <td>${countB}</td>
        <td>${sumA}</td>
        <td>${sumB}</td>
        <td>${difference}</td>
      `
      if (closestYet === "Closest Yet") {
        tableRow.className = "closestYet";
      } else {
        const diffRatio = difference / threshold.value;
        const lightnessValue = 40 - diffRatio * 40;
        tableRow.style.setProperty('--lightness-value', `${lightnessValue}%`);
      }

      tableBody.appendChild(tableRow);
    }
  }

  worker.onerror = function(event) {
    status.textContent = "Error! Check console for details.";
    console.error("Worker Error:", error);

    // Cleanup after error
    worker.terminate();
    URL.revokeObjectURL(workerURL);
  }
}


// Main Algorithm
function matchRatios(a, b, threshold, onlyClosest, limitType, min, max) {
  var aCount = (limitType == "sums") ? Math.floor(min / a) : min;
  var bCount = (limitType == "sums") ? Math.floor(min / b) : min;
  var aSum = a * aCount;
  var bSum = b * bCount;
  var diff = Math.abs(aSum - bSum);
  var minDiff;
  const closestRatios = [];

  if (diff < threshold && aCount != 0 && bCount != 0) {
    minDiff = diff;
    closestRatios.push([aCount, bCount, aSum, bSum, diff, "Closest Yet"]);
  } else {
    minDiff = threshold;
  }

  if (limitType == "sums") { // sums loop
    while (aSum < max && bSum < max) {
      // incriment sums
      if (aSum < bSum) {
        aSum += a;
        aCount++;
      } else {
        bSum += b;
        bCount++;
      }

      // Count new closest ratios
      diff = Math.abs(aSum - bSum);
      if (diff < threshold) {
        if (diff <= minDiff) {
          minDiff = diff;
          closestRatios.push([aCount, bCount, aSum, bSum, diff, "Closest Yet"]);
        } else if (!onlyClosest) {
          closestRatios.push([aCount, bCount, aSum, bSum, diff, "Not Closest Yet"]);
        }
      }
    }
  } else { // sums loop
    while (aCount < max && bCount < max) {
      // incriment sums
      if (aSum < bSum) {
        aSum += a;
        aCount++;
      } else {
        bSum += b;
        bCount++;
      }

      // Count new closest ratios
      diff = Math.abs(aSum - bSum);
      if (diff <= threshold) {
        if (diff < minDiff) {
          minDiff = diff;
          closestRatios.push([aCount, bCount, aSum, bSum, diff, "Closest Yet"]);
        } else if (!onlyClosest) {
          closestRatios.push([aCount, bCount, aSum, bSum, diff, "Not Closest Yet"]);
        }
      }
    }
  }

  return closestRatios;


}
