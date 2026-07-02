import { useEffect, useRef, useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function DatePicker({ value, onChange, placeholder = "DD/MM/YYYY", minDate, maxDate, width = "auto", style = {} }) {
  const selectedValue = normalizeDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedValue ?? new Date());
  const [tempDate, setTempDate] = useState(selectedValue);
  const [popupStyle, setPopupStyle] = useState({});
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const next = normalizeDate(value);
    setTempDate(next);
    if (next) setViewDate(next);
  }, [value]);

  useEffect(() => {
    if (!open || !triggerRef.current || !popupRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const popup = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = trigger.height + 6;
    let nextStyle = { left: 0, right: "auto" };

    if (vw - trigger.right < 290) {
      nextStyle = { right: 0, left: "auto" };
    }
    if (nextStyle.right === 0 && trigger.right - popup.width < 8) {
      nextStyle = { left: trigger.width - popup.width, right: "auto" };
    }
    if (typeof nextStyle.left === "number" && trigger.left + nextStyle.left < 8) {
      nextStyle = { left: -(trigger.left - 8), right: "auto" };
    }
    if (trigger.bottom + popup.height + 6 > vh - 8) {
      top = -(popup.height + 6);
    }

    setPopupStyle({ top, ...nextStyle });
  }, [open]);

  const min = normalizeDate(minDate);
  const max = normalizeDate(maxDate);

  const getDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const days = [];

    for (let index = firstDay - 1; index >= 0; index -= 1) {
      days.push({ day: daysInPrev - index, month: month - 1, year, filler: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push({ day, month, year, filler: false });
    }
    for (let day = 1; days.length < 42; day += 1) {
      days.push({ day, month: month + 1, year, filler: true });
    }
    return days;
  };

  const dateFromCell = (cell) => new Date(cell.year, cell.month, cell.day);
  const isDisabled = (cell) => {
    const date = dateFromCell(cell);
    return (min && date < new Date(min.getFullYear(), min.getMonth(), min.getDate())) ||
      (max && date > new Date(max.getFullYear(), max.getMonth(), max.getDate()));
  };
  const isSelected = (cell) => tempDate &&
    cell.day === tempDate.getDate() &&
    cell.month === tempDate.getMonth() &&
    cell.year === tempDate.getFullYear();
  const isToday = (cell) => {
    const today = new Date();
    return !cell.filler &&
      cell.day === today.getDate() &&
      cell.month === today.getMonth() &&
      cell.year === today.getFullYear();
  };

  const handleDayClick = (cell) => {
    if (isDisabled(cell)) return;
    const date = dateFromCell(cell);
    setTempDate(date);
    if (cell.filler) setViewDate(date);
  };

  const handleOK = () => {
    if (tempDate) onChange(tempDate);
    setOpen(false);
  };

  const handleCancel = () => {
    const next = normalizeDate(value);
    setTempDate(next);
    setOpen(false);
  };

  const triggerStyle = {
    display: "inline-flex",
    alignItems: "center",
    height: "38px",
    border: `1px solid ${open ? "#2563eb" : "#d1d5db"}`,
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    overflow: "hidden",
    minWidth: "150px",
    width,
    boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
    transition: "all 0.15s ease",
    userSelect: "none",
    ...style,
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", width }}>
      <div ref={triggerRef} onClick={() => setOpen((current) => !current)} style={triggerStyle}>
        <div style={{ width: "38px", height: "38px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span style={{ padding: "0 12px", fontSize: "13px", color: tempDate ? "#374151" : "#9ca3af", fontFamily: "inherit", userSelect: "none", whiteSpace: "nowrap" }}>
          {tempDate ? formatDate(tempDate) : placeholder}
        </span>
      </div>

      {open && (
        <div ref={popupRef} style={{ position: "absolute", top: popupStyle.top ?? "calc(100% + 6px)", left: popupStyle.left ?? 0, right: popupStyle.right ?? "auto", zIndex: 99999, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "16px", width: "280px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="picker-icon-button" style={iconButtonStyle} aria-label="Previous month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="picker-icon-button" style={iconButtonStyle} aria-label="Next month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #f3f4f6" }}>
            {DAYS.map((day) => <div key={day} style={{ textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#9ca3af", padding: "4px 0" }}>{day}</div>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {getDays().map((cell, index) => {
              const selected = isSelected(cell);
              const today = isToday(cell);
              const disabled = isDisabled(cell);
              return (
                <button
                  type="button"
                  key={`${cell.year}-${cell.month}-${cell.day}-${index}`}
                  className="date-picker-day"
                  onClick={() => handleDayClick(cell)}
                  disabled={disabled}
                  style={{
                    width: "34px",
                    height: "34px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    fontSize: "13px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontWeight: selected ? 600 : today ? 600 : 400,
                    color: selected ? "#ffffff" : disabled ? "#d1d5db" : cell.filler ? "#d1d5db" : today ? "#2563eb" : "#374151",
                    backgroundColor: selected ? "#2563eb" : "transparent",
                    boxShadow: selected ? "0 2px 8px rgba(37,99,235,0.35)" : "none",
                    border: "none",
                    transition: "all 0.1s ease",
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f3f4f6", gap: "8px" }}>
            <button type="button" onClick={handleCancel} style={footerCancelStyle}>Cancel</button>
            <button type="button" onClick={handleOK} style={footerOkStyle}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

const iconButtonStyle = {
  width: "28px",
  height: "28px",
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

const footerCancelStyle = {
  flex: 1,
  height: "34px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  color: "#374151",
  background: "#ffffff",
  fontFamily: "inherit",
};

const footerOkStyle = {
  flex: 1,
  height: "34px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 500,
  color: "#ffffff",
  background: "#2563eb",
  fontFamily: "inherit",
};
