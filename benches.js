const gNumLimit = 1000000;

function matchRatios(a, b, min, max, threshold) {
  var aCount = min;
  var bCount = min;
  var aSum = a * aCount;
  var bSum = b * bCount;
  var diff = Math.abs(aSum - bSum);
  var minDiff;
  const closestRatios = [];
  if (diff < threshold) {
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
    if (diff < threshold) {
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

// console.log("Hi from deno");
// console.log(matchRatios(Math.PI, 1, 1, 1000, 0.1));

Deno.bench({
  name: "straightforward",
  baseline: true,
  fn: () => {
    matchRatios(Math.PI, 1, 1, gNumLimit, 0.1);
  }
});
