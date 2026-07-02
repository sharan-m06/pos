import { useEffect, useRef, useState } from "react";

const pad = (value) => String(value).padStart(2, "0");

function parseTime(value) {
  const [rawHour = "09", rawMinute = "30"] = String(value || "09:30").split(":");
  const hour24 = Number.parseInt(rawHour, 10);
  const minute = Number.parseInt(rawMinute, 10);
  return {
    hour: hour24 % 12 || 12,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 30,
    ampm: hour24 >= 12 ? "PM" : "AM",
  };
}

export default function TimePicker({ value = "09:30", onChange, disabled = false, placeholder = "--:--" }) {
  const parsed = parseTime(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState(parsed.ampm);
  const ref = useRef(null);

  useEffect(() => {
    if (open) return;
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
    setAmpm(next.ampm);
  }, [value, open]);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOK = () => {
    let nextHour = hour;
    if (ampm === "PM" && nextHour !== 12) nextHour += 12;
    if (ampm === "AM" && nextHour === 12) nextHour = 0;
    onChange(`${pad(nextHour)}:${pad(minute)}`);
    setOpen(false);
  };

  const handleCancel = () => {
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
    setAmpm(next.ampm);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-grid", alignContent: "start", verticalAlign: "top" }}>
      <div
        onClick={() => !disabled && setOpen((current) => !current)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: "38px",
          minWidth: "110px",
          border: `1px solid ${open ? "#2563eb" : "#d1d5db"}`,
          borderRadius: "8px",
          cursor: disabled ? "not-allowed" : "pointer",
          overflow: "hidden",
          backgroundColor: disabled ? "#F9FAFB" : "#ffffff",
          boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
          transition: "all 0.15s",
          userSelect: "none",
        }}
      >
        <div style={{ width: "38px", height: "38px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <span style={{ padding: "0 10px", fontSize: "13px", color: value ? "#374151" : "#9ca3af", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {value ? `${pad(hour)}:${pad(minute)} ${ampm}` : placeholder}
        </span>
      </div>

      {open && (
        <div
          role="presentation"
          onClick={handleCancel}
          style={{ position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center", padding: "16px", background: "rgba(15,23,42,0.28)" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select time"
            onClick={(event) => event.stopPropagation()}
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 18px 48px rgba(15,23,42,0.18)", padding: "14px", width: "196px" }}
          >
            <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "12px" }}>Select Time</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "12px" }}>
              <SpinnerColumn label="hour" value={pad(hour)} onUp={() => setHour((current) => current === 12 ? 1 : current + 1)} onDown={() => setHour((current) => current === 1 ? 12 : current - 1)} />
              <span style={{ fontSize: "18px", fontWeight: 600, color: "#374151", marginBottom: "18px" }}>:</span>
              <SpinnerColumn label="min" value={pad(minute)} onUp={() => setMinute((current) => current >= 55 ? 0 : current + 5)} onDown={() => setMinute((current) => current <= 0 ? 55 : current - 5)} />
            </div>
            <div style={{ display: "flex", borderRadius: "7px", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "10px" }}>
              {["AM", "PM"].map((period) => (
                <button key={period} type="button" onClick={() => setAmpm(period)} style={{ flex: 1, height: "32px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit", background: ampm === period ? "#2563eb" : "#ffffff", color: ampm === period ? "#ffffff" : "#6b7280", transition: "all 0.15s" }}>{period}</button>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: "12px", color: "#374151", marginBottom: "10px", fontWeight: 500 }}>{pad(hour)}:{pad(minute)} {ampm}</div>
            <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f3f4f6", paddingTop: "10px" }}>
              <button type="button" onClick={handleCancel} style={cancelButtonStyle}>Cancel</button>
              <button type="button" onClick={handleOK} style={okButtonStyle}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpinnerColumn({ label, value, onUp, onDown }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <button type="button" onClick={onUp} style={arrowButtonStyle}><Chevron up /></button>
      <div style={spinnerBoxStyle}>{value}</div>
      <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 500, textTransform: "uppercase" }}>{label}</div>
      <button type="button" onClick={onDown} style={arrowButtonStyle}><Chevron /></button>
    </div>
  );
}

function Chevron({ up = false }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={up ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
    </svg>
  );
}

const arrowButtonStyle = {
  width: "24px",
  height: "24px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ffffff",
  color: "#6b7280",
  padding: 0,
};

const spinnerBoxStyle = {
  width: "40px",
  height: "36px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 600,
  color: "#111827",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f8fafc",
};

const cancelButtonStyle = {
  flex: 1,
  height: "32px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
  color: "#374151",
  background: "#ffffff",
  fontFamily: "inherit",
};

const okButtonStyle = {
  flex: 1,
  height: "32px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 500,
  color: "#ffffff",
  background: "#2563eb",
  fontFamily: "inherit",
};
