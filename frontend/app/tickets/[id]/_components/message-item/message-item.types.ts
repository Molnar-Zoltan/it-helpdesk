import type { MessageResponse } from "@/lib/api/types";

export interface MessageItemProps {
  message: MessageResponse;
  /** senderId === the viewer's own id. Still the right thing to check for
   * "is this my message" (senderName alone can't distinguish "you" from
   * someone else sharing your exact name), even though senderName now
   * covers everyone else's label — see message-item.tsx's senderLabel. */
  isOwnMessage: boolean;
}
