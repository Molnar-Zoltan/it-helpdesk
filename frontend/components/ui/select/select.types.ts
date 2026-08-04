import { type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}
