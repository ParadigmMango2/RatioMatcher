// Init document
const html = `
  <div id="ratio-matcher" class="ratio-matcher">
    <label>Ratio 1: <input id="ratio-1-input" type="number" step="any" min="0" value="3.14159265359" size="12"></label>
    <label>Ratio 2: <input id="ratio-2-input" type="number" step="any" min="0" value="1" size="12"></label>
    <label>Threshold: <input id="threshold" type="number" step="any" min="0" value="0.1" size="12"></label>
    <fieldset>
      <legend>Limit</legend>
      <label for="limit-type-input">Type: </label>
      <select name="limit-type-input" id="limit-type-input">
        <option value="sums">Sums</option>
        <option value="counts">Counts</option>
      </select>
      <label>Min: <input id="min-limit" type="number" step="any" min="0" value="0" size="7"></label>
      <label>Max: <input id="max-limit" type="number" step="any" min="0" value="100" size="7"></label>
    </fieldset><br>
    <button id="calculate">Calculate</button><br>
    <table id="calculations"></table>
  </div>
`;
document.currentScript.insertAdjacentHTML('afterend', html);
