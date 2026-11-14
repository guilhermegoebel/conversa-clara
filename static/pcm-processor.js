/* Reamostragem contínua: a captura usa a taxa nativa, mas a API recebe 16 kHz. */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.ratio = sampleRate / 16000;
    this.weight = 0;
    this.sum = 0;
    this.stopped = false;
    this.port.onmessage = ({ data }) => {
      if (data === "stop") {
        this.stopped = true;
        if (this.weight > 1e-9) this.samples.push(this.sum / this.weight);
        this.weight = 0; this.sum = 0;
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
      // A média ponderada mantém a fase entre blocos, inclusive em 44,1 kHz.
      for (const value of channel) {
        let remaining = 1;
        while (remaining > 1e-9) {
          const take = Math.min(remaining, this.ratio - this.weight);
          this.sum += value * take; this.weight += take; remaining -= take;
          if (this.weight >= this.ratio - 1e-9) {
            this.samples.push(this.sum / this.ratio);
            this.weight = 0; this.sum = 0;
            if (this.samples.length >= 4096) this.flush();
          }
        }
      }
    }
    // Não há retorno sonoro do microfone para os alto-falantes.
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
