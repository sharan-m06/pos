import React, { useRef } from "react";

type TimeInputProps = {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function TimeInput({ value, onChange, placeholder = "--:--", disabled = false }: TimeInputProps) {
  const pickerRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    if (disabled) return;
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
    } else {
      picker.focus();
      picker.click();
    }
  }

  return (
    <span className={`time-input-wrap ${disabled ? "disabled" : ""}`}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{2}:[0-9]{2}"
        maxLength={5}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Time in HH:MM format"
      />
      <button type="button" className="time-picker-button" onClick={openPicker} disabled={disabled} aria-label="Open time picker">
        ▾
      </button>
      <input
        ref={pickerRef}
        className="native-time-picker"
        type="time"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  );
}
