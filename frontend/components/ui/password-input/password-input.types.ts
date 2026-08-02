import type { InputProps } from "@/components/ui/input";

/** Same as InputProps, minus `type` — PasswordInput controls that itself
 * via its internal show/hide toggle. */
export type PasswordInputProps = Omit<InputProps, "type">;
