/* Estado independente do DOM: revisões acumuladas nunca viram frases duplicadas. */
(function (root) {
  class Transcript {
    constructor() { this.paragraphs = []; this.before = []; this.current = ""; }
    begin() { this.before = [...this.paragraphs]; this.current = ""; }
    update(text) {
      this.current = text.trim();
      this.paragraphs = [...this.before, ...(this.current ? [this.current] : [])];
    }
    replace(text) {
      this.paragraphs = text.trim() ? text.trim().split(/\n\s*\n/) : [];
      this.before = [...this.paragraphs]; this.current = "";
    }
    text() { return this.paragraphs.join("\n\n"); }
    clear() { this.replace(""); }
  }
  if (typeof module !== "undefined") module.exports = Transcript;
  else root.Transcript = Transcript;
})(globalThis);
