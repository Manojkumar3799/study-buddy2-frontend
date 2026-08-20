"use client";

import { useEffect, useState } from "react";
import { checkHealth, type HealthResponse } from "@/lib/api";
import UploadForm from "@/components/UploadForm";
import ChatInterface from "@/components/ChatInterface";

const STORAGE_KEY = "studyforge_document";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { id, name } = JSON.parse(saved);
      setDocumentId(id);
      setDocumentName(name);
    }
  }, []);

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

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-slate-50 p-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800">StudyForge AI</h1>

      {error && (
        <p className="rounded-md bg-red-100 px-4 py-2 text-red-700">
          Backend connection failed: {error}
        </p>
      )}

      {health && !documentId && <UploadForm onDocumentReady={handleDocumentReady} />}

      {documentId && documentName && (
        <div className="flex w-full max-w-2xl flex-col gap-2">
          <button
            onClick={handleNewDocument}
            className="self-end text-xs text-slate-500 underline hover:text-slate-700"
          >
            Upload a different document
          </button>
          <ChatInterface documentId={documentId} documentName={documentName} />
        </div>
      )}
    </main>
  );
}