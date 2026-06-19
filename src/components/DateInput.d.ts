import type { CSSProperties, ReactElement } from "react";

export type DateInputProps = {
  value?: string | number | Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  width?: string;
  style?: CSSProperties;
};

export default function DateInput(props: DateInputProps): ReactElement;
