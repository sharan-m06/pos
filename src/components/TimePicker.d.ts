import type { ReactElement } from "react";

export type TimePickerProps = {
  value?: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function TimePicker(props: TimePickerProps): ReactElement;
