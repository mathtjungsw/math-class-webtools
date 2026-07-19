(function (root, factory) {
  const math = typeof module === "object" && module.exports ? require("./math.js") : root.RhythmMath;
  const api = factory(math);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RhythmAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (RhythmMath) {
  "use strict";

  class AudioClockSequencer {
    constructor(onVisualEvent) {
      this.context = null;
      this.master = null;
      this.layers = [];
      this.bpm = 84;
      this.revolutionBeats = 4;
      this.playing = false;
      this.muted = false;
      this.volume = 0.65;
      this.anchorTime = 0;
      this.anchorPosition = 0;
      this.pausedPosition = 0;
      this.timer = null;
      this.scheduledUntil = 0;
      this.scheduledIds = new Set();
      this.visualQueue = [];
      this.sources = [];
      this.onVisualEvent = onVisualEvent || function () {};
      this.tickBound = () => this.tick();
    }

    get revolutionDuration() {
      return (60 / this.bpm) * this.revolutionBeats;
    }

    async ensureAudio() {
      if (!this.context) {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContextClass) throw new Error("이 브라우저는 Web Audio를 지원하지 않습니다.");
        this.context = new AudioContextClass({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.updateMaster();
      }
      if (this.context.state === "suspended") await this.context.resume();
      return this.context;
    }

    updateMaster() {
      if (this.master) this.master.gain.setValueAtTime(this.muted ? 0 : this.volume, this.context.currentTime);
    }

    setLayers(layers) { this.layers = layers; }
    setVolume(value) { this.volume = Math.max(0, Math.min(1, Number(value))); this.updateMaster(); }
    setMuted(value) { this.muted = Boolean(value); this.updateMaster(); }

    currentPosition(atTime) {
      if (!this.playing || !this.context) return this.pausedPosition;
      return this.anchorPosition + ((atTime == null ? this.context.currentTime : atTime) - this.anchorTime) / this.revolutionDuration;
    }

    setBpm(value) {
      const next = Math.max(30, Math.min(240, Number(value) || 84));
      if (this.playing && this.context) {
        const position = this.currentPosition();
        this.bpm = next;
        this.resync(position);
      } else this.bpm = next;
    }

    async play(position) {
      await this.ensureAudio();
      const startPosition = Number.isFinite(position) ? position : this.pausedPosition;
      this.playing = true;
      this.anchorPosition = startPosition;
      this.pausedPosition = startPosition;
      this.anchorTime = this.context.currentTime;
      this.scheduledUntil = this.anchorTime;
      this.scheduledIds.clear();
      this.visualQueue.length = 0;
      const startFraction = RhythmMath.mod(startPosition, 1);
      const immediate = [];
      this.layers.forEach((layer, layerIndex) => {
        if (layer.enabled === false) return;
        RhythmMath.hitFractions(layer, true).forEach((hit) => {
          const distance = Math.abs(RhythmMath.mod(hit.fraction - startFraction + 0.5, 1) - 0.5);
          if (distance < RhythmMath.EPSILON) {
            const immediateTime = this.anchorTime + 0.02;
            const event = { id: `start:${layer.id}:${hit.step}`, layerIndex, layerId: layer.id, step: hit.step, accent: hit.accent, position: startPosition, fraction: hit.fraction, when: immediateTime };
            this.trigger(layer, immediateTime, hit.accent);
            immediate.push(event);
          }
        });
      });
      this.visualQueue.push(...immediate);
      clearInterval(this.timer);
      this.timer = setInterval(this.tickBound, 25);
      this.tick();
    }

    pause() {
      if (!this.playing) return this.pausedPosition;
      this.pausedPosition = this.currentPosition();
      this.playing = false;
      clearInterval(this.timer);
      this.timer = null;
      this.cancelScheduled();
      this.visualQueue.length = 0;
      return this.pausedPosition;
    }

    stop() {
      this.pause();
      this.pausedPosition = 0;
      this.anchorPosition = 0;
      this.scheduledIds.clear();
    }

    resync(position) {
      if (!this.context || !this.playing) return;
      this.cancelScheduled();
      this.anchorPosition = Number.isFinite(position) ? position : this.currentPosition();
      this.anchorTime = this.context.currentTime;
      this.scheduledUntil = this.anchorTime;
      this.scheduledIds.clear();
      this.visualQueue.length = 0;
      this.tick();
    }

    positionAtTime(time) {
      return this.anchorPosition + (time - this.anchorTime) / this.revolutionDuration;
    }

    timeAtPosition(position) {
      return this.anchorTime + (position - this.anchorPosition) * this.revolutionDuration;
    }

    tick() {
      if (!this.playing || !this.context) return;
      const now = this.context.currentTime;
      this.sources = this.sources.filter((item) => item.end > now);
      const endTime = now + 0.12;
      const startTime = Math.max(this.scheduledUntil, now + 0.008);
      if (endTime <= startTime) return;
      const startPosition = this.positionAtTime(startTime);
      const endPosition = this.positionAtTime(endTime);
      const events = RhythmMath.scheduleBetween(this.layers, startPosition, endPosition, true);
      for (const event of events) {
        if (this.scheduledIds.has(event.id)) continue;
        const when = this.timeAtPosition(event.position);
        const layer = this.layers[event.layerIndex];
        this.trigger(layer, when, event.accent);
        this.scheduledIds.add(event.id);
        this.visualQueue.push({ ...event, when });
      }
      this.scheduledUntil = endTime;
      if (this.scheduledIds.size > 4096) this.scheduledIds.clear();
    }

    consumeVisualEvents() {
      if (!this.context) return;
      const now = this.context.currentTime;
      const ready = [];
      while (this.visualQueue.length && this.visualQueue[0].when <= now + 0.012) ready.push(this.visualQueue.shift());
      if (ready.length) {
        const grouped = RhythmMath.groupCoincidences(ready, 1e-7);
        grouped.forEach((group) => this.onVisualEvent(group));
      }
    }

    cancelScheduled() {
      if (!this.context) return;
      const now = this.context.currentTime;
      this.sources.forEach((item) => {
        try { item.source.stop(now + 0.001); } catch { /* 이미 종료된 소스 */ }
      });
      this.sources.length = 0;
    }

    trigger(layer, when, accent) {
      if (!this.context || !this.master || !layer) return;
      const gain = this.context.createGain();
      const layerVolume = (Number(layer.volume) || 0) * (accent ? 1.25 : 1);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, layerVolume), when + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
      gain.connect(this.master);

      const type = layer.timbre || "wood";
      if (type === "noise" || type === "clap") {
        const length = Math.ceil(this.context.sampleRate * 0.12);
        const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, type === "clap" ? 2 : 5);
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        filter.type = type === "clap" ? "bandpass" : "highpass";
        filter.frequency.value = type === "clap" ? 1500 : 4200;
        source.buffer = buffer;
        source.connect(filter).connect(gain);
        source.start(when);
        source.stop(when + 0.13);
        this.sources.push({ source, end: when + 0.13 });
      } else {
        const oscillator = this.context.createOscillator();
        const frequencies = { wood: 520, bell: 880, kick: 110, click: 1300 };
        oscillator.type = type === "bell" ? "sine" : type === "kick" ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequencies[type] || 520, when);
        if (type === "kick") oscillator.frequency.exponentialRampToValueAtTime(48, when + 0.12);
        oscillator.connect(gain);
        oscillator.start(when);
        oscillator.stop(when + 0.2);
        this.sources.push({ source: oscillator, end: when + 0.2 });
      }
    }

    preview(layer, accent) {
      return this.ensureAudio().then(() => this.trigger(layer, this.context.currentTime + 0.02, accent));
    }
  }

  return { AudioClockSequencer };
});
