const WS_BASE = (import.meta.env.VITE_WS_BASE_URL || "ws://127.0.0.1:8000").replace(/\/+$/, "");

function authenticatedUrl(path, token) {
  const url = new URL(`${WS_BASE}${path}`);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

function downsampleTo16k(float32, sourceRate) {
  if (sourceRate === 16000) return float32;
  const ratio = sourceRate / 16000;
  const length = Math.floor(float32.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), float32.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += float32[j];
    result[i] = sum / Math.max(1, end - start);
  }
  return result;
}

function toPcm16(float32) {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
}

export class FridaySockets {
  constructor(auth, callbacks = {}) {
    this.auth = auth;
    this.callbacks = callbacks;
    this.live = null;
    this.telemetry = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.processor = null;
    this.silentOutput = null;
    this.playbackAt = 0;
    this.micEnabled = false;
  }

  connectTelemetry() {
    if (this.telemetry?.readyState === WebSocket.OPEN) return;
    const socket = new WebSocket(authenticatedUrl("/ws/telemetry", this.auth.token));
    this.telemetry = socket;
    socket.onopen = () => this.callbacks.onTelemetryState?.("connected");
    socket.onclose = () => this.callbacks.onTelemetryState?.("disconnected");
    socket.onerror = () => this.callbacks.onTelemetryState?.("error");
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.callbacks.onTelemetryEvent?.(message);
      } catch {
        this.callbacks.onTelemetryEvent?.({ type: "malformed" });
      }
    };
  }

  connectLive(client = "web") {
    return new Promise((resolve, reject) => {
      const url = authenticatedUrl("/ws/live", this.auth.token);
      const parsedUrl = new URL(url);
      const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
      if (this.auth.masterPassphrase && parsedUrl.protocol !== "wss:" && !localHost) {
        reject(new Error("Master-authorized voice tools require a secure WSS connection."));
        return;
      }
      const socket = new WebSocket(url);
      socket.binaryType = "arraybuffer";
      this.live = socket;
      const timeout = window.setTimeout(() => {
        socket.close();
        reject(new Error("Live voice connection timed out."));
      }, 12000);
      socket.onopen = () => {
        socket.send(JSON.stringify({
          client,
          sample_rate: 16000,
          channels: 1,
          format: "s16le",
          ...(this.auth.speakerToken ? { speaker_token: this.auth.speakerToken } : {}),
          ...(this.auth.masterPassphrase ? { master_passphrase: this.auth.masterPassphrase } : {}),
        }));
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") {
          this.playPcm(event.data);
          return;
        }
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "ready") {
          window.clearTimeout(timeout);
          this.callbacks.onLiveState?.("connected");
          resolve(message);
        } else {
          this.callbacks.onLiveEvent?.(message);
        }
      };
      socket.onerror = () => {
        window.clearTimeout(timeout);
        this.callbacks.onLiveState?.("error");
        reject(new Error("Could not connect to the live voice service."));
      };
      socket.onclose = () => {
        window.clearTimeout(timeout);
        this.stopMicrophone();
        this.callbacks.onLiveState?.("disconnected");
        reject(new Error("Live voice connection was closed before setup completed."));
      };
    });
  }

  async startMicrophone() {
    if (!this.live || this.live.readyState !== WebSocket.OPEN) {
      throw new Error("Connect to live voice before enabling the microphone.");
    }
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } });
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.silentOutput = this.audioContext.createGain();
    this.silentOutput.gain.value = 0;
    this.processor.onaudioprocess = (event) => {
      if (!this.micEnabled || this.live?.readyState !== WebSocket.OPEN) return;
      const samples = downsampleTo16k(
        event.inputBuffer.getChannelData(0),
        this.audioContext.sampleRate,
      );
      const pcm = toPcm16(samples);
      if (pcm.byteLength) this.live.send(pcm.buffer);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 8) sum += samples[i] * samples[i];
      this.callbacks.onInputLevel?.(Math.sqrt(sum / Math.max(1, Math.ceil(samples.length / 8))));
    };
    source.connect(this.processor);
    this.processor.connect(this.silentOutput);
    this.silentOutput.connect(this.audioContext.destination);
    this.micEnabled = true;
    this.callbacks.onListening?.(true);
  }

  stopMicrophone() {
    this.micEnabled = false;
    if (this.live?.readyState === WebSocket.OPEN) {
      this.live.send(JSON.stringify({ type: "audio_end" }));
    }
    this.callbacks.onListening?.(false);
    this.processor?.disconnect();
    this.processor = null;
    this.silentOutput?.disconnect();
    this.silentOutput = null;
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close();
    }
    this.audioContext = null;
  }

  sendText(text) {
    if (this.live?.readyState !== WebSocket.OPEN) throw new Error("Live voice is not connected.");
    this.live.send(JSON.stringify({ type: "text", text }));
  }

  playPcm(buffer) {
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContext();
    }
    const samples = new Int16Array(buffer);
    const audio = this.audioContext.createBuffer(1, samples.length, 24000);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i] / 32768;
    const source = this.audioContext.createBufferSource();
    source.buffer = audio;
    source.connect(this.audioContext.destination);
    const now = this.audioContext.currentTime;
    this.playbackAt = Math.max(now, this.playbackAt);
    source.start(this.playbackAt);
    this.playbackAt += audio.duration;
    this.callbacks.onSpeaking?.(true);
    source.onended = () => {
      if (this.audioContext?.currentTime >= this.playbackAt - 0.03) {
        this.callbacks.onSpeaking?.(false);
      }
    };
  }

  close() {
    this.stopMicrophone();
    this.live?.close();
    this.telemetry?.close();
    this.callbacks.onLiveState?.("disconnected");
  }
}
