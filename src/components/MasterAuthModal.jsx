import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, X } from "lucide-react";

const ROLES = ["MASTER", "FATHER", "MOTHER", "BROTHER", "SISTER", "GUEST"];

export default function MasterAuthModal({ open, onClose, onConnect, onLock, auth, api, notify }) {
  const [token, setToken] = useState(auth.token || "");
  const [speakerToken, setSpeakerToken] = useState(auth.speakerToken || "");
  const [passphrase, setPassphrase] = useState(auth.masterPassphrase || "");
  const [role, setRole] = useState(auth.role || "GUEST");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setToken(auth.token || "");
      setSpeakerToken(auth.speakerToken || "");
      setPassphrase(auth.masterPassphrase || "");
      setRole(auth.role || "GUEST");
    }
  }, [auth, open]);
  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    if (!token.trim()) {
      notify("Enter the backend API token to connect.", "error");
      return;
    }
    setBusy(true);
    try {
      const next = {
        token: token.trim(),
        speakerToken: speakerToken.trim(),
        masterPassphrase: "",
        role,
        masterVerified: false,
      };
      if (passphrase) {
        await api.verifyMaster(next, passphrase);
        if (role === "MASTER") {
          if (!next.speakerToken) {
            throw new Error("A signed Master speaker token is required for Master views.");
          }
          const result = await api.verifyMasterSpeaker({
            ...next,
            masterPassphrase: passphrase,
          });
          next.masterVerified = Array.isArray(result.profiles);
          next.masterPassphrase = passphrase;
        }
      }
      onConnect(next);
      notify(passphrase ? "Master authorization verified." : "Backend credentials applied.");
      onClose();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="modal-top"><span className="modal-icon"><LockKeyhole size={18} /></span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button></div>
        <span className="eyebrow">IDENTITY & ACCESS CONTROL</span><h2 id="auth-title">SECURE LINK</h2>
        <p className="modal-intro">Connect to the backend using the API token. Master-only dashboards additionally require verified speaker identity and passphrase.</p>
        <form onSubmit={submit}>
          <label className="field-label">BACKEND API TOKEN<input value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="off" placeholder="Paste API bearer token" /></label>
          <label className="field-label">SIGNED SPEAKER TOKEN <span>OPTIONAL</span><input value={speakerToken} onChange={(event) => setSpeakerToken(event.target.value)} type="password" autoComplete="off" placeholder="Role-bound token from backend" /></label>
          <label className="field-label">MASTER PASSPHRASE <span>OPTIONAL</span><span className="password-field"><input value={passphrase} onChange={(event) => setPassphrase(event.target.value)} type={showPassphrase ? "text" : "password"} autoComplete="new-password" placeholder="Verified against backend" /><button type="button" onClick={() => setShowPassphrase((value) => !value)} aria-label="Toggle passphrase visibility">{showPassphrase ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
          <label className="field-label">DISPLAY ROLE <span>NOT AN AUTHORIZATION</span><select value={role} onChange={(event) => setRole(event.target.value)}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="auth-notice"><ShieldCheck size={15} /><span>ROLE PERMISSIONS ARE VERIFIED BY THE BACKEND.<small>Role selection here is a visual preference only.</small></span></div>
          <button className="primary-button auth-submit" type="submit" disabled={busy}><KeyRound size={15} /> {busy ? "VERIFYING..." : "CONNECT SECURELY"}</button>
          {auth.token && <button className="text-button lock-link" type="button" onClick={() => { onLock(); onClose(); }}>CLEAR SESSION & LOCK</button>}
        </form>
      </section>
    </div>
  );
}
