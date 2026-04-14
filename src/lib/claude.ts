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
const TIMEOUT_MS = 60000; // 60 seconds

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
 * Call Claude with JSON response parsing
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

  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}
