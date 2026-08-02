import type { ReactNode } from "react";

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Render prop so FormField stays control-agnostic (Input, TextArea, custom selects, ...). */
  children: (fieldProps: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}
