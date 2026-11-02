import { useEffect, useState } from "react";
import { Activity, LockKeyhole, Radio, Shield, Wifi, WifiOff } from "lucide-react";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export default function Header({ connected, telemetryState, role, onAuth }) {
  const now = useClock();
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="Friday Tactical HUD home">
        <span className="brand-mark"><Activity size={19} /></span>
        <span className="brand-name">F.R.I.D.A.Y.<small>TACTICAL INTERFACE</small></span>
      </a>
      <div className="topbar-center">
        <span className="topbar-label"><Radio size={14} /> SYSTEM LINK</span>
        <span className={`connection-pill ${connected ? "is-live" : ""}`}>
          <span className="status-dot" /> {connected ? "LIVE CHANNEL" : "STANDBY"}
        </span>
        <span className="topbar-divider" />
        <span className={`minor-link ${telemetryState === "connected" ? "online" : ""}`}>
          {telemetryState === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
          TELEMETRY
        </span>
      </div>
      <div className="topbar-right">
        <div className="role-chip"><Shield size={14} /><span>{role}</span></div>
        <div className="clock-block"><strong>{now.toLocaleTimeString("en-GB", { hour12: false })}</strong><small>LOCAL SYSTEM TIME</small></div>
        <button className="icon-button auth-trigger" onClick={onAuth} aria-label="Open authentication">
          <LockKeyhole size={17} />
        </button>
      </div>
    </header>
  );
}
