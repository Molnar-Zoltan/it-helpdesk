import type { MessageResponse } from "@/lib/api/types";

export interface MessageItemProps {
  message: MessageResponse;
  /** senderId === the viewer's own id -- the only sender identity the UI
   * can meaningfully show today, since only a ticket's owning customer can
   * view this page (Step 8's agent dashboard is a separate surface). */
  isOwnMessage: boolean;
}
