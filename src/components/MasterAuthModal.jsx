import { useState, useEffect } from "react";
import { LockKeyhole, X, Eye, EyeOff, ShieldCheck, Key } from "lucide-react";

export default function MasterAuthModal({ open, onClose, onConnect, onLock, auth, api, notify }) {
  const [token, setToken] = useState(auth?.token || "my-super-secret-friday-token-1234567890");
  const [speakerToken, setSpeakerToken] = useState(auth?.speakerToken || "");
  const [masterPassphrase, setMasterPassphrase] = useState(auth?.masterPassphrase || "FRIDAY@ACCESSAPPROVED");
  const [role, setRole] = useState(auth?.role || "MASTER");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth) {
      if (auth.token) setToken(auth.token);
      if (auth.masterPassphrase) setMasterPassphrase(auth.masterPassphrase);
      if (auth.role) setRole(auth.role);
    }
  }, [auth]);

  if (!open) return null;

  async function handleConnect(e) {
    e.preventDefault();
    if (!token.trim()) {
      notify("Backend API Token is required.", "error");
      return;
    }

    setLoading(true);
    try {
      let verifiedMaster = false;
      let issuedSpeakerToken = speakerToken;

      // Master Passphrase එකක් ඇත්නම් verify කිරීම
      if (masterPassphrase.trim()) {
        try {
          const res = await api.verifyMasterPassphrase({ token }, masterPassphrase.trim());
          if (res && (res.verified || res.status === "configured")) {
            verifiedMaster = true;
            if (res.speaker_token) issuedSpeakerToken = res.speaker_token;
          }
        } catch (err) {
          notify(err.message || "Master Passphrase verification failed.", "error");
          setLoading(false);
          return;
        }
      }

      // සාර්ථකව සම්බන්ධ වී Modal එක වසා දැමීම
      onConnect({
        token: token.trim(),
        speakerToken: issuedSpeakerToken,
        masterPassphrase: masterPassphrase.trim(),
        role: verifiedMaster ? "MASTER" : role,
        masterVerified: verifiedMaster
      });

      onClose(); // Modal එක ක්ෂණිකව Close කරයි!
    } catch (err) {
      notify(err.message || "Failed to establish secure link.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card panel" role="dialog" aria-modal="true">
        <button className="close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-header">
          <div className="modal-icon"><LockKeyhole size={20} /></div>
          <div>
            <span className="eyebrow">IDENTITY & ACCESS CONTROL</span>
            <h2>SECURE LINK</h2>
          </div>
        </div>

        <p className="modal-desc">
          Connect to the backend using the API token. Master clearance unlocks full smart home automation, telemetry, and system controls.
        </p>

        <form onSubmit={handleConnect} className="auth-form">
          <div className="form-group">
            <label>BACKEND API TOKEN <span className="req">*</span></label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste API bearer token"
              required
            />
          </div>

          <div className="form-group">
            <label>SIGNED SPEAKER TOKEN <span className="opt">OPTIONAL</span></label>
            <input
              type="text"
              value={speakerToken}
              onChange={(e) => setSpeakerToken(e.target.value)}
              placeholder="Role-bound token from backend"
            />
          </div>

          <div className="form-group">
            <label>MASTER PASSPHRASE <span className="opt">OPTIONAL</span></label>
            <div className="password-wrap">
              <input
                type={showPassphrase ? "text" : "password"}
                value={masterPassphrase}
                onChange={(e) => setMasterPassphrase(e.target.value)}
                placeholder="Verified against backend"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>DISPLAY ROLE</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MASTER">MASTER (Full Root Clearance)</option>
              <option value="FATHER">FATHER (Parental Clearance)</option>
              <option value="MOTHER">MOTHER (Parental Clearance)</option>
              <option value="GUEST">GUEST (Restricted Access)</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" className="primary-button submit-btn" disabled={loading}>
              <ShieldCheck size={16} />
              <span>{loading ? "VERIFYING..." : "CONNECT SECURELY"}</span>
            </button>
            {auth?.token && (
              <button type="button" className="outline-button lock-btn" onClick={onLock}>
                <Key size={14} /> CLEAR SESSION
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}