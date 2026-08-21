"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkHealth, type HealthResponse } from "@/lib/api";
import UploadForm from "@/components/UploadForm";
import ChatInterface from "@/components/ChatInterface";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "studyforge_document";

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  // Health check and session check
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    checkHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { id, name } = JSON.parse(saved);
      setDocumentId(id);
      setDocumentName(name);
    }
  }, [user, loading, router]);

  const handleDocumentReady = (id: string, name: string) => {
    setDocumentId(id);
    setDocumentName(name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));
  };

  const handleNewDocument = () => {
    setDocumentId(null);
    setDocumentName(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 text-slate-100 p-4 py-8 md:py-12">
      {/* Top Header */}
      <header className="flex w-full max-w-2xl items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            StudyForge AI
          </h1>
          <p className="text-xs text-slate-500">Your intelligent RAG study companion</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-xs">
            <span className="font-semibold text-slate-300">{user?.email?.split("@")[0]}</span>
            <span className="text-[10px] text-slate-500">{user?.email}</span>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-850 hover:text-slate-200 transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {error && (
        <div className="w-full max-w-md rounded-lg bg-red-950/40 border border-red-900/50 p-4 text-center text-sm text-red-400 mb-4">
          Backend connection failed: {error}
        </div>
      )}

      {health && !documentId && <UploadForm onDocumentReady={handleDocumentReady} />}

      {documentId && documentName && (
        <div className="flex w-full max-w-2xl flex-col gap-2">
          <button
            onClick={handleNewDocument}
            className="self-end text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Upload a different document
          </button>
          <ChatInterface documentId={documentId} documentName={documentName} />
        </div>
      )}
    </main>
  );
}