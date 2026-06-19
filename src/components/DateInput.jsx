import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

export default function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  minDate,
  maxDate,
  width = "140px",
  style = {},
}) {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const fpRef = useRef(null);

  useEffect(() => {
    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: "d/m/Y",
      defaultDate: value || null,
      minDate: minDate || null,
      maxDate: maxDate || null,
      disableMobile: true,
      position: "below",
      static: false,
      onChange: (selectedDates) => {
        onChange(selectedDates[0] || null);
      },
    });

    return () => {
      if (fpRef.current) fpRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (!fpRef.current) return;
    if (value) {
      fpRef.current.setDate(value, false);
    } else {
      fpRef.current.clear(false);
    }
  }, [value]);

  useEffect(() => {
    if (!fpRef.current) return;
    fpRef.current.set("minDate", minDate || null);
    fpRef.current.set("maxDate", maxDate || null);
  }, [minDate, maxDate]);

  const focusFrame = () => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.borderColor = "#2563eb";
    wrapperRef.current.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
  };

  const blurFrame = () => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.borderColor = "#d1d5db";
    wrapperRef.current.style.boxShadow = "none";
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width,
        height: "36px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        boxSizing: "border-box",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
      onFocus={focusFrame}
      onBlur={blurFrame}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          borderRight: "1px solid #d1d5db",
          flexShrink: 0,
          cursor: "pointer",
          pointerEvents: "none",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      <input
        ref={inputRef}
        placeholder={placeholder}
        readOnly
        style={{
          flex: 1,
          height: "100%",
          border: "none",
          outline: "none",
          padding: "0 10px",
          fontSize: "13px",
          fontFamily: "inherit",
          color: "#374151",
          backgroundColor: "transparent",
          cursor: "pointer",
          caretColor: "transparent",
          minWidth: 0,
        }}
      />
    </div>
  );
}
