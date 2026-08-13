const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface StreamEvent {
  event: string;
  data: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke backend. Pastikan backend berjalan di port 4000.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as T & ErrorBody) : undefined;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "API_ERROR",
      payload?.error?.message ?? "Request ke backend gagal.",
      payload?.error?.details,
    );
  }

  if (payload === undefined) {
    throw new ApiError(500, "INVALID_RESPONSE", "Backend mengembalikan respons yang tidak valid.");
  }

  return payload;
}

export async function streamApiRequest(
  path: string,
  options: ApiRequestOptions,
  onEvent: (event: StreamEvent) => void,
) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "text/event-stream");

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke backend. Pastikan backend berjalan di port 4000.",
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as ErrorBody | undefined;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "API_ERROR",
      payload?.error?.message ?? "Request ke backend gagal.",
      payload?.error?.details,
    );
  }

  if (!response.body) {
    throw new ApiError(500, "INVALID_RESPONSE", "Backend tidak mengembalikan stream jawaban.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) emitStreamEvent(frame, onEvent);
      if (done) break;
    }

    if (buffer.trim()) emitStreamEvent(buffer, onEvent);
  } finally {
    reader.releaseLock();
  }
}

function emitStreamEvent(frame: string, onEvent: (event: StreamEvent) => void) {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }

  if (dataLines.length === 0) return;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    throw new ApiError(500, "INVALID_RESPONSE", "Format stream backend tidak valid.");
  }

  if (event === "error") {
    const payload = data as ErrorBody["error"];
    throw new ApiError(
      503,
      payload?.code ?? "STREAM_ERROR",
      payload?.message ?? "Jawaban chatbot terputus.",
      payload?.details,
    );
  }

  onEvent({ event, data });
}

export const apiFetcher = <T>(path: string) => apiRequest<T>(path);
