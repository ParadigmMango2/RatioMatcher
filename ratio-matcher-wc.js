class RatioMatcher extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style></style>
      <slot></slot>
    `;
  }
}
customElements.define('ratio-matcher', RatioMatcher);
const ratioMatcher = document.createElement("ratio-matcher");

document.currentScript.insertAdjacentElement("afterend", ratioMatcher);
