import { Mic, MicOff, Radio, Volume2 } from "lucide-react";

export default function HoloCore({
  state,
  level = 0,
  onConnect,
  onMic,
  connected,
  busy,
}) {
  const intensity = Math.min(1, Math.max(0, level * 8));
  return (
    <section className={`panel holo-panel state-${state.toLowerCase()}`}>
      <div className="panel-heading">
        <div><span className="eyebrow">VOICE INTERFACE</span><h2>HOLO CORE</h2></div>
        <span className="live-tag"><i /> {state}</span>
      </div>
      <div className="core-stage">
        <div className="core-orbit orbit-one" />
        <div className="core-orbit orbit-two" />
        <div className="core-orbit orbit-three" />
        <div className="core-halo" style={{ "--level": intensity }} />
        <div className="core-disc">
          <div className="core-inner"><span>F</span><b>R</b></div>
        </div>
        <div className="core-crosshair crosshair-x" />
        <div className="core-crosshair crosshair-y" />
        <span className="core-coordinate coord-one">07° 18′ 06.4″ N</span>
        <span className="core-coordinate coord-two">79° 51′ 12.8″ E</span>
        <div className="core-scanline" />
      </div>
      <div className="core-caption">
        <span className="core-status-dot" />
        {state === "LISTENING" ? "LISTENING FOR YOUR VOICE" : state === "SPEAKING" ? "GENERATING VOICE RESPONSE" : connected ? "VOICE CHANNEL READY" : "AWAITING SECURE LINK"}
      </div>
      <div className="core-controls">
        <button className={`primary-button ${connected ? "button-quiet" : ""}`} onClick={connected ? onMic : onConnect} disabled={busy}>
          {connected
            ? state === "LISTENING"
              ? <><MicOff size={16} /> {busy ? "CONNECTING..." : "STOP LISTENING"}</>
              : <><Mic size={16} /> {busy ? "CONNECTING..." : "ENABLE MICROPHONE"}</>
            : <><Radio size={16} /> CONNECT LIVE VOICE</>}
        </button>
        {state === "SPEAKING" && <span className="speaking-indicator"><Volume2 size={14} /> AUDIO OUTPUT</span>}
      </div>
      <div className="core-footer"><span>MODEL <b>GEMINI LIVE</b></span><span>VOICE <b>AOEDE</b></span><span>INPUT <b>16 KHZ PCM</b></span></div>
    </section>
  );
}
