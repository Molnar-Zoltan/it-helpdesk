import type { DemoUser, DemoTicket, DemoMessage } from './types';

// Single source of truth for the demo dataset, consumed by:
//  - backend/prisma/seed.ts, which inserts these rows (with a real bcrypt
//    hash of DEMO_PASSWORD) into Postgres on `prisma db seed`
//  - the frontend's planned MSW offline-mode handlers (not built yet —
//    see Roadmap step 5+), which will serve these directly as mock API
//    responses when the real backend is unreachable
//
// IDs are fixed strings rather than Prisma's auto-generated cuid()s so
// both consumers agree on the same identifiers for the same records.

/** Demo password shared by all three seed accounts (see README). Never
 * hashed here — hashing is a backend-only concern (see seed.ts); MSW's
 * future fake-login handler can compare against this directly. */
export const DEMO_PASSWORD = 'password123';

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-admin',
    email: 'admin@helpdesk.dev',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  },
  {
    id: 'demo-agent',
    email: 'agent@helpdesk.dev',
    firstName: 'Agent',
    lastName: 'Smith',
    role: 'AGENT',
  },
  {
    id: 'demo-customer',
    email: 'customer@helpdesk.dev',
    firstName: 'Casey',
    lastName: 'Customer',
    role: 'CUSTOMER',
  },
];

const CUSTOMER_ID = 'demo-customer';
const AGENT_ID = 'demo-agent';

// Spans all four statuses and a mix of priorities so pagination/sorting
// (GET /tickets?sortBy=status|priority&...) has something real to sort.
// createdDaysAgo is set so the default sort (createdAt desc) tells a
// coherent story: open/urgent tickets read as recent, closed ones as old.
export const DEMO_TICKETS: DemoTicket[] = [
  {
    id: 'demo-ticket-1',
    title: 'Cannot log into VPN',
    description: 'Getting a timeout error since this morning.',
    status: 'OPEN',
    priority: 'HIGH',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 2,
  },
  {
    id: 'demo-ticket-2',
    title: "Laptop won't power on",
    description:
      'No response to the power button, tried a different outlet already.',
    status: 'OPEN',
    priority: 'URGENT',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 1,
  },
  {
    id: 'demo-ticket-3',
    title: 'Need software license renewal',
    description:
      'Design tool license expires end of month, requesting renewal.',
    status: 'OPEN',
    priority: 'LOW',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 3,
  },
  {
    id: 'demo-ticket-4',
    title: 'Printer offline on 3rd floor',
    description:
      'Shared printer shows offline in every app, restarted twice already.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 6,
  },
  {
    id: 'demo-ticket-5',
    title: 'Email sync failing on mobile',
    description:
      'Mobile client stopped syncing new mail as of yesterday afternoon.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 5,
  },
  {
    id: 'demo-ticket-6',
    title: 'Password reset for shared drive',
    description:
      'Locked out of the shared drive after a password policy change.',
    status: 'RESOLVED',
    priority: 'LOW',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 12,
  },
  {
    id: 'demo-ticket-7',
    title: 'Monitor flickering intermittently',
    description:
      'External monitor flickers a few times an hour, cable already reseated.',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 10,
  },
  {
    id: 'demo-ticket-8',
    title: 'Onboarding laptop setup',
    description: 'Initial laptop imaging and account setup for a new starter.',
    status: 'CLOSED',
    priority: 'MEDIUM',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 25,
    closeReason: 'Setup completed and verified with the new starter.',
    closedDaysAgo: 24,
    closedBy: CUSTOMER_ID,
  },
  {
    id: 'demo-ticket-9',
    title: 'Access request for archived project',
    description:
      'Requesting read access to an archived project folder for a retro.',
    status: 'CLOSED',
    priority: 'LOW',
    customerId: CUSTOMER_ID,
    agentId: AGENT_ID,
    createdDaysAgo: 20,
    closeReason: 'Access granted, confirmed working by requester.',
    closedDaysAgo: 19,
    closedBy: CUSTOMER_ID,
  },
];

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: 'demo-message-1',
    ticketId: 'demo-ticket-1',
    senderId: CUSTOMER_ID,
    content: 'Any update on this?',
    isAiGenerated: false,
    createdDaysAgo: 1,
  },
];
