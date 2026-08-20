export interface UploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  size_bytes: number;
  message: string;
}

export interface StoreResponse {
  document_id: string;
  total_chunks_stored: number;
  embedding_dimension: number;
  processing_time_seconds: number;
  message: string;
}

export interface ApiError {
  error: string;
  detail: string;
}

/** A single PDF chunk used as context (source_type='pdf'). */
export interface SourceChunk {
  chunk_id: number;
  text: string;
  start_page: number;
  end_page: number;
  score: number;
}

/** A single web search result used as context (source_type='web'). */
export interface WebSource {
  title: string;
  url: string;
  domain: string;
}

/** Source type discriminator — aligns with the backend source_type field. */
export type SourceType = "pdf" | "web";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Which answering strategy produced this message. */
  sourceType?: SourceType;
  /** PDF chunk sources (present when sourceType === 'pdf'). */
  sources?: SourceChunk[];
  /** Web research sources (present when sourceType === 'web'). */
  webSources?: WebSource[];
  hasSufficientContext?: boolean;
  isStreaming?: boolean;
}

export type StreamEvent =
  | {
      type: "sources";
      source_type: SourceType;
      /** PDF chunks when source_type='pdf'; web source objects when source_type='web'. */
      sources: (SourceChunk | WebSource)[];
      has_sufficient_context: boolean;
    }
  | { type: "token"; content: string }
  | { type: "done"; provider_used: string | null }
  | { type: "error"; error: string; detail: string };