import type { Role } from "@helpdesk/shared";

export interface UserMenuProps {
  firstName: string;
  role: Role;
  onLogout: () => void;
  isLoggingOut?: boolean;
}
