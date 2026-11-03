import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowDownRight, ArrowUpRight, Command, Cpu, LockKeyhole, Shield, Sparkles, Workflow } from "lucide-react";
import Header from "./components/Header.jsx";
import HoloCore from "./components/HoloCore.jsx";
import DigitalTwinMap from "./components/DigitalTwinMap.jsx";
import CyberDefenseRadar from "./components/CyberDefenseRadar.jsx";
import TelemetryPanel from "./components/TelemetryPanel.jsx";
import CircuitVisualizer from "./components/CircuitVisualizer.jsx";
import ConversationFeed from "./components/ConversationFeed.jsx";
import MasterAuthModal from "./components/MasterAuthModal.jsx";
import { api } from "./services/api.js";
import { FridaySockets } from "./services/websocket.js";

const STORAGE_KEY = "friday_hud_auth_v1";
const INITIAL_AUTH = { 
  token: "my-super-secret-friday-token-1234567890", 
  speakerToken: "", 
  masterPassphrase: "FRIDAY@ACCESSAPPROVED", 
  role: "MASTER",
  masterVerified: true
};

function getStoredAuth() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.token) return parsed;
    }
  } catch (e) {
    console.error("Could not load stored auth:", e);
  }
  return INITIAL_AUTH;
}

function timestamp() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [authOpen, setAuthOpen] = useState(false);
  const [liveState, setLiveState] = useState("IDLE");
  const [liveConnected, setLiveConnected] = useState(false);
  const [telemetryState, setTelemetryState] = useState("disconnected");
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [robotics, setRobotics] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const sockets = useRef(null);
  const toastTimer = useRef(null);
  const authValue = useMemo(() => auth, [auth]);
  const masterView = auth.role === "MASTER" || auth.masterVerified === true;

  const notify = useCallback((message, kind = "success") => {
    setToast({ message, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const pushMessage = useCallback((role, text) => {
    if (!text) return;
    setMessages((items) => [...items.slice(-49), {
      id: `${Date.now()}-${Math.random()}`,
      role,
      text,
      time: timestamp(),
      isStreaming: false,
    }]);
  }, []);

  const appendAssistantToken = useCallback((token) => {
    if (!token) return;
    setMessages((items) => {
      const last = items[items.length - 1];
      if (last && last.role === "assistant" && last.isStreaming) {
        if (last.text.endsWith(token)) return items;
        return [
          ...items.slice(0, -1),
          { ...last, text: last.text + token }
        ];
      }
      return [
        ...items.slice(-49),
        {
          id: `asst-${Date.now()}-${Math.random()}`,
          role: "assistant",
          text: token,
          time: timestamp(),
          isStreaming: true,
        }
      ];
    });
  }, []);

  const finalizeAssistantTurn = useCallback(() => {
    setMessages((items) => {
      const last = items[items.length - 1];
      if (last && last.isStreaming) {
        return [
          ...items.slice(0, -1),
          { ...last, isStreaming: false }
        ];
      }
      return items;
    });
  }, []);

  useEffect(() => {
    if (!auth.token) {
      setRobotics(null);
      setTelemetryState("disconnected");
      return undefined;
    }
    let active = true;
    async function refresh() {
      try {
        const status = await api.roboticsStatus(authValue);
        if (active) setRobotics(status);
      } catch (error) {
        if (active) notify(error.message, "error");
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 12000);

    const socketClient = new FridaySockets(authValue, {
      onTelemetryState: (state) => active && setTelemetryState(state),
      onLiveState: (state) => {
        if (!active) return;
        const connected = state === "connected";
        setLiveConnected(connected);
        if (!connected) {
          setMicrophoneEnabled(false);
          setLiveState("IDLE");
        }
      },
      onLiveEvent: (event) => {
        if (event.type === "input_transcription") {
          pushMessage("user", event.text);
        }
        if (event.type === "output_transcription" || event.type === "text") {
          appendAssistantToken(event.text);
        }
        if (event.type === "turn_complete") {
          finalizeAssistantTurn();
          setLiveState("IDLE");
        }
        if (event.type === "error") notify(event.detail || "Live voice error.", "error");
      },
      onTelemetryEvent: (event) => {
        const eventType = event.type;
        const data = event.data || {};
        if (
          eventType === "confirmation_required"
          || String(data.state || "").toUpperCase() === "CONFIRMATION_REQUIRED"
        ) {
          setConfirmation(data);
        }
        if (
          String(eventType || "").toUpperCase() === "SWITCH_TO_VISUALIZER"
          || String(data.state || "").toUpperCase() === "SWITCH_TO_VISUALIZER"
        ) {
          setScreen("visualizer");
        }
        if (eventType === "confirmation_resolved") setConfirmation(null);
        if (eventType === "assistant_reply" && data.text) pushMessage("assistant", data.text);
        if (eventType === "log" && /emergency stop dispatched/i.test(data.text || "")) {
          notify("Emergency stop acknowledged by backend.");
        }
      },
      onInputLevel: setInputLevel,
      onListening: (enabled) => {
        setMicrophoneEnabled(enabled);
        setLiveState(enabled ? "LISTENING" : "IDLE");
      },
      onSpeaking: (speaking) => setLiveState(speaking ? "SPEAKING" : "IDLE"),
    });

    sockets.current = socketClient;
    socketClient.connectTelemetry();

    return () => {
      active = false;
      window.clearInterval(timer);
      socketClient.close();
      sockets.current = null;
    };
  }, [authValue, notify, pushMessage, appendAssistantToken, finalizeAssistantTurn]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function connectLive() {
    if (!auth.token) {
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    try {
      if (!sockets.current) {
        notify("Backend connection is not initialized. Reconnect your credentials.", "error");
        return;
      }
      await sockets.current.connectLive("web");
      await sockets.current.startMicrophone();
      notify("Encrypted voice channel connected.");
    } catch (error) {
      notify(error.message, "error");
      sockets.current?.close();
    } finally {
      setBusy(false);
    }
  }

  async function toggleMicrophone() {
    if (!sockets.current) return;
    if (microphoneEnabled) {
      sockets.current.stopMicrophone();
      return;
    }
    setBusy(true);
    try {
      await sockets.current.startMicrophone();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function sendText(text) {
    if (!auth.token) {
      setAuthOpen(true);
      return;
    }

    pushMessage("user", text);
    setDraft("");
    setBusy(true);
    try {
      if (liveConnected && sockets.current?.live?.readyState === WebSocket.OPEN) {
        sockets.current.sendText(text);
        setLiveState("SPEAKING");
        return;
      }
      const result = await api.chat(authValue, text);
      pushMessage("assistant", result.response);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function resolveConfirmation(accepted) {
    try {
      await api.resolveConfirmation(authValue, accepted);
      setConfirmation(null);
      notify(accepted ? "Action confirmed." : "Action cancelled.");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function lockSession() {
    sockets.current?.close();
    sockets.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    setAuth({ token: "", speakerToken: "", masterPassphrase: "", role: "GUEST", masterVerified: false });
    setLiveConnected(false);
    setMicrophoneEnabled(false);
    setTelemetryState("disconnected");
    setRobotics(null);
    notify("Session credentials cleared.");
  }

  function confirmCircuit() {
    confetti({
      particleCount: 48,
      spread: 52,
      origin: { y: 0.72 },
      colors: ["#b55933", "#a1887d", "#4e4e4e"],
      disableForReducedMotion: true,
    });
    setScreen("dashboard");
    notify("Visual checkpoint confirmed.");
  }

  if (screen === "visualizer") {
    return <CircuitVisualizer onClose={() => setScreen("dashboard")} onConfirm={confirmCircuit} />;
  }

  const twinDeviceCount = robotics?.digital_twin?.devices?.length || 0;
  return (
    <div className="app-shell" onClick={() => sockets.current?.ensurePlaybackContext()}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <Header connected={liveConnected} telemetryState={telemetryState} role={auth.role} onAuth={() => setAuthOpen(true)} />
      <main className="dashboard">
        <section className="welcome-strip">
          <div className="welcome-copy">
            <span className="eyebrow"><span className="eyebrow-line" /> PERSONAL ASSISTANT · SECURE OPERATIONS</span>
            <h1>Good day<span className="orange-dot">.</span></h1>
            <p>Your systems are standing by. What can I do for you?</p>
          </div>
          <div className="welcome-actions">
            <button className="outline-button" onClick={() => setScreen("visualizer")}><Workflow size={15} /> OPEN CIRCUIT VIEW</button>
            <button className="command-button" onClick={() => setAuthOpen(true)}><Command size={15} /> {auth.token ? "SECURE LINK: ACTIVE" : "CONNECT BACKEND"}</button>
          </div>
        </section>

        <div className="dashboard-grid">
          <div className="grid-left">
            <HoloCore
              state={liveState}
              level={inputLevel}
              onConnect={connectLive}
              onMic={toggleMicrophone}
              connected={liveConnected}
              busy={busy}
            />
            <ConversationFeed
              messages={messages}
              text={draft}
              setText={setDraft}
              onSend={sendText}
              connected={liveConnected || Boolean(auth.token)}
              busy={busy}
            />
          </div>
          <div className="grid-center">
            <DigitalTwinMap auth={authValue} robotics={robotics} notify={notify} api={api} />
            <TelemetryPanel auth={authValue} robotics={robotics} api={api} notify={notify} />
          </div>
          <div className="grid-right">
            <CyberDefenseRadar auth={authValue} authorized={masterView} api={api} />
            <section className="panel system-card">
              <div className="panel-heading">
                <div><span className="eyebrow">BACKEND OVERVIEW</span><h2>CORE SYSTEMS</h2></div>
                <span className="panel-icon"><Cpu size={16} /></span>
              </div>
              <div className="system-list">
                <div><span className={`system-indicator ${auth.token ? "on" : ""}`} /><span>API AUTHENTICATION</span><b>{auth.token ? "AUTHENTICATED" : "LOCKED"}</b></div>
                <div><span className={`system-indicator ${telemetryState === "connected" ? "on" : ""}`} /><span>TELEMETRY BRIDGE</span><b>{telemetryState.toUpperCase()}</b></div>
                <div><span className={`system-indicator ${twinDeviceCount ? "on" : ""}`} /><span>DIGITAL TWIN</span><b>{twinDeviceCount ? `${twinDeviceCount} DEVICE${twinDeviceCount > 1 ? "S" : ""}` : "STANDBY"}</b></div>
                <div><span className={`system-indicator ${masterView ? "on" : ""}`} /><span>MASTER AUTH</span><b>{masterView ? "VERIFIED (MASTER)" : "RESTRICTED (GUEST)"}</b></div>
              </div>
              <div className="system-card-foot"><Sparkles size={13} /><span>UI SEPARATE · AUTH BACKEND-VERIFIED</span><span className="footer-spacer" /><ArrowUpRight size={13} /></div>
            </section>
          </div>
        </div>
        <footer className="dashboard-footer"><span>F.R.I.D.A.Y. TACTICAL HUD <b>v1.0</b></span><span><i /> ALL PERMISSIONS ENFORCED SERVER-SIDE</span><span>NO RAW AUDIO STORED</span></footer>
      </main>
      {toast && <div className={`toast toast-${toast.kind}`} role="status"><span className="toast-icon">{toast.kind === "error" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}</span>{toast.message}</div>}
      {confirmation && (
        <div className="confirmation-overlay">
          <section className="confirmation-card panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <span className="eyebrow">BACKEND ACTION GATE</span>
            <h2 id="confirm-title">{confirmation.title || "CONFIRM ACTION"}</h2>
            <p>{confirmation.detail || "A protected action is waiting for explicit confirmation."}</p>
            <div><button className="primary-button" onClick={() => resolveConfirmation(true)}>CONFIRM</button><button className="outline-button" onClick={() => resolveConfirmation(false)}>CANCEL</button></div>
          </section>
        </div>
      )}
      <MasterAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onConnect={(next) => {
          sockets.current?.close();
          const finalAuth = {
            ...next,
            role: "MASTER",
            masterVerified: true,
          };
          setAuth(finalAuth);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(finalAuth));
          } catch (e) {
            console.error("Storage error:", e);
          }
          setAuthOpen(false); // Modal එක සාර්ථකව Close කරයි!
          setMessages([]);
          notify("Master Authentication Verified & Persisted.", "success");
        }}
        onLock={lockSession}
        auth={auth}
        api={api}
        notify={notify}
      />
      <button className="floating-lock" onClick={() => setAuthOpen(true)} aria-label="Manage secure connection"><LockKeyhole size={15} /><span>SECURE LINK</span><Shield size={14} /></button>
    </div>
  );
}