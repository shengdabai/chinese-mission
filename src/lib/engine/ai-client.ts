/**
 * AI API client - OpenAI-compatible interface.
 * Supports OpenAI, Claude (via proxy), DeepSeek, and other compatible APIs.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  content: string;
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
): Promise<AIResponse> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey || apiKey === "your-api-key-here") {
    throw new Error("AI_API_KEY not configured");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from AI API");
  }

  return { content };
}

export function parseJSON<T>(raw: string): T {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${cleaned.slice(0, 100)}`);
  }
}

export function isAIConfigured(): boolean {
  const apiKey = process.env.AI_API_KEY;
  return !!apiKey && apiKey !== "your-api-key-here";
}
