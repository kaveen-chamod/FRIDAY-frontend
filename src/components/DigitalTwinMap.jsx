import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Crosshair, LocateFixed, MapPin, RotateCcw, Route, Square } from "lucide-react";

const ZONES = [
  { name: "LIVING ROOM", coordinate: [2, 2], icon: "01" },
  { name: "KITCHEN", coordinate: [7, 2], icon: "02" },
  { name: "DOCK", coordinate: [7, 6], icon: "03" },
];
const DEMO_OBSTACLES = [[3, 2], [3, 3], [4, 3], [5, 3], [5, 4], [2, 6], [3, 6]];

function getVehicle(status) {
  const devices = status?.digital_twin?.devices || [];
  const device = devices.find((item) => item.domain === "robotics");
  return device || null;
}

export default function DigitalTwinMap({ auth, robotics, notify, api }) {
  const vehicle = getVehicle(robotics);
  const [route, setRoute] = useState([]);
  const [selected, setSelected] = useState(null);
  const [working, setWorking] = useState(false);
  const state = vehicle?.state || {};
  const x = Number.isInteger(state.x) ? state.x : 1;
  const y = Number.isInteger(state.y) ? state.y : 5;
  const heading = Number.isFinite(state.heading) ? state.heading : 0;
  const configuredDimensions = robotics?.map?.dimensions;
  const obstacles = configuredDimensions ? [] : DEMO_OBSTACLES;
  const width = Math.min(12, Math.max(8, configuredDimensions?.width || 10));
  const height = Math.min(8, Math.max(7, configuredDimensions?.height || 8));
  const zones = ZONES.map((zone) => ({
    ...zone,
    coordinate: [
      Math.min(zone.coordinate[0], width - 1),
      Math.min(zone.coordinate[1], height - 1),
    ],
  }));
  const pathKey = useMemo(() => new Set(route.map(([px, py]) => `${px},${py}`)), [route]);

  async function planZone(zone) {
    setSelected(zone.name);
    setWorking(true);
    try {
      const result = await api.planPath(auth, [x, y], zone.coordinate);
      setRoute(result.path || []);
      notify(`ROUTE PLAN READY · ${zone.name}`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function emergencyStop() {
    if (!vehicle?.device_id) {
      notify("No registered RC car is available for emergency stop.", "error");
      return;
    }
    setWorking(true);
    try {
      const result = await api.chat(auth, `Emergency STOP the RC car ${vehicle.device_id} now.`);
      notify(result.response || "Stop command sent through the secured assistant path.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">SPATIAL NAVIGATION</span><h2>DIGITAL TWIN</h2></div>
        <span className={`sensor-state ${vehicle?.telemetry_fresh ? "online" : ""}`}><i /> {vehicle?.telemetry_fresh ? "SENSOR LINK" : "SIMULATION VIEW"}</span>
      </div>
      <div className="map-meta"><span><Crosshair size={13} /> GRID / XY</span><span>{configuredDimensions ? `${width} × ${height} GRID` : "DEMO GRID"}</span><span>OBSTACLES {configuredDimensions ? robotics.map.obstacle_count : obstacles.length}</span></div>
      <div className="map-viewport">
        <svg viewBox={`0 0 ${width * 50} ${height * 50}`} role="img" aria-label="Tactical room map">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#4e4e4e" strokeWidth="0.7" opacity=".48" />
            </pattern>
            <filter id="markerGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d={`M 1 1 H ${width * 50 - 1} V ${height * 50 - 1} H 1 Z`} fill="none" stroke="#a1887d" strokeWidth="2" opacity=".7" />
          {Array.from({ length: width }, (_, index) => <text key={`x${index}`} x={index * 50 + 21} y="14" className="map-axis">{String(index).padStart(2, "0")}</text>)}
          {obstacles.map(([ox, oy], index) => (
            <g key={`ob-${index}`} transform={`translate(${ox * 50 + 6},${oy * 50 + 6})`}>
              <rect width="38" height="38" rx="3" fill="#3f3835" stroke="#4e4e4e" />
              <path d="M5 5L33 33M33 5L5 33" stroke="#4e4e4e" strokeWidth="1" opacity=".7" />
            </g>
          ))}
          {zones.map((zone) => (
            <g key={zone.name} className="map-zone" onClick={() => planZone(zone)} role="button" tabIndex="0" aria-label={`Plan route to ${zone.name}`}>
              <circle cx={zone.coordinate[0] * 50 + 25} cy={zone.coordinate[1] * 50 + 25} r="15" fill="#a1887d" fillOpacity=".08" stroke="#a1887d" strokeDasharray="3 3" />
              <text x={zone.coordinate[0] * 50 + 25} y={zone.coordinate[1] * 50 + 29} textAnchor="middle" className="zone-label">{zone.icon}</text>
            </g>
          ))}
          {route.length > 1 && <polyline points={route.map(([px, py]) => `${px * 50 + 25},${py * 50 + 25}`).join(" ")} fill="none" stroke="#b55933" strokeWidth="3" strokeDasharray="7 5" className="route-line" />}
          {Array.from(pathKey).map((point) => {
            const [px, py] = point.split(",").map(Number);
            return <circle key={point} cx={px * 50 + 25} cy={py * 50 + 25} r="4" fill="#b55933" />;
          })}
          <g transform={`translate(${x * 50 + 25},${y * 50 + 25}) rotate(${heading})`} filter="url(#markerGlow)">
            <circle r="15" fill="#b55933" fillOpacity=".18" stroke="#b55933" strokeWidth="1" />
            <path d="M0 -10 L7 7 L0 4 L-7 7 Z" fill="#a1887d" />
            <circle r="2" fill="#141414" />
          </g>
          <text x={x * 50 + 26} y={y * 50 + 48} className="vehicle-label">RC-{vehicle?.device_id?.slice(-3) || "01"}</text>
        </svg>
        <div className="map-corner map-corner-tl" /><div className="map-corner map-corner-br" />
        <div className="map-compass"><LocateFixed size={14} /><span>N</span></div>
      </div>
      <div className="waypoint-row">
        {zones.map((zone) => <button key={zone.name} className={`waypoint-chip ${selected === zone.name ? "selected" : ""}`} onClick={() => planZone(zone)} disabled={working}><MapPin size={13} />{zone.name}</button>)}
      </div>
      <div className="map-footer">
        <div className="position-readout"><span>POSITION</span><b>X {String(x).padStart(2, "0")} <i>/</i> Y {String(y).padStart(2, "0")}</b><small>{vehicle?.device_id || "No enrolled vehicle"}</small></div>
        <button className="map-reset" onClick={() => { setRoute([]); setSelected(null); }}><RotateCcw size={14} /> CLEAR ROUTE</button>
        <button className="stop-button" onClick={emergencyStop} disabled={working}><Square size={13} fill="currentColor" /> EMERGENCY STOP</button>
      </div>
      <div className="safety-note"><AlertTriangle size={13} /> ROUTE PREVIEW ONLY · PHYSICAL MOVEMENT REQUIRES BACKEND CONFIRMATION</div>
    </section>
  );
}
