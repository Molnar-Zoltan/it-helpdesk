export interface MessageComposerProps {
  ticketId: string;
  /** Ticket status is CLOSED -- disables the field instead of hiding it, so
   * it's clear posting is still possible after a reopen rather than looking
   * like the thread is permanently done. */
  disabled: boolean;
}
