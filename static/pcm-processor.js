/* O navegador entrega áudio a 16 kHz; enviamos PCM mono de 16 bits à API. */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.stopped = false;
    this.port.onmessage = ({ data }) => {
      if (data === "stop") {
        this.stopped = true;
        this.flush();
        this.port.postMessage({ type: "flushed" });
      }
    };
  }

  flush() {
    if (!this.samples.length) return;
    const buffer = new ArrayBuffer(this.samples.length * 2);
    const view = new DataView(buffer);
    this.samples.forEach((sample, index) => {
      const value = Math.max(-1, Math.min(1, sample));
      view.setInt16(index * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
    });
    this.samples = [];
    this.port.postMessage({ type: "audio", buffer }, [buffer]);
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!this.stopped && channel) {
      for (const value of channel) this.samples.push(value);
      if (this.samples.length >= 4096) this.flush();
    }
    // A saída permanece silenciosa: a pessoa não ouve sua própria voz com atraso.
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
