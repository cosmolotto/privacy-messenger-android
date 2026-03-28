import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#10B981";
const ACCENT_DIM = "#065F46";
const BG = "#0A0A0A";
const BG2 = "#111111";
const BG3 = "#1A1A1A";
const BG4 = "#222222";
const TEXT = "#F0F0F0";
const TEXT2 = "#9CA3AF";
const TEXT3 = "#6B7280";
const BORDER = "#2A2A2A";
const DANGER = "#EF4444";

// ─── API SERVICE ─────────────────────────────────
const API_URL = "http://localhost:8082/api";

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data.error };
    return data;
  },
  post: (ep, body) => api.request(ep, { method: "POST", body: JSON.stringify(body) }),
  get: (ep) => api.request(ep),
  patch: (ep, body) => api.request(ep, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (ep) => api.request(ep, { method: "DELETE" }),
};

// ─── DEMO DATA ───────────────────────────────────
const DEMO_CONVERSATIONS = [
  { id: "c1", other_user_unique_id: "PRIV-K8M2X9NP", other_user_display_name: "Sarah", unread_count: 3, last_message_at: new Date(Date.now() - 120000).toISOString(), other_user_last_seen: new Date(Date.now() - 60000).toISOString(), lastMessage: "Hey! Are you coming tonight?", online: true },
  { id: "c2", other_user_unique_id: "PRIV-T4R7W2QJ", other_user_display_name: "Dev Team", unread_count: 0, last_message_at: new Date(Date.now() - 3600000).toISOString(), other_user_last_seen: new Date(Date.now() - 1800000).toISOString(), lastMessage: "Build passed ✓", online: false },
  { id: "c3", other_user_unique_id: "PRIV-L5N3Y8MK", other_user_display_name: "Alex", unread_count: 1, last_message_at: new Date(Date.now() - 7200000).toISOString(), other_user_last_seen: new Date(Date.now() - 3600000).toISOString(), lastMessage: "Check this out", online: true },
  { id: "c4", other_user_unique_id: "PRIV-G9H6V1BZ", other_user_display_name: null, unread_count: 0, last_message_at: new Date(Date.now() - 86400000).toISOString(), other_user_last_seen: new Date(Date.now() - 43200000).toISOString(), lastMessage: "Thanks!", online: false },
];

const DEMO_MESSAGES = {
  c1: [
    { id: "m1", sender_id: "other", encrypted_body: "Hey! How are you?", created_at: new Date(Date.now() - 600000).toISOString(), status: "read" },
    { id: "m2", sender_id: "me", encrypted_body: "I'm good! Working on something cool", created_at: new Date(Date.now() - 540000).toISOString(), status: "read" },
    { id: "m3", sender_id: "other", encrypted_body: "Oh nice! What is it?", created_at: new Date(Date.now() - 480000).toISOString(), status: "read" },
    { id: "m4", sender_id: "me", encrypted_body: "A privacy-first messaging app 🔒", created_at: new Date(Date.now() - 420000).toISOString(), status: "delivered" },
    { id: "m5", sender_id: "other", encrypted_body: "That sounds amazing!", created_at: new Date(Date.now() - 360000).toISOString(), status: "sent" },
    { id: "m6", sender_id: "other", encrypted_body: "When can I try it?", created_at: new Date(Date.now() - 240000).toISOString(), status: "sent" },
    { id: "m7", sender_id: "other", encrypted_body: "Hey! Are you coming tonight?", created_at: new Date(Date.now() - 120000).toISOString(), status: "sent" },
  ],
};

// ─── ICONS (inline SVG) ──────────────────────────
const Icon = ({ name, size = 20, color = TEXT2, style = {} }) => {
  const icons = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></>,
    back: <><polyline points="15 18 9 12 15 6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    search: <><circle cx="11" cy="11" r="8" fill="none" stroke={color} strokeWidth="1.5"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    settings: <><circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke={color} strokeWidth="1.5"/></>,
    check: <><polyline points="20 6 9 17 4 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>,
    checkCheck: <><polyline points="18 6 7 17 2 12" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 6 11 17" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke={color} strokeWidth="1.5"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke={color} strokeWidth="1.5"/><circle cx="12" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.5"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke={color} strokeWidth="1.5"/><polyline points="16 17 21 12 16 7" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke={color} strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.5"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    messageCircle: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="none" stroke={color} strokeWidth="1.5"/></>,
    info: <><circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.5"/><line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth="1.5"/><line x1="12" y1="8" x2="12.01" y2="8" stroke={color} strokeWidth="1.5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, ...style }}>{icons[name]}</svg>;
};

