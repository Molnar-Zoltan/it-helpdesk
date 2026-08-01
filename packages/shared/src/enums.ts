// Mirrors backend/prisma/schema.prisma's Role, TicketStatus, and
// TicketPriority enums. Duplicated here as plain string unions rather than
// imported, since shared can't depend on the backend's generated Prisma
// client — these are the values, not the source of truth for them.
export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
