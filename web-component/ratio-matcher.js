// constants
const DISPLAY_LIMIT = 10_000;
const FRACTION_DIGITS = 5;
const MAX_ITERATIONS = 100_000_000;


// web component
class RatioMatcher extends HTMLElement {
  static styles = `
    input,
    select,
    button {
      border: 1px solid #666666;
      border-radius: 2px;
    }

    input:invalid {
      background-color: #ff000055;
    }

    input[type='number'] {
      -moz-appearance:textfield;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }

    .dotted-underline {
      text-decoration-line: underline;
      text-decoration-style: dashed;
    }

    .warning {
      color: red;
    }

    .legend {
      display: flex;
    }

    .descriptor {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    #closest-yet-descriptor {
      margin-left: auto;
    }

    .legend p {
      margin-top: 0;
      margin-bottom: 0;
    }

    .gradient-border {
      display: inline-flex;
      border: 1px solid;
    }

    .square {
      width: 20px;
      height: 20px;
    }

    #calculations tr:not(.closestYet),
    .gradient-item {
      /* Calculate color based on closeness to 0 */
      --hue: 120deg;
      --lightness-value: calc(40% * var(--diff-ratio));
      background-color: light-dark(
        hsl(var(--hue), 50%, calc(60% + var(--lightness-value))),
        hsl(var(--hue), 50%, calc(40% - var(--lightness-value)))
      );
    }

    #calculations-scroll {
      max-height: 500px;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: auto;
      display: inline-block;
    }

    #calculations {
      /* Only way to have bordered sticky headers is through separate borders */
      border-collapse: separate;
      border-spacing: 0;

      td,
      th {
        border-bottom: 1px solid;
        border-right: 1px solid;
        padding: 5px;
      }

      th {
        /* sticky header */
        position: sticky;

        background-color: light-dark(white, black);

        border-top: 1px solid;
      }

      th.legend-header {
        font-weight: normal;

        border-bottom: 0;

        top: 0px;
      }

      th:not(.legend-header) {
        top: 33px;
      }

      td:first-child,
      th:first-child {
        border-left: 1px solid;
      }

      tr.bestYet {
        background-color: light-dark(#dcb145, #BA8E23);
        font-weight: 900;
      }
    }
  `;

  static rootHTML = `
    <div id="ratio-matcher" class="ratio-matcher">
      <h2>Ratio Matcher</h2>
      <h3 id="worker-warning" class="warning" hidden>ERROR: You cannot use this tool. Your browser does not support web workers.</h3>
      <details>
        <summary>Tool Explainer</summary>
        <p>This tool helps you find when two different numbers can be made approximately equal by multiplying each one by whole numbers (integers).</p>
        <p><strong>Example:</strong> If you have the number 3.14 (like π) and the number 1, this tool will find that 7 × 3.14 ≈ 22 × 1 (both equal about 22). It shows you all the combinations where multiplying number A by some count and number B by some count gives you results that are very close to each other.</p>
        <p><strong>Approximating irrational numbers:</strong> When one of your numbers is 1 and the other is an irrational number (like π, √2, or e), the counts in the output can be used to create a fraction that approximates that irrational number. For example, if you see "Count A: 7, Count B: 22" with Ratio A = π and Ratio B = 1, then 22/7 is an approximation of π.</p>
        <p>The tool can sort matches by simplicity (lowest complexity first) or by best match (lowest quality score first). Each match shows how close it is, and the "best yet" matches (highlighted in gold) are the closest matches found so far.</p>
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
      <p id="display-limit-warning" class="warning" hidden>Display limit reached! Showing the first ${DISPLAY_LIMIT.toLocaleString('en-US')} results.</p>
      <p id="iteration-limit-warning" class="warning" hidden>Iteration limit reached (${MAX_ITERATIONS.toLocaleString('en-US')})! Some matches may have been missed.</p>
      <div id="calculations-scroll">
        <table id="calculations"></table>
      </div>
      <h5>Developed by ParadigmMango, InfiniteQuery, and Joshua Langley</h5>
    </div>
  `;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.root.innerHTML = `<style>${RatioMatcher.styles}</style>${RatioMatcher.rootHTML}`;
  }
}
customElements.define('ratio-matcher', RatioMatcher);
const ratioMatcher = document.createElement("ratio-matcher");

document.currentScript.insertAdjacentElement("afterend", ratioMatcher);
