import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Clock3, Radar, ShieldAlert } from "lucide-react";

function formatTime(value) {
  if (!value) return "--:--:--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(11, 19) : date.toLocaleTimeString("en-GB", { hour12: false });
}

export default function CyberDefenseRadar({ auth, authorized, api }) {
  const [threats, setThreats] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!authorized) {
        setThreats(null);
        setIncidents(null);
        setError("");
        return;
      }
      try {
        const [threatData, incidentData] = await Promise.all([
          api.activeThreats(auth),
          api.incidents(auth),
        ]);
        if (active) {
          setThreats(threatData);
          setIncidents(incidentData);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [api, auth, authorized]);

  const activeItems = Array.isArray(threats?.recent_threats)
    ? threats.recent_threats
    : Array.isArray(threats?.indicators) ? threats.indicators : [];
  const temporaryActions = Array.isArray(threats?.temporary_actions)
    ? threats.temporary_actions
    : [];
  const incidentItems = Array.isArray(incidents?.incidents) ? incidents.incidents : [];

  return (
    <section className="panel defense-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">THREAT MATRIX</span><h2>CYBER DEFENSE</h2></div>
        <span className="panel-icon"><Radar size={17} /></span>
      </div>
      <div className="radar-content">
        <div className="radar-visual">
          <div className="radar-ring ring-a" /><div className="radar-ring ring-b" /><div className="radar-ring ring-c" />
          <div className="radar-sweep" /><span className="radar-center"><ShieldAlert size={18} /></span>
          <i className="blip blip-a" /><i className="blip blip-b" /><i className="blip blip-c" />
        </div>
        <div className="threat-summary">
          <span className="eyebrow">ACTIVE INDICATORS</span>
          <strong>{authorized ? activeItems.length.toString().padStart(2, "0") : "—"}</strong>
          <small>{authorized ? "MONITORING" : "MASTER AUTH REQUIRED"}</small>
        </div>
      </div>
      {error && <div className="inline-error">{error}</div>}
      {!authorized ? (
        <div className="locked-message"><span className="lock-glyph">⌑</span><span>VERIFIED MASTER SESSION REQUIRED<small>Select Connect and provide Master verification to read incident data.</small></span></div>
      ) : (
        <>
          <div className="list-heading"><span><Activity size={13} /> ACTIVE SIGNALS</span><span>LIVE</span></div>
          <div className="threat-list">
            {(activeItems.length ? activeItems.slice(-3).reverse() : [{ category: "NO ACTIVE THREATS", severity: "NOMINAL", score: 0 }]).map((item, index) => (
              <div className="threat-row" key={`${item.indicator || item.category}-${index}`}>
                <span className={`severity-mark ${(item.severity || item.level || "low").toLowerCase()}`} />
                <span className="threat-name">{item.category || item.indicator || item.action || "SECURITY EVENT"}<small>{item.target_asset || item.asset_id || "SYSTEM WIDE"}</small></span>
                <span className="threat-score">{Number.isFinite(item.score ?? item.threat_score) ? Number(item.score ?? item.threat_score).toFixed(2) : (item.severity || "CLEAR").toUpperCase()}</span>
              </div>
            ))}
          </div>
          {temporaryActions.length > 0 && (
            <>
              <div className="list-heading"><span><ShieldAlert size={13} /> SAFE_AUTO MITIGATIONS</span><span>{temporaryActions.length} ACTIVE</span></div>
              <div className="threat-list">
                {temporaryActions.slice(0, 2).map((item) => (
                  <div className="threat-row" key={item.action_id}>
                    <span className="severity-mark" />
                    <span className="threat-name">{item.action || "MITIGATION"}<small>{item.target_asset || "AUTHORIZED ASSET"}</small></span>
                    <span className="threat-score">{item.rollback_status || "ACTIVE"}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="list-heading incident-heading"><span><Clock3 size={13} /> INCIDENT LEDGER</span><span>{incidentItems.length} RECORDS</span></div>
          <div className="incident-list">
            {(incidentItems.length ? incidentItems.slice(-3).reverse() : [{ incident_id: "ledger-empty", category: "No recent incidents", timestamp_utc: null }]).map((item, index) => (
              <div className="incident-row" key={item.incident_id || index}>
                <span className="incident-time">{formatTime(item.timestamp_utc || item.timestamp)}</span>
                <span>{item.category || item.event || "SECURITY EVENT"}</span>
                <ArrowUpRight size={12} />
              </div>
            ))}
          </div>
        </>
      )}
      <div className="defense-footer"><span className="green-dot" /> SAFE_AUTO POLICY · BACKEND ENFORCED <span className="footer-spacer" /><span>REFRESH 15S</span></div>
    </section>
  );
}
