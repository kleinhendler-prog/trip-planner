import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessageOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Override the model. Defaults to the fast model the small helper routes use. */
  model?: string;
  /** Total budget for this call *including* retries — not per attempt. */
  timeoutMs?: number;
  maxRetries?: number;
  /** Reasoning depth. Only sent to models that support it (see ADAPTIVE_THINKING_MODELS). */
  effort?: 'low' | 'medium' | 'high' | 'max';
}

/** Fast + cheap: used by nearby, swap-activity, reflect, inbound-email. */
const DEFAULT_MODEL = 'claude-haiku-4-5';

/**
 * Models that use adaptive thinking. They reject `temperature` with a 400 and
 * take an `effort` level instead, so those two options are mutually exclusive.
 */
const ADAPTIVE_THINKING_MODELS = new Set([
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-sonnet-5',
]);

const MAX_RETRIES = 3;
const TIMEOUT_MS = 90000; // 90 seconds

/**
 * Call Claude API with retry logic and timeout
 */
export async function callClaude(
  prompt: string,
  options: ClaudeMessageOptions = {}
): Promise<string> {
  const {
    system,
    maxTokens = 4096,
    temperature = 0.7,
    model = DEFAULT_MODEL,
    timeoutMs = TIMEOUT_MS,
    maxRetries = MAX_RETRIES,
    effort = 'medium',
  } = options;

  const adaptive = ADAPTIVE_THINKING_MODELS.has(model);

  // The whole call (all attempts) must finish inside the caller's budget, so the
  // serverless function can't die mid-retry and leave the trip stuck.
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;

    let timedOut = false;

    try {
      // Streaming avoids the HTTP timeouts that non-streaming requests hit at
      // high max_tokens; .finalMessage() still gives us the whole response.
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        system,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        // Adaptive-thinking models reject temperature; older ones reject effort.
        ...(adaptive
          ? { thinking: { type: 'adaptive' as const }, output_config: { effort } }
          : { temperature }),
      });

      const timer = setTimeout(() => {
        timedOut = true;
        stream.abort();
      }, remainingMs);

      let response;
      try {
        response = await stream.finalMessage();
      } finally {
        clearTimeout(timer);
      }

      // Check if response was truncated due to max_tokens
      if (response.stop_reason === 'max_tokens') {
        console.warn(`[Claude] Response truncated at ${maxTokens} tokens (attempt ${attempt}/${maxRetries})`);
      }

      // Extract text from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error) {
      lastError = timedOut
        ? new Error(`Claude API call ran out of time (${timeoutMs}ms budget)`)
        : (error as Error);

      // Out of budget, or out of attempts — either way, stop here.
      if (timedOut || attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s — but never past the deadline.
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      if (Date.now() + backoffMs >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(
    `Claude API call failed (model ${model}): ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces
 */
function repairTruncatedJSON(text: string): string {
  // Try parsing as-is first
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue to repair
  }

  // Remove any trailing incomplete string value (cut mid-string)
  let repaired = text.replace(/,\s*"[^"]*$/, '');  // trailing incomplete key
  repaired = repaired.replace(/:\s*"[^"]*$/, ': ""'); // trailing incomplete value

  // Count open brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const char of repaired) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
  }

  // If we're inside a string, close it
  if (inString) {
    repaired += '"';
  }

  // Remove trailing comma before we close
  repaired = repaired.replace(/,\s*$/, '');

  // Close all open brackets and braces
  for (let i = 0; i < openBrackets; i++) repaired += ']';
  for (let i = 0; i < openBraces; i++) repaired += '}';

  return repaired;
}

/**
 * Call Claude with JSON response parsing and truncation repair
 */
export async function callClaudeJSON<T = Record<string, unknown>>(
  prompt: string,
  options: ClaudeMessageOptions = {}
): Promise<T> {
  const systemPrompt =
    options.system ||
    'You are a helpful assistant. Return valid JSON only.';

  const response = await callClaude(prompt, {
    ...options,
    system: systemPrompt,
  });

  // Extract JSON from response (in case there's extra text)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  // Try parsing directly first
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (directError) {
    // Try repairing truncated JSON
    console.warn('[Claude] Direct JSON parse failed, attempting repair...');
    try {
      const repaired = repairTruncatedJSON(jsonMatch[0]);
      const result = JSON.parse(repaired) as T;
      console.log('[Claude] JSON repair successful');
      return result;
    } catch (repairError) {
      throw new Error(
        `Failed to parse JSON response (even after repair attempt): ${directError instanceof Error ? directError.message : String(directError)}`
      );
    }
  }
}
