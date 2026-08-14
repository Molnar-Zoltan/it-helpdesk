import { FunctionDeclaration } from '@google/genai';
import {
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
} from '@helpdesk/shared';
import { CREATE_TICKET_TOOL_NAME } from '../../common/constants/ai.constants';

/**
 * Step 10.3's tool schema. `title`/`description`/`priority` intentionally
 * match CreateTicketDto's fields one-for-one (see ai.service.ts, which
 * routes a successful call's args through that exact same DTO +
 * TicketsService.create() the manual form uses) -- this is a second
 * producer of the same contract, not a second contract, per
 * architecture.md's "Ticket creation flow" section.
 *
 * Plain JSON Schema via `parametersJsonSchema` rather than the SDK's
 * `Schema`/`Type` types -- simpler to keep in sync with the shared
 * validation constants above without an extra layer of SDK-specific enum
 * wrapping.
 */
export const CREATE_TICKET_FUNCTION_DECLARATION: FunctionDeclaration = {
  name: CREATE_TICKET_TOOL_NAME,
  description:
    "Files a new IT helpdesk support ticket on the customer's behalf. Only call this once a clear title and a detailed description of the issue have been gathered through conversation -- never with guessed or incomplete details.",
  parametersJsonSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: `A concise summary of the issue, ${TICKET_TITLE_MIN_LENGTH}-${TICKET_TITLE_MAX_LENGTH} characters.`,
      },
      description: {
        type: 'string',
        description: `A detailed description of the issue -- what's happening, when it started, any error messages, what's already been tried -- ${TICKET_DESCRIPTION_MIN_LENGTH}-${TICKET_DESCRIPTION_MAX_LENGTH} characters.`,
      },
      priority: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        description:
          'Optional. Only set this if the urgency is clearly stated or obviously implied by the customer; omit it otherwise and it will default to MEDIUM.',
      },
    },
    required: ['title', 'description'],
  },
};
