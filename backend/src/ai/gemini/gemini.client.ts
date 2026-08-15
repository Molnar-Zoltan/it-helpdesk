import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, FunctionDeclaration } from '@google/genai';
import { requireEnv } from '../../auth/token.util';
import {
  GEMINI_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
} from '../../common/constants/ai.constants';

export interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiTurnResult {
  text?: string;
  functionCalls?: GeminiFunctionCall[];
}

/**
 * Thin wrapper around @google/genai (the current unified Gemini SDK),
 * mirroring TurnstileService's shape: a single-purpose service around one
 * external API, with the same abort-on-timeout pattern (an AbortController
 * tied to a setTimeout, passed as `abortSignal`) rather than relying on
 * the SDK's own `httpOptions.timeout`, which is unreliable for
 * generateContent as of the SDK version this project pins (see
 * googleapis/js-genai#1277).
 *
 * The GoogleGenAI client itself is constructed lazily on first use, not in
 * a constructor/onModuleInit -- there's no persistent connection to open
 * (each call is a plain HTTPS request, unlike RedisService's TCP client),
 * so there's nothing to gain from eager construction, and lazy
 * construction means a missing GEMINI_API_KEY only surfaces when the AI
 * feature is actually used, not at boot.
 */
@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
    }
    return this.client;
  }

  /**
   * Runs a single chat turn: the full message transcript in, either the
   * model's reply text or a tool call (or both -- Gemini can emit
   * explanatory text alongside a function call) out. Stateless by design,
   * matching Step 10.4's decision that the backend holds no conversation
   * state -- the caller (AiService) passes the whole transcript on every
   * call.
   */
  async generateTurn(
    messages: GeminiMessage[],
    systemInstruction: string,
    tools: FunctionDeclaration[],
  ): Promise<GeminiTurnResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GEMINI_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await this.getClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: messages.map((message) => ({
          role: message.role,
          parts: [{ text: message.text }],
        })),
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: tools }],
          abortSignal: controller.signal,
        },
      });

      return {
        text: response.text,
        functionCalls: response.functionCalls?.map((call) => ({
          name: call.name ?? '',
          args: call.args ?? {},
        })),
      };
    } catch (err) {
      this.logger.warn(`Gemini request failed: ${(err as Error).message}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
