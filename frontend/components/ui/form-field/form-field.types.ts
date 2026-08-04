import type { ReactNode } from "react";

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /**
   * When true and `error` is set, the error text is kept in the DOM (still
   * linked via aria-describedby, still announced to screen readers) but
   * visually hidden. For a field whose validation is already fully
   * represented by an adjacent live checklist (e.g. password strength) —
   * so sighted users aren't shown the same information twice, while
   * screen reader users still get it.
   */
  hideVisibleError?: boolean;
  /** Render prop so FormField stays control-agnostic (Input, TextArea, custom selects, ...). */
  children: (fieldProps: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}
