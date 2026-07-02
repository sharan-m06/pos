import type { CSSProperties, ReactElement } from "react";

export type DatePickerProps = {
  value?: string | number | Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  width?: string;
  style?: CSSProperties;
};

export default function DatePicker(props: DatePickerProps): ReactElement;
