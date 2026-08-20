"use client";

import { useState, useRef, useEffect } from "react";
import { askQuestionStream } from "@/lib/api";
import type { ChatMessage, WebSource } from "@/lib/types";

interface ChatInterfaceProps {
  documentId: string;
  documentName: string;
}

export default function ChatInterface({ documentId, documentName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async () => {
    const question = input.trim();
    if (!question || isAsking) return;

    setInput("");
    setIsAsking(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", isStreaming: true },
    ]);

    await askQuestionStream(
      documentId,
      question,
      {
        onSources: (sources, webSources, sourceType, hasSufficientContext) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              sourceType,
              sources,
              webSources,
              hasSufficientContext,
            };
            return updated;
          });
        },
        onToken: (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + token,
            };
            return updated;
          });
        },
        onDone: () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, isStreaming: false };
            return updated;
          });
          setIsAsking(false);
        },
        onError: (detail) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content || `Error: ${detail}`,
              isStreaming: false,
            };
            return updated;
          });
          setIsAsking(false);
        },
      },
      "auto" // default mode — LLM decides
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="flex w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="font-medium text-slate-800">{documentName}</p>
        <p className="text-xs text-slate-500">
          Ask anything — answers come from your PDF or live web research
        </p>
      </div>

      {/* Messages */}
      <div className="flex h-96 flex-col gap-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            No questions yet — ask something below.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {msg.content || (msg.isStreaming ? "..." : "")}
              {msg.isStreaming && msg.content && (
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500" />
              )}
            </div>

            {/* Source badges — shown only on assistant messages after streaming finishes */}
            {msg.role === "assistant" && !msg.isStreaming && msg.hasSufficientContext && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">

                {/* ---- PDF source label + page badges ---- */}
                {msg.sourceType === "pdf" && msg.sources && msg.sources.length > 0 && (
                  <>
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      📄 PDF
                    </span>
                    {msg.sources.map((s) => (
                      <span
                        key={s.chunk_id}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                      >
                        {s.start_page === s.end_page
                          ? `page ${s.start_page}`
                          : `pages ${s.start_page}–${s.end_page}`}
                      </span>
                    ))}
                  </>
                )}

                {/* ---- Web source label + clickable links ---- */}
                {msg.sourceType === "web" && msg.webSources && msg.webSources.length > 0 && (
                  <>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      🔬 Web Research
                    </span>
                    <div className="mt-1 flex w-full flex-col gap-1">
                      {msg.webSources.map((ws: WebSource, idx: number) => (
                        <a
                          key={idx}
                          href={ws.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-baseline gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs transition-colors hover:bg-emerald-100"
                        >
                          <span className="truncate font-medium text-emerald-800">
                            {ws.title}
                          </span>
                          <span className="ml-auto shrink-0 text-emerald-500">
                            {ws.domain}
                          </span>
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 border-t border-slate-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the document, or search the web…"
          rows={1}
          disabled={isAsking}
          className="flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
        />
        <button
          onClick={handleAsk}
          disabled={isAsking || !input.trim()}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isAsking ? "Asking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}