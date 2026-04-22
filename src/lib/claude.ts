import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessageOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

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
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Claude API call timed out after ${TIMEOUT_MS}ms`)),
          TIMEOUT_MS
        )
      );

      // Create API call promise
      const apiPromise = client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Race between timeout and API call
      const response = await Promise.race([apiPromise, timeoutPromise]);

      // Check if response was truncated due to max_tokens
      if (response.stop_reason === 'max_tokens') {
        console.warn(`[Claude] Response truncated at ${maxTokens} tokens (attempt ${attempt}/${MAX_RETRIES})`);
      }

      // Extract text from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on timeout for last attempt
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(
    `Claude API call failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
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
