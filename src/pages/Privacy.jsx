import { useEffect } from "react";

const ACCENT = "#10B981";
const ACCENT_DIM = "#065F46";
const BG = "#0A0A0A";
const BG2 = "#111111";
const BG3 = "#1A1A1A";
const TEXT = "#F0F0F0";
const TEXT2 = "#9CA3AF";
const TEXT3 = "#6B7280";
const BORDER = "#2A2A2A";

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: TEXT, letterSpacing: "-0.2px" }}>
        {title}
      </h2>
      <div style={{ color: TEXT2, fontSize: 15, lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}

function DataRow({ label, value, accent }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      padding: "12px 16px",
      background: BG3,
      borderRadius: 10,
      border: `1px solid ${BORDER}`,
      marginBottom: 8,
    }}>
      <span style={{ fontSize: 13, color: TEXT3, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: accent ? ACCENT : TEXT, textAlign: "right", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy — Privacy Messenger";
  }, []);

  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: BG,
      color: TEXT,
      fontFamily: FONT,
      padding: "0 0 80px",
      WebkitFontSmoothing: "antialiased",
    }}>
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: `${BG2}EE`,
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${BORDER}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <button
          onClick={goHome}
          style={{
            background: "none",
            border: "none",
            color: TEXT,
            fontSize: 14,
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseOver={e => (e.currentTarget.style.background = BG3)}
          onMouseOut={e => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DIM})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 24px ${ACCENT}33`,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 12, color: ACCENT, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>
              Privacy Messenger
            </p>
            <p style={{ fontSize: 12, color: TEXT3 }}>by Morven Empire</p>
          </div>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 700, marginTop: 16, letterSpacing: "-1px", lineHeight: 1.1 }}>
          Privacy Policy
        </h1>
        <p style={{ color: TEXT3, fontSize: 14, marginTop: 12 }}>
          Last updated: April 2026
        </p>

        <div style={{
          marginTop: 32,
          padding: "16px 18px",
          background: `${ACCENT}10`,
          border: `1px solid ${ACCENT}30`,
          borderRadius: 12,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" style={{ flexShrink: 0, marginTop: 2 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.55 }}>
            Privacy Messenger is built so we cannot read your messages. Your conversations are end-to-end encrypted on your device — we only ever see ciphertext.
          </p>
        </div>

        <Section title="At a glance">
          <DataRow label="App" value="Privacy Messenger" />
          <DataRow label="Developer" value="Morven Empire" />
          <DataRow label="Contact" value="howtodoprogramming@gmail.com" accent />
          <DataRow label="Data collected" value="Email address only" />
          <DataRow label="Message storage" value="End-to-end encrypted" />
          <DataRow label="Data sharing" value="None" />
        </Section>

        <Section title="What we collect">
          <p>
            We collect only the information necessary to operate the service: your <strong style={{ color: TEXT }}>email address</strong>, used for account recovery and essential service notifications. We do not require a phone number, real name, or any other personally identifying information.
          </p>
        </Section>

        <Section title="Your messages">
          <p>
            All messages sent through Privacy Messenger are <strong style={{ color: TEXT }}>end-to-end encrypted</strong>. Encryption and decryption happen entirely on your device using keys we never see. The content of your messages is not readable by us, our servers, our staff, or any third party — including in the event of a legal request.
          </p>
        </Section>

        <Section title="How we share data">
          <p>
            We do not sell, rent, or share your personal data with anyone. We do not run advertising and we do not run analytics that profile you. The only time we transmit your information is when it is required to deliver an encrypted message to its recipient.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            You can delete your account at any time from within the app. When you do, we permanently remove your account record, your encrypted message blobs from our servers, and your email address from our systems. Deletion is immediate and cannot be undone.
          </p>
        </Section>

        <Section title="Data security">
          <p>
            We use industry-standard transport security (TLS) for all connections, and message payloads are additionally protected by end-to-end encryption applied on your device before transmission. We hold no decryption keys for your conversations.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            Privacy Messenger is not directed at children under 13, and we do not knowingly collect information from children under 13. If you believe a child has provided us with information, contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes to this policy, we will update the "Last updated" date above and, where appropriate, notify you within the app. Continued use of Privacy Messenger after changes take effect means you accept the revised policy.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions, requests, or concerns? Email us at{" "}
            <a
              href="mailto:howtodoprogramming@gmail.com"
              style={{ color: ACCENT, textDecoration: "none", borderBottom: `1px solid ${ACCENT}40` }}
            >
              howtodoprogramming@gmail.com
            </a>
            . We respond to every message we can read — and we promise we still can't read the encrypted ones.
          </p>
        </Section>

        <footer style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${BORDER}`,
          textAlign: "center",
          color: TEXT3,
          fontSize: 12,
        }}>
          <p>© {new Date().getFullYear()} Morven Empire. All rights reserved.</p>
          <p style={{ marginTop: 4 }}>Privacy Messenger • Zero Knowledge • E2E Encrypted</p>
        </footer>
      </main>
    </div>
  );
}
