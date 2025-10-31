// Init document
const html = `
  <div id="ratio-matcher" class="ratio-matcher">
    <h2 id="worker-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support web workers.</h1>
    <h2 id="blob-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support blobs.</h1>
    <h2 id="url-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support blob URLs.</h1>
    <label>Ratio 1: <input id="ratio-1-input" type="number" step="any" min="0" value="3.14159265359" size="12"></label>
    <label>Ratio 2: <input id="ratio-2-input" type="number" step="any" min="0" value="1" size="12"></label>
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
const ratio1 = document.getElementById("ratio-1-input");
const ratio2 = document.getElementById("ratio-2-input");
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
  console.log(ratio1.value);
  console.log(ratio2.value);
  console.log(threshold.value);
  console.log(limitType.value);
  console.log(minLimit.value);
  console.log(maxLimit.value);

  // console.log(matchRatios(ratio1.value, ratio2.value, threshold.value, limitType.value, minLimit.value, maxLimit.value));
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
    a: parseFloat(ratio1.value),
    b: parseFloat(ratio2.value),
    threshold: parseFloat(threshold.value),
    limitType: limitType.value,
    min: parseFloat(minLimit.value),
    max: parseFloat(maxLimit.value)
  });

  worker.onmessage = function(event) {
    const { results } = event.data;
    console.log(event.data);
    console.log(results);

    worker.terminate();
    URL.revokeObjectURL(workerURL);
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