// ─── UTILITY FUNCTIONS ───────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function generateDemoId() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `PRIV-${id}`;
}

// ─── STYLES ──────────────────────────────────────
const S = {
  app: { width: "100%", maxWidth: 480, margin: "0 auto", height: "100dvh", background: BG, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: TEXT, overflow: "hidden", position: "relative", borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` },
  input: { width: "100%", padding: "14px 16px", background: BG3, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
  btn: { width: "100%", padding: "15px", background: ACCENT, border: "none", borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.3px" },
  btnOutline: { width: "100%", padding: "15px", background: "transparent", border: `1.5px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: 15, cursor: "pointer", transition: "all 0.2s" },
  header: { padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${BORDER}`, background: BG2, backdropFilter: "blur(20px)", zIndex: 10 },
  avatar: (size = 44) => ({ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DIM})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 600, color: "#fff", flexShrink: 0 }),
  badge: { background: ACCENT, color: "#fff", borderRadius: 20, minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, padding: "0 6px" },
  onlineDot: { width: 10, height: 10, borderRadius: "50%", background: ACCENT, border: `2px solid ${BG2}`, position: "absolute", bottom: 0, right: 0 },
  fadeIn: { animation: "fadeIn 0.3s ease" },
  slideUp: { animation: "slideUp 0.35s ease" },
};

// ─── WELCOME SCREEN ──────────────────────────────
function WelcomeScreen({ onRegister, onLogin, onRecover }) {
  return (
    <div style={{ ...S.app, justifyContent: "center", alignItems: "center", padding: "40px 30px", textAlign: "center" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      <div style={{ animation: "float 3s ease-in-out infinite", marginBottom: 40 }}>
        <div style={{ width: 100, height: 100, borderRadius: 28, background: `linear-gradient(135deg, ${ACCENT}, #059669, ${ACCENT_DIM})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 20px 60px ${ACCENT}33`, margin: "0 auto" }}>
          <Icon name="shield" size={48} color="#fff" />
        </div>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.5px", ...S.fadeIn }}>
        Privacy Messenger
      </h1>
      <p style={{ color: TEXT2, fontSize: 16, lineHeight: 1.5, marginBottom: 8, maxWidth: 320, ...S.fadeIn }}>
        Your messages. Your identity. Your rules.
      </p>
      <p style={{ color: TEXT3, fontSize: 13, marginBottom: 48, ...S.fadeIn }}>
        End-to-end encrypted • Zero knowledge • No phone number required
      </p>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, ...S.slideUp }}>
        <button style={S.btn} onClick={onRegister}
          onMouseOver={e => e.target.style.transform = "translateY(-1px)"}
          onMouseOut={e => e.target.style.transform = "translateY(0)"}>
          Create Account
        </button>
        <button style={S.btnOutline} onClick={onLogin}
          onMouseOver={e => { e.target.style.borderColor = ACCENT; e.target.style.color = ACCENT; }}
          onMouseOut={e => { e.target.style.borderColor = BORDER; e.target.style.color = TEXT; }}>
          I Have an Account
        </button>
        <button style={{ ...S.btnOutline, border: "none", color: TEXT3, fontSize: 14, padding: "10px" }} onClick={onRecover}>
          Recover Account on New Device
        </button>
      </div>

      <div style={{ position: "absolute", bottom: 30, display: "flex", gap: 24, color: TEXT3, fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="lock" size={12} color={TEXT3}/>E2E Encrypted</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="eye" size={12} color={TEXT3}/>Zero Knowledge</span>
      </div>
    </div>
  );
}

// ─── REGISTER SCREEN ─────────────────────────────
function RegisterScreen({ onBack, onSuccess }) {
  const [step, setStep] = useState(1);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (passphrase.length < 8) return setError("Passphrase must be at least 8 characters");
    if (passphrase !== confirmPass) return setError("Passphrases don't match");
    setError("");
    setLoading(true);

    // Simulate registration (replace with real API call)
    await new Promise(r => setTimeout(r, 1500));
    const newId = generateDemoId();
    setGeneratedId(newId);
    setStep(3);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(generatedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="back" size={22} color={TEXT} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Create Account</span>
      </div>

      <div style={{ flex: 1, padding: "30px 24px", overflowY: "auto" }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 36 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s <= step ? ACCENT : BG4, transition: "all 0.3s" }} />
          ))}
        </div>

        {step === 1 && (
          <div style={S.fadeIn}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Choose your identity</h2>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
              Pick a display name. This is optional — you can stay anonymous.
            </p>

            <label style={{ fontSize: 13, color: TEXT2, marginBottom: 6, display: "block" }}>Display Name (optional)</label>
            <input
              style={S.input}
              placeholder="Anonymous"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = BORDER}
            />
            <p style={{ color: TEXT3, fontSize: 12, marginTop: 8 }}>Others will see this name. Leave blank to use your unique ID instead.</p>

            <button style={{ ...S.btn, marginTop: 40 }} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={S.fadeIn}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Set your passphrase</h2>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
              This is your master key. You'll need it to log in and recover your account. <strong style={{ color: ACCENT }}>Write it down — we can't reset it.</strong>
            </p>

            {error && (
              <div style={{ background: "#EF444420", border: `1px solid ${DANGER}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: DANGER, fontSize: 13 }}>
                {error}
              </div>
            )}

            <label style={{ fontSize: 13, color: TEXT2, marginBottom: 6, display: "block" }}>Passphrase</label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                style={S.input}
                type={showPass ? "text" : "password"}
                placeholder="Min 8 characters"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
              <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                <Icon name={showPass ? "eyeOff" : "eye"} size={18} color={TEXT3} />
              </button>
            </div>

            <label style={{ fontSize: 13, color: TEXT2, marginBottom: 6, display: "block" }}>Confirm Passphrase</label>
            <input
              style={S.input}
              type={showPass ? "text" : "password"}
              placeholder="Repeat passphrase"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = BORDER}
            />

            {passphrase.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: passphrase.length >= i * 4 ? (passphrase.length >= 12 ? ACCENT : "#F59E0B") : BG4,
                    transition: "all 0.3s"
                  }} />
                ))}
              </div>
            )}

            <button style={{ ...S.btn, marginTop: 32, opacity: loading ? 0.7 : 1 }} onClick={handleRegister} disabled={loading}>
              {loading ? "Creating your secure identity..." : "Create Account"}
            </button>
          </div>
        )}

        {step === 3 && generatedId && (
          <div style={{ ...S.fadeIn, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: `${ACCENT}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Icon name="check" size={32} color={ACCENT} />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>You're all set!</h2>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
              Here's your unique ID. This is your identity — share it with friends so they can message you.
            </p>

            <div style={{ background: BG3, border: `2px solid ${ACCENT}40`, borderRadius: 16, padding: "24px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: TEXT3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Your Unique ID</p>
              <p style={{ fontSize: 28, fontWeight: 700, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: 2, color: ACCENT }}>
                {generatedId}
              </p>
            </div>

            <button onClick={handleCopy} style={{ ...S.btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
              <Icon name={copied ? "check" : "copy"} size={16} color={copied ? ACCENT : TEXT} />
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>

            <div style={{ background: `#F59E0B15`, border: "1px solid #F59E0B30", borderRadius: 12, padding: "14px 16px", textAlign: "left", marginBottom: 32 }}>
              <p style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600, marginBottom: 4 }}>Save this information!</p>
              <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.5 }}>
                Your ID: <strong style={{ color: TEXT }}>{generatedId}</strong><br />
                You'll need your ID + passphrase to log in or recover your account. We cannot recover these for you.
              </p>
            </div>

            <button style={S.btn} onClick={() => onSuccess({ uniqueId: generatedId, displayName: displayName || null })}>
              Start Messaging
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ────────────────────────────────
function LoginScreen({ onBack, onSuccess, title = "Welcome Back" }) {
  const [uniqueId, setUniqueId] = useState("PRIV-");
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!uniqueId.match(/^PRIV-[A-Z0-9]{8}$/)) return setError("Invalid ID format. Example: PRIV-7X9K2M4N");
    if (!passphrase) return setError("Enter your passphrase");
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    onSuccess({ uniqueId, displayName: "You" });
  };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="back" size={22} color={TEXT} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{title}</span>
      </div>

      <div style={{ flex: 1, padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${ACCENT}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icon name="key" size={28} color={ACCENT} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{title}</h2>
          <p style={{ color: TEXT2, fontSize: 14 }}>Enter your unique ID and passphrase</p>
        </div>

        {error && (
          <div style={{ background: "#EF444420", border: `1px solid ${DANGER}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: DANGER, fontSize: 13 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 13, color: TEXT2, marginBottom: 6, display: "block" }}>Unique ID</label>
        <input
          style={{ ...S.input, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: 1, marginBottom: 16 }}
          value={uniqueId}
          onChange={e => setUniqueId(e.target.value.toUpperCase())}
          placeholder="PRIV-XXXXXXXX"
          maxLength={13}
          onFocus={e => e.target.style.borderColor = ACCENT}
          onBlur={e => e.target.style.borderColor = BORDER}
        />

        <label style={{ fontSize: 13, color: TEXT2, marginBottom: 6, display: "block" }}>Passphrase</label>
        <div style={{ position: "relative" }}>
          <input
            style={S.input}
            type={showPass ? "text" : "password"}
            placeholder="Your passphrase"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = BORDER}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
            <Icon name={showPass ? "eyeOff" : "eye"} size={18} color={TEXT3} />
          </button>
        </div>

        <button style={{ ...S.btn, marginTop: 32, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? "Verifying..." : "Log In"}
        </button>
      </div>
    </div>
  );
}

// ─── CHAT LIST SCREEN ────────────────────────────
function ChatListScreen({ user, conversations, onOpenChat, onNewChat, onSettings }) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(c =>
    (c.other_user_display_name || c.other_user_unique_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={{ ...S.header, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.avatar(36)}>
            {(user.displayName || user.uniqueId[5] || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700 }}>Chats</p>
            <p style={{ fontSize: 11, color: ACCENT, fontFamily: "monospace" }}>{user.uniqueId}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onNewChat} style={{ background: `${ACCENT}18`, border: "none", borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="plus" size={18} color={ACCENT} />
          </button>
          <button onClick={onSettings} style={{ background: BG3, border: "none", borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="settings" size={18} color={TEXT2} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 20px 8px" }}>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={16} color={TEXT3} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            style={{ ...S.input, paddingLeft: 36, fontSize: 14, background: BG3, border: `1px solid transparent` }}
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = BORDER}
            onBlur={e => e.target.style.borderColor = "transparent"}
          />
        </div>
      </div>

      {/* E2E Banner */}
      <div style={{ margin: "4px 20px 8px", padding: "8px 12px", background: `${ACCENT}08`, borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="lock" size={13} color={ACCENT} />
        <span style={{ fontSize: 11, color: ACCENT }}>All messages are end-to-end encrypted</span>
      </div>

      {/* Conversation List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 30px", color: TEXT3 }}>
            <Icon name="messageCircle" size={48} color={BG4} style={{ margin: "0 auto 16px", display: "block" }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: TEXT2, marginBottom: 4 }}>No conversations yet</p>
            <p style={{ fontSize: 13 }}>Tap + to start your first encrypted chat</p>
          </div>
        ) : filtered.map(conv => (
          <div
            key={conv.id}
            onClick={() => onOpenChat(conv)}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer", transition: "background 0.15s", borderBottom: `1px solid ${BORDER}08` }}
            onMouseOver={e => e.currentTarget.style.background = BG2}
            onMouseOut={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ position: "relative" }}>
              <div style={S.avatar(50)}>
                {(conv.other_user_display_name || conv.other_user_unique_id.slice(5, 7)).charAt(0).toUpperCase()}
              </div>
              {conv.online && <div style={S.onlineDot} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {conv.other_user_display_name || conv.other_user_unique_id}
                </span>
                <span style={{ fontSize: 12, color: TEXT3, flexShrink: 0, marginLeft: 8 }}>
                  {timeAgo(conv.last_message_at)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: conv.unread_count > 0 ? TEXT : TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: conv.unread_count > 0 ? 500 : 400 }}>
                  {conv.lastMessage}
                </span>
                {conv.unread_count > 0 && (
                  <div style={S.badge}>{conv.unread_count}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHAT VIEW SCREEN ────────────────────────────
function ChatViewScreen({ conversation, onBack }) {
  const [messages, setMessages] = useState(DEMO_MESSAGES[conversation.id] || []);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: `m${Date.now()}`,
      sender_id: "me",
      encrypted_body: input.trim(),
      created_at: new Date().toISOString(),
      status: "sent",
    };
    setMessages(prev => [...prev, newMsg]);
    setInput("");

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: "delivered" } : m));
    }, 1000);

    // Simulate typing + reply
    setTimeout(() => setIsTyping(true), 1500);
    setTimeout(() => {
      setIsTyping(false);
      const replies = ["That's interesting!", "Tell me more 👀", "Nice! 🔥", "Got it!", "Makes sense", "Haha love it"];
      setMessages(prev => [...prev, {
        id: `m${Date.now()}`,
        sender_id: "other",
        encrypted_body: replies[Math.floor(Math.random() * replies.length)],
        created_at: new Date().toISOString(),
        status: "sent",
      }]);
    }, 3000);
  };

  const statusIcon = (status) => {
    if (status === "read") return <Icon name="checkCheck" size={14} color={ACCENT} />;
    if (status === "delivered") return <Icon name="checkCheck" size={14} color={TEXT3} />;
    return <Icon name="check" size={14} color={TEXT3} />;
  };

  const name = conversation.other_user_display_name || conversation.other_user_unique_id;

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={{ ...S.header, gap: 10, padding: "12px 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="back" size={22} color={TEXT} />
        </button>
        <div style={{ position: "relative" }}>
          <div style={S.avatar(40)}>
            {name.charAt(0).toUpperCase()}
          </div>
          {conversation.online && <div style={{ ...S.onlineDot, width: 8, height: 8, border: `2px solid ${BG2}` }} />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{name}</p>
          <p style={{ fontSize: 11, color: conversation.online ? ACCENT : TEXT3 }}>
            {conversation.online ? "online" : `last seen ${timeAgo(conversation.other_user_last_seen)}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: `${ACCENT}10`, borderRadius: 8 }}>
          <Icon name="lock" size={12} color={ACCENT} />
          <span style={{ fontSize: 10, color: ACCENT, fontWeight: 500 }}>E2E</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 4, background: `repeating-linear-gradient(0deg, transparent, transparent 40px, ${BG2}08 40px, ${BG2}08 41px)` }}>
        {/* Encryption notice */}
        <div style={{ textAlign: "center", margin: "0 0 16px", padding: "8px 16px", background: `${ACCENT}08`, borderRadius: 10, alignSelf: "center" }}>
          <span style={{ fontSize: 11, color: ACCENT }}>Messages are end-to-end encrypted. No one outside this chat can read them.</span>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === "me";
          const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

          return (
            <div key={msg.id}>
              {showTime && (
                <div style={{ textAlign: "center", margin: "12px 0 8px" }}>
                  <span style={{ fontSize: 11, color: TEXT3, background: BG3, padding: "3px 10px", borderRadius: 10 }}>{formatTime(msg.created_at)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 2 }}>
                <div style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMe ? ACCENT : BG3,
                  color: isMe ? "#fff" : TEXT,
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}>
                  <span>{msg.encrypted_body}</span>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : TEXT3 }}>{formatTime(msg.created_at)}</span>
                    {isMe && statusIcon(msg.status)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <div style={{ background: BG3, borderRadius: 18, padding: "10px 16px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: TEXT3,
                  animation: `pulse 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${BORDER}`, background: BG2, display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            ref={inputRef}
            style={{ ...S.input, borderRadius: 22, paddingRight: 16, paddingLeft: 16, fontSize: 15, background: BG3, border: `1px solid ${BORDER}` }}
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = BORDER}
          />
        </div>
        <button
          onClick={sendMessage}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: input.trim() ? ACCENT : BG4,
            border: "none", cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
            transform: input.trim() ? "scale(1)" : "scale(0.9)"
          }}
        >
          <Icon name="send" size={18} color={input.trim() ? "#fff" : TEXT3} style={{ marginLeft: -2, marginTop: -1 }} />
        </button>
      </div>
    </div>
  );
}

// ─── NEW CHAT SCREEN ─────────────────────────────
function NewChatScreen({ onBack, onStartChat }) {
  const [targetId, setTargetId] = useState("PRIV-");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!targetId.match(/^PRIV-[A-Z0-9]{8}$/)) return setError("Enter a valid unique ID (e.g., PRIV-7X9K2M4N)");
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const newConv = {
      id: `c${Date.now()}`,
      other_user_unique_id: targetId,
      other_user_display_name: null,
      unread_count: 0,
      last_message_at: new Date().toISOString(),
      other_user_last_seen: new Date().toISOString(),
      lastMessage: "",
      online: Math.random() > 0.5,
    };
    onStartChat(newConv);
  };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="back" size={22} color={TEXT} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>New Conversation</span>
      </div>

      <div style={{ padding: "40px 24px", flex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${ACCENT}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icon name="messageCircle" size={28} color={ACCENT} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Start a secure chat</h2>
          <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.5 }}>Enter the recipient's unique ID to begin an encrypted conversation.</p>
        </div>

        {error && (
          <div style={{ background: "#EF444420", border: `1px solid ${DANGER}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: DANGER, fontSize: 13 }}>{error}</div>
        )}

        <label style={{ fontSize: 13, color: TEXT2, marginBottom: 6, display: "block" }}>Recipient's Unique ID</label>
        <input
          style={{ ...S.input, fontFamily: "'SF Mono', monospace", letterSpacing: 1, fontSize: 18, textAlign: "center", padding: "18px 16px" }}
          value={targetId}
          onChange={e => setTargetId(e.target.value.toUpperCase())}
          placeholder="PRIV-XXXXXXXX"
          maxLength={13}
          onFocus={e => e.target.style.borderColor = ACCENT}
          onBlur={e => e.target.style.borderColor = BORDER}
        />

        <div style={{ background: BG3, borderRadius: 12, padding: "14px 16px", marginTop: 24, display: "flex", gap: 10 }}>
          <Icon name="info" size={16} color={TEXT3} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: TEXT3, lineHeight: 1.5 }}>
            Ask your contact to share their unique ID with you. You can find your own ID in Settings.
          </p>
        </div>

        <button style={{ ...S.btn, marginTop: 32, opacity: loading ? 0.7 : 1 }} onClick={handleStart} disabled={loading}>
          {loading ? "Connecting..." : "Start Encrypted Chat"}
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS SCREEN ─────────────────────────────
function SettingsScreen({ user, onBack, onLogout }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(user.uniqueId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SettingRow = ({ icon, label, sub, onClick, danger }) => (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: onClick ? "pointer" : "default", transition: "background 0.15s" }}
      onMouseOver={e => onClick && (e.currentTarget.style.background = BG2)}
      onMouseOut={e => onClick && (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: danger ? `${DANGER}15` : BG3, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={danger ? DANGER : TEXT2} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: danger ? DANGER : TEXT }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: TEXT3 }}>{sub}</p>}
      </div>
      <Icon name="back" size={16} color={TEXT3} style={{ transform: "rotate(180deg)" }} />
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="back" size={22} color={TEXT} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Settings</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Profile Card */}
        <div style={{ padding: "24px 20px", textAlign: "center", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ ...S.avatar(72), margin: "0 auto 14px", fontSize: 28 }}>
            {(user.displayName || user.uniqueId[5] || "?").charAt(0).toUpperCase()}
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user.displayName || "Anonymous"}</p>
          <div onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: BG3, borderRadius: 10, cursor: "pointer", marginTop: 4, transition: "all 0.2s" }}>
            <span style={{ fontFamily: "monospace", fontSize: 14, color: ACCENT, letterSpacing: 1 }}>{user.uniqueId}</span>
            <Icon name={copied ? "check" : "copy"} size={14} color={copied ? ACCENT : TEXT3} />
          </div>
          {copied && <p style={{ fontSize: 11, color: ACCENT, marginTop: 6 }}>Copied!</p>}
        </div>

        {/* Settings List */}
        <div style={{ padding: "8px 0" }}>
          <p style={{ fontSize: 12, color: TEXT3, padding: "12px 20px 4px", textTransform: "uppercase", letterSpacing: 1 }}>Account</p>
          <SettingRow icon="user" label="Edit Profile" sub="Change display name" />
          <SettingRow icon="key" label="Change Passphrase" sub="Update your master key" />
          <SettingRow icon="shield" label="Privacy & Security" sub="Disappearing messages, blocked users" />
        </div>

        <div style={{ padding: "8px 0", borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 12, color: TEXT3, padding: "12px 20px 4px", textTransform: "uppercase", letterSpacing: 1 }}>About</p>
          <SettingRow icon="info" label="About Privacy Messenger" sub="Version 1.0.0" />
          <SettingRow icon="lock" label="Encryption Info" sub="How your data is protected" />
        </div>

        <div style={{ padding: "8px 0", borderTop: `1px solid ${BORDER}` }}>
          <SettingRow icon="logout" label="Log Out" danger onClick={onLogout} />
        </div>

        <div style={{ textAlign: "center", padding: "20px", color: TEXT3, fontSize: 11 }}>
          <p>Privacy Messenger v1.0.0</p>
          <p style={{ marginTop: 2 }}>Zero Knowledge • E2E Encrypted</p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState(DEMO_CONVERSATIONS);
  const [activeChat, setActiveChat] = useState(null);
  const [prevScreen, setPrevScreen] = useState(null);

  const navigate = (to, data) => {
    setPrevScreen(screen);
    setScreen(to);
    if (data) setActiveChat(data);
  };

  const handleAuth = (userData) => {
    setUser(userData);
    setScreen("chatList");
  };

  const handleNewChat = (conv) => {
    setConversations(prev => [conv, ...prev]);
    setActiveChat(conv);
    setScreen("chat");
  };

  const handleLogout = () => {
    setUser(null);
    setActiveChat(null);
    setScreen("welcome");
  };

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: "#050505", display: "flex", justifyContent: "center" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; background: #050505; -webkit-font-smoothing: antialiased; }
        input::placeholder { color: ${TEXT3}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BG4}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${TEXT3}; }
      `}</style>

      {screen === "welcome" && (
        <WelcomeScreen
          onRegister={() => navigate("register")}
          onLogin={() => navigate("login")}
          onRecover={() => navigate("recover")}
        />
      )}

      {screen === "register" && (
        <RegisterScreen onBack={() => setScreen("welcome")} onSuccess={handleAuth} />
      )}

      {screen === "login" && (
        <LoginScreen onBack={() => setScreen("welcome")} onSuccess={handleAuth} />
      )}

      {screen === "recover" && (
        <LoginScreen onBack={() => setScreen("welcome")} onSuccess={handleAuth} title="Recover Account" />
      )}

      {screen === "chatList" && user && (
        <ChatListScreen
          user={user}
          conversations={conversations}
          onOpenChat={(conv) => navigate("chat", conv)}
          onNewChat={() => navigate("newChat")}
          onSettings={() => navigate("settings")}
        />
      )}

      {screen === "chat" && activeChat && (
        <ChatViewScreen conversation={activeChat} onBack={() => setScreen("chatList")} />
      )}

      {screen === "newChat" && (
        <NewChatScreen onBack={() => setScreen("chatList")} onStartChat={handleNewChat} />
      )}

      {screen === "settings" && user && (
        <SettingsScreen user={user} onBack={() => setScreen("chatList")} onLogout={handleLogout} />
      )}
    </div>
  );
}
