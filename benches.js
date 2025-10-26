const gNumLimit = 1000000;
const gA = 3.14159265359;
// const gA = 1.414213562373095;
const gB = 1.0;

function matchRatios(numLimit, a, b) {
  var aSum = a;
  var bSum = b;
  var aCount = 1;
  var bCount = 1;
  var prevClosest = Math.abs(aSum - bSum);
  const closestRatios = [[aCount, bCount, prevClosest]];

  while (aSum < numLimit && bSum < numLimit) {
    // incriment sums
    if (aSum < bSum) {
      aSum += a;
      aCount++;
    } else {
      bSum += b;
      bCount++;
    }

    // Count new closest ratios
    const curClosest = Math.abs(aSum - bSum);
    if (curClosest < prevClosest) {
      prevClosest = curClosest;
      closestRatios.push([aCount, bCount, curClosest]);
    }
  }

  return closestRatios;
}

// console.log("Hi from deno");
// console.log(matchRatios(gNumLimit, gA, gB));

Deno.bench({
  name: "straightforward",
  baseline: true,
  fn: () => {
    matchRatios(gNumLimit, gA, gB);
  }
});
