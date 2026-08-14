import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateTicketDto } from '../tickets/dto/create-ticket.dto';
import { RateLimitService } from '../common/services/rate-limit.service';
import { GeminiClient } from './gemini/gemini.client';
import { CREATE_TICKET_FUNCTION_DECLARATION } from './gemini/create-ticket.tool';
import { GeminiUnavailableException } from './exceptions/gemini-unavailable.exception';
import { buildAiUsageKey } from './ai-usage-key.util';
import {
  AI_CHAT_SYSTEM_INSTRUCTION,
  AI_DAILY_LIMIT,
  CREATE_TICKET_TOOL_NAME,
} from '../common/constants/ai.constants';
import { AI_CHAT_ROLES } from '@helpdesk/shared';
import type { AiChatResponse, AiUsageResponse } from '@helpdesk/shared';
import type { AiChatMessageDto } from './dto/ai-chat.dto';

@Injectable()
export class AiService {
  constructor(
    private gemini: GeminiClient,
    private ticketsService: TicketsService,
    private prisma: PrismaService,
    private rateLimit: RateLimitService,
  ) {}

  /**
   * Step 10.3's tool-calling flow. Stateless: the full transcript is
   * passed in on every call (see AiChatRequestDto), nothing is read from
   * or written to persistence unless create_ticket actually fires (Step
   * 10.4) -- a conversation that never results in a ticket leaves no
   * trace, which is the point of not having a conversation table.
   */
  async chat(
    userId: string,
    messages: AiChatMessageDto[],
  ): Promise<AiChatResponse> {
    let turn;
    try {
      turn = await this.gemini.generateTurn(
        messages.map((message) => ({
          role: message.role,
          text: message.content,
        })),
        AI_CHAT_SYSTEM_INSTRUCTION,
        [CREATE_TICKET_FUNCTION_DECLARATION],
      );
    } catch {
      throw new GeminiUnavailableException();
    }

    const call = turn.functionCalls?.find(
      (functionCall) => functionCall.name === CREATE_TICKET_TOOL_NAME,
    );

    if (!call) {
      // No tool call -- Gemini is still gathering detail (or asking a
      // clarifying question). A response with neither text nor a function
      // call is itself a failure mode, not a valid "nothing to say" state.
      if (!turn.text) {
        throw new GeminiUnavailableException();
      }
      return { type: 'message', content: turn.text };
    }

    // Malformed tool call (missing/invalid title, description, or
    // priority) is a model mistake, not a user error -- surfaced back into
    // the chat as a plain message asking to continue, rather than a hard
    // HTTP error the frontend would have to special-case.
    const dto = this.toCreateTicketDto(call.args);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return {
        type: 'message',
        content:
          "Sorry, I wasn't able to file that ticket with the details gathered so far -- could you clarify the issue a bit more?",
      };
    }

    const ticket = await this.ticketsService.create(userId, dto);
    await this.persistConversation(ticket.id, userId, messages, turn.text);

    return {
      type: 'ticket_created',
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        customerId: ticket.customerId,
        agentId: ticket.agentId,
      },
    };
  }

  /** Current usage against today's cap, for the frontend's "X of Y used
   * today" display (Step 10.6.3) -- read-only, doesn't touch the counter. */
  async getUsage(userId: string): Promise<AiUsageResponse> {
    const used = await this.rateLimit.getCount(buildAiUsageKey(userId));
    return { used, limit: AI_DAILY_LIMIT };
  }

  /**
   * Normalizes Gemini's raw function-call args into a CreateTicketDto
   * instance so the *same* class-validator rules CreateTicketDto already
   * enforces for the manual form apply here too -- no parallel validation
   * path (see architecture.md's "Ticket creation flow"). The only
   * normalization applied before validation is uppercasing `priority`,
   * since the tool schema declares it as an uppercase enum but a model
   * can't be relied on to always match casing exactly; everything else is
   * validated as the model produced it.
   */
  private toCreateTicketDto(args: Record<string, unknown>): CreateTicketDto {
    const normalized = { ...args };
    if (typeof normalized.priority === 'string') {
      normalized.priority = normalized.priority.toUpperCase();
    }
    return plainToInstance(CreateTicketDto, normalized);
  }

  /**
   * Step 10.4: writes the chat transcript as Message rows on the ticket
   * that just got created, so agents can see the original exchange
   * without a separate conversation table (architecture.md). Only ever
   * called once create_ticket has fired -- a conversation that doesn't
   * end in a ticket is never persisted anywhere.
   *
   * Sequential creates inside a transaction (not createMany) to preserve
   * conversation order reliably: getMessages() sorts by createdAt, and a
   * batch insert risks several rows landing on the same timestamp.
   */
  private async persistConversation(
    ticketId: string,
    userId: string,
    messages: AiChatMessageDto[],
    closingText: string | undefined,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const message of messages) {
        await tx.message.create({
          data: {
            ticketId,
            content: message.content,
            isAiGenerated: message.role === AI_CHAT_ROLES.MODEL,
            senderId: message.role === AI_CHAT_ROLES.USER ? userId : null,
          },
        });
      }
      if (closingText) {
        await tx.message.create({
          data: {
            ticketId,
            content: closingText,
            isAiGenerated: true,
            senderId: null,
          },
        });
      }
    });
  }
}
