// Init document
const html = `
  <div id="ratio-matcher" class="ratio-matcher">
    <h2 id="worker-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support web workers.</h1>
    <h2 id="blob-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support blobs.</h1>
    <h2 id="url-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support blob URLs.</h1>
    <label>Ratio A: <input id="ratio-a-input" type="number" step="any" min="0" value="3.14159265359" size="12"></label>
    <label>Ratio B: <input id="ratio-b-input" type="number" step="any" min="0" value="1" size="12"></label>
    <label>Threshold: <input id="threshold-input" type="number" step="any" min="0" value="0.1" size="12"></label>
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
    <button id="calculate" onclick="calculate();">Calculate</button><br>
    <table id="calculations"></table>
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
const limitType = document.getElementById("limit-type-select");
const minLimit = document.getElementById("min-limit");
const maxLimit = document.getElementById("max-limit");
const calculateBtn = document.getElementById("calculate");
const calculationsTable = document.getElementById("calculations");

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
  console.log(limitType.value);
  console.log(minLimit.value);
  console.log(maxLimit.value);

  // console.log(matchRatios(ratioA.value, ratioB.value, threshold.value, limitType.value, minLimit.value, maxLimit.value));
  // console.log(matchRatios.toString());

  // Create a worker script and register it as a blob with a url
  const workerScript = `
    self.onmessage = function(event) {
      const { a, b, threshold, limitType, min, max } = event.data;
      const results = ${matchRatios.name}(a, b, threshold, limitType, min, max);
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
    limitType: limitType.value,
    min: parseFloat(minLimit.value),
    max: parseFloat(maxLimit.value)
  });

  worker.onmessage = function(event) {
    const { results } = event.data;
    console.log(event.data);
    console.log(results);

    // Cleanup
    worker.terminate();
    URL.revokeObjectURL(workerURL);

    // Add data to table
    calculationsTable.innerHTML = "";

    const tableHead = document.createElement("thead");
    tableHead.innerHTML = `
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
    console.error("Worker Error:", error);

    // Cleanup after error
    worker.terminate();
    URL.revokeObjectURL(workerURL);
  }
}


// Main Algorithm
function matchRatios(a, b, threshold, limitType, min, max) {
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
        } else {
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
        } else {
          closestRatios.push([aCount, bCount, aSum, bSum, diff, "Not Closest Yet"]);
        }
      }
    }
  }

  return closestRatios;


}
