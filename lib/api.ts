import type { UploadResponse, StoreResponse, ApiError } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface HealthResponse {
  status: string;
  app_name: string;
  environment: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const data: ApiError = await res.json();
    return data.detail || `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  return res.json();
}

export async function storeDocument(documentId: string): Promise<StoreResponse> {
  const res = await fetch(`${API_URL}/store/${documentId}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  return res.json();
}

import type { StreamEvent, SourceChunk, WebSource, SourceType } from "./types";

export interface StreamAskCallbacks {
  onSources?: (
    sources: SourceChunk[],
    webSources: WebSource[],
    sourceType: SourceType,
    hasSufficientContext: boolean
  ) => void;
  onToken?: (token: string) => void;
  onDone?: (providerUsed: string | null) => void;
  onError?: (detail: string) => void;
}

/**
 * Stream a question to the backend and deliver typed events to callbacks.
 *
 * @param documentId  Previously stored document ID.
 * @param question    The user's question text.
 * @param mode        Routing mode — 'auto' (default), 'pdf', or 'web'.
 * @param callbacks   Event handlers for each stream event type.
 */
export async function askQuestionStream(
  documentId: string,
  question: string,
  callbacks: StreamAskCallbacks,
  mode: "auto" | "pdf" | "web" = "auto"
): Promise<void> {
  const res = await fetch(`${API_URL}/ask/${documentId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode }),
  });

  if (!res.ok) {
    const detail = await parseErrorResponse(res);
    callbacks.onError?.(detail);
    return;
  }

  if (!res.body) {
    callbacks.onError?.("No response body received from server.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      let event: StreamEvent;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.type === "sources") {
        const sourceType = event.source_type ?? "pdf";
        // Split sources into PDF chunks vs web sources based on source_type
        if (sourceType === "web") {
          callbacks.onSources?.(
            [],
            event.sources as WebSource[],
            "web",
            event.has_sufficient_context
          );
        } else {
          callbacks.onSources?.(
            event.sources as SourceChunk[],
            [],
            "pdf",
            event.has_sufficient_context
          );
        }
      } else if (event.type === "token") {
        callbacks.onToken?.(event.content);
      } else if (event.type === "done") {
        callbacks.onDone?.(event.provider_used);
      } else if (event.type === "error") {
        callbacks.onError?.(event.detail);
      }
    }
  }
}