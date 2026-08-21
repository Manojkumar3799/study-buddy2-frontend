"use client";

import { useState, useRef, useEffect } from "react";
import { askQuestionStream } from "@/lib/api";
import type { ChatMessage, WebSource } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

interface ChatInterfaceProps {
  documentId: string;
  documentName: string;
}

export default function ChatInterface({ documentId, documentName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

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

    const token = session?.access_token;

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
      "auto", // default mode — LLM decides
      token
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* Header */}
      <div className="border-b border-slate-800/80 px-5 py-4">
        <p className="font-semibold text-slate-200">{documentName}</p>
        <p className="text-xs text-slate-500">
          Ask anything — answers come from your PDF or live web research
        </p>
      </div>

      {/* Messages */}
      <div className="flex h-96 flex-col gap-4 overflow-y-auto px-5 py-5 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 && (
          <p className="my-auto text-center text-sm text-slate-500">
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
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600/85 text-slate-100 border border-indigo-500/20"
                  : "bg-slate-950/60 text-slate-200 border border-slate-850/60"
              }`}
            >
              {msg.content || (msg.isStreaming ? "..." : "")}
              {msg.isStreaming && msg.content && (
                <span className="ml-1 inline-block h-3.5 w-1 animate-pulse bg-indigo-400" />
              )}
            </div>

            {/* Source badges — shown only on assistant messages after streaming finishes */}
            {msg.role === "assistant" && !msg.isStreaming && msg.hasSufficientContext && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">

                {/* ---- PDF source label + page badges ---- */}
                {msg.sourceType === "pdf" && msg.sources && msg.sources.length > 0 && (
                  <>
                    <span className="flex items-center gap-1 rounded-full bg-indigo-950/60 border border-indigo-800/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                      📄 PDF Context
                    </span>
                    {msg.sources.map((s) => (
                      <span
                        key={s.chunk_id}
                        className="rounded-full bg-slate-950/40 border border-slate-850 px-2 py-0.5 text-[10px] text-slate-400"
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
                    <span className="flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-800/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      🔬 Web Research
                    </span>
                    <div className="mt-1.5 flex w-full flex-col gap-1">
                      {msg.webSources.map((ws: WebSource, idx: number) => (
                        <a
                          key={idx}
                          href={ws.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-baseline gap-1.5 rounded-lg border border-emerald-900/30 bg-slate-950/40 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-950/20 transition-all"
                        >
                          <span className="truncate font-medium text-slate-300">
                            {ws.title}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
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
      <div className="flex gap-2 border-t border-slate-850 p-4 bg-slate-950/20">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the document, or search the web…"
          rows={1}
          disabled={isAsking}
          className="flex-1 resize-none rounded-xl border border-slate-850 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleAsk}
          disabled={isAsking || !input.trim()}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
        >
          {isAsking ? "Asking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}