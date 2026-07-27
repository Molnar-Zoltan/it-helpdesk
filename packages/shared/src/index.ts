export type TicketStatus =
  "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED";

export { containsEmoji } from "./validation/no-emoji";
export { isValidName } from "./validation/name";
