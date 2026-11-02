import { useState } from "react";
import { Battery, Cpu, Gauge, Lightbulb, MemoryStick, Radio, Thermometer, Wind } from "lucide-react";

function Meter({ label, value, icon: Icon, detail }) {
  const known = typeof value === "number" && Number.isFinite(value);
  const bounded = known ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="meter-card">
      <div className="meter-arc" style={{ "--meter-value": `${bounded * 3.6}deg` }}>
        <span><Icon size={16} /></span>
        <b>{known ? `${Math.round(value)}%` : "--"}</b>
      </div>
      <div className="meter-label">{label}<small>{detail || (known ? "LIVE TELEMETRY" : "SOURCE OFFLINE")}</small></div>
    </div>
  );
}

export default function TelemetryPanel({ auth, robotics, api, notify }) {
  const [busy, setBusy] = useState("");
  const [switches, setSwitches] = useState({});

  const twinDevice = robotics?.digital_twin?.devices?.find((device) => device.domain === "robotics");
  const state = twinDevice?.state || {};
  const current = Number.isFinite(state.current_a) ? `${state.current_a.toFixed(2)} A` : "--";
  const distance = Number.isFinite(state.distance_cm) ? `${state.distance_cm.toFixed(0)} CM` : "--";

  async function toggle(label) {
    const enabled = switches[label] !== false;
    setBusy(label);
    try {
      const result = await api.chat(auth, `${enabled ? "Turn on" : "Turn off"} ${label}.`);
      setSwitches((current) => ({ ...current, [label]: enabled }));
      notify(result.response || "Request submitted to F.R.I.D.A.Y.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="panel telemetry-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">HARDWARE DIAGNOSTICS</span><h2>TELEMETRY</h2></div>
        <span className="panel-icon"><Gauge size={17} /></span>
      </div>
      <div className="meter-grid">
        <Meter label="CPU LOAD" value={null} icon={Cpu} detail="HOST DATA UNAVAILABLE" />
        <Meter label="MEMORY" value={null} icon={MemoryStick} detail="HOST DATA UNAVAILABLE" />
        <Meter label="BATTERY" value={null} icon={Battery} detail="HOST DATA UNAVAILABLE" />
        <Meter label="THERMAL" value={null} icon={Thermometer} detail="HOST DATA UNAVAILABLE" />
      </div>
      <div className="telemetry-divider"><span>CONNECTED HARDWARE</span><i /></div>
      <div className="hardware-row">
        <span className={`hardware-icon ${twinDevice?.telemetry_fresh ? "active" : ""}`}><Radio size={16} /></span>
        <span className="hardware-description"><b>{twinDevice?.device_id || "NO ROBOTIC DEVICE"}</b><small>{twinDevice ? `${distance} CLEARANCE · ${current} CURRENT` : "REGISTER A VEHICLE IN THE BACKEND"}</small></span>
        <span className={`hardware-status ${twinDevice?.telemetry_fresh ? "online" : ""}`}>{twinDevice?.telemetry_fresh ? "ONLINE" : "OFFLINE"}</span>
      </div>
      <div className="switch-section">
        <div className="switch-title"><span>SMART ENVIRONMENT</span><small>BACKEND CONFIRMATION REQUIRED</small></div>
        <button className="switch-row" onClick={() => toggle("Living Room Light")} disabled={Boolean(busy)}>
          <span className="switch-icon"><Lightbulb size={15} /></span><span>Living Room Light<small>{Object.hasOwn(switches, "Living Room Light") ? `LAST REQUEST: ${switches["Living Room Light"] ? "ON" : "OFF"}` : "SMART SWITCH · STATE UNKNOWN"}</small></span><span className={`switch-track ${switches["Living Room Light"] === true ? "on" : ""} ${busy === "Living Room Light" ? "pending" : ""}`}><i /></span>
        </button>
        <button className="switch-row" onClick={() => toggle("Fan")} disabled={Boolean(busy)}>
          <span className="switch-icon"><Wind size={15} /></span><span>Ventilation Fan<small>{Object.hasOwn(switches, "Fan") ? `LAST REQUEST: ${switches.Fan ? "ON" : "OFF"}` : "SMART SWITCH · STATE UNKNOWN"}</small></span><span className={`switch-track ${switches.Fan === true ? "on" : ""} ${busy === "Fan" ? "pending" : ""}`}><i /></span>
        </button>
      </div>
      <div className="telemetry-footnote">CPU, RAM, battery and switch states are not supplied by current backend telemetry.</div>
    </section>
  );
}
