function matchRatiosCountLimits(a, b, min, max, threshold) {
  var aCount = min;
  var bCount = min;
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

  return closestRatios;
}


function matchRatiosSumLimits(a, b, min, max, threshold) {
  var aCount = Math.floor(min / a);
  var bCount = Math.floor(min / b);
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
    if (diff <= threshold) {
      if (diff < minDiff) {
        minDiff = diff;
        closestRatios.push([aCount, bCount, aSum, bSum, diff, "Closest Yet"]);
      } else {
        closestRatios.push([aCount, bCount, aSum, bSum, diff, "Not Closest Yet"]);
      }
    }
  }

  return closestRatios;
}


function matchRatios(a, b, min, max, threshold, limitType) {
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

  if (limitType == "sums") {
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
  } else {
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


console.log(matchRatiosCountLimits(Math.PI, 1, 1, 1000, 0.1));
console.log(matchRatios(Math.PI, 1, 1, 1000, 0.1, "counts"));
console.log(matchRatiosSumLimits(Math.PI, 1, 1, 1000, 0.1));
console.log(matchRatios(Math.PI, 1, 1, 1000, 0.1, "sums"));

// Deno.bench({
  // name: "straightforward",
  // baseline: true,
  // fn: () => {
    // matchRatios(Math.PI, 1, 1, gNumLimit, 0.1);
  // }
// });
