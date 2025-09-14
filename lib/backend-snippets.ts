/**
 * BACKEND SNIPPETS - For LangGraph Integration
 * 
 * These are useful snippets from the original backend that might be needed
 * for LangGraph engine integration. They are NOT base code - use as reference only.
 */

import OpenAI from "openai";

// ============================================================================
// SNIPPET: Basic OpenAI client setup
// ============================================================================
export const createOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
    baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/",
  });
};

// ============================================================================
// SNIPPET: Token callback type for streaming
// ============================================================================
export type TokenCallback = (token: string, count: number) => void;

// ============================================================================
// SNIPPET: Basic streaming response handler
// ============================================================================
export const handleStreamingResponse = async (
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  onToken?: TokenCallback
): Promise<string> => {
  let response = "";
  let tokenCount = 0;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      response += content;
      tokenCount++;
      onToken?.(content, tokenCount);
    }
  }

  return response;
};

// ============================================================================
// SNIPPET: Error handling utilities
// ============================================================================
export const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

// ============================================================================
// SNIPPET: Basic prompt interface (if needed for LangGraph nodes)
// ============================================================================
export interface Prompt {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// SNIPPET: Environment configuration
// ============================================================================
export const getEnvConfig = () => ({
  apiUrl: process.env.OPENAI_API_URL || "https://api.openai.com/v1/",
  apiKey: process.env.OPENAI_API_KEY || "",
  model: process.env.OPENAI_MODEL || "gpt-4",
});
