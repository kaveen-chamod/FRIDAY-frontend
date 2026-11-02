import { ArrowLeft, Check, CircuitBoard, Cpu, Zap } from "lucide-react";

const connections = [
  { from: "GPIO 18", to: "LED ANODE", color: "wire-orange", path: "M150 72 C245 72 225 120 316 120" },
  { from: "GND", to: "GND RAIL", color: "wire-chestnut", path: "M150 170 C245 170 225 120 316 120" },
  { from: "GPIO 21", to: "SDA", color: "wire-muted", path: "M150 267 C245 267 220 222 316 222" },
  { from: "GPIO 22", to: "SCL", color: "wire-orange", path: "M150 328 C245 328 220 222 316 222" },
];

export default function CircuitVisualizer({ onClose, onConfirm }) {
  return (
    <main className="visualizer-screen">
      <div className="visualizer-top">
        <button className="back-button" onClick={onClose}><ArrowLeft size={16} /> RETURN TO HUD</button>
        <div className="visualizer-title"><span className="eyebrow">HARDWARE ASSIST</span><h1>CIRCUIT VISUALIZER</h1></div>
        <span className="visualizer-status"><i /> LIVE SCHEMATIC</span>
      </div>
      <div className="circuit-layout">
        <section className="panel circuit-canvas">
          <div className="circuit-canvas-top"><span><CircuitBoard size={16} /> WIRING MAP / REV 02</span><span>ESP32 · 3V3 LOGIC</span></div>
          <svg viewBox="0 0 640 390" role="img" aria-label="Animated circuit schematic">
            <defs><pattern id="circuitGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#4e4e4e" strokeWidth=".55" /></pattern></defs>
            <rect width="640" height="390" fill="url(#circuitGrid)" opacity=".8" />
            <rect x="28" y="46" width="122" height="316" rx="8" className="board-block" />
            <text x="89" y="198" className="board-title" textAnchor="middle">ESP32</text>
            <text x="89" y="217" className="board-subtitle" textAnchor="middle">DEV KIT V1</text>
            {["GPIO 18", "GND", "GPIO 21", "GPIO 22"].map((pin, index) => {
              const y = [72, 170, 267, 328][index];
              return <g key={pin}><rect x="28" y={y - 10} width="12" height="20" className="pin-pad" /><text x="51" y={y + 4} className="pin-label">{pin}</text></g>;
            })}
            <rect x="316" y="75" width="108" height="88" rx="7" className="component-block" />
            <text x="370" y="111" textAnchor="middle" className="component-title">STATUS LED</text>
            <text x="370" y="132" textAnchor="middle" className="component-sub">220Ω INLINE</text>
            <rect x="316" y="184" width="108" height="76" rx="7" className="component-block" />
            <text x="370" y="218" textAnchor="middle" className="component-title">I²C BUS</text>
            <text x="370" y="239" textAnchor="middle" className="component-sub">SENSOR ARRAY</text>
            {connections.map((connection) => <g key={connection.from}><path d={connection.path} className={`circuit-wire ${connection.color}`} /><circle r="4" className={`wire-pulse ${connection.color}`}><animateMotion dur="2.8s" repeatCount="indefinite" path={connection.path} /></circle></g>)}
            <circle cx="478" cy="119" r="13" className="terminal-dot" /><circle cx="478" cy="222" r="13" className="terminal-dot" />
            <text x="502" y="115" className="pin-label">OUTPUT</text><text x="502" y="133" className="component-sub">INDICATOR</text>
            <text x="502" y="218" className="pin-label">INPUT</text><text x="502" y="236" className="component-sub">TELEMETRY</text>
            <path d="M424 119H465M424 222H465" className="circuit-wire wire-muted" />
          </svg>
          <div className="circuit-legend"><span><i className="legend-orange" />GPIO OUTPUT</span><span><i className="legend-chestnut" />GROUND / RETURN</span><span><i className="legend-muted" />I²C BUS</span></div>
        </section>
        <aside className="circuit-side">
          <section className="panel circuit-instructions">
            <span className="eyebrow">ASSEMBLY SEQUENCE</span><h2>CONNECTION GUIDE</h2>
            {connections.map((item, index) => <div className="connection-item" key={item.from}><span className="connection-index">{String(index + 1).padStart(2, "0")}</span><span><b>{item.from}</b><small>CONNECT TO {item.to}</small></span><span className={`connection-line ${item.color}`} /></div>)}
            <div className="voltage-warning"><Zap size={15} /><span>POWER DOWN THE BOARD BEFORE WIRING<small>Verify polarity before applying 3V3.</small></span></div>
          </section>
          <section className="panel circuit-confirm">
            <span className="confirm-kicker"><Cpu size={15} /> CHECKPOINT</span>
            <p>Connections complete and ready for verification?</p>
            <button className="primary-button confirm-install" onClick={onConfirm}><Check size={16} /> මම සවි කළා, වැඩේ හරි!</button>
            <small>Confirmation returns to the main HUD only.</small>
          </section>
        </aside>
      </div>
    </main>
  );
}
