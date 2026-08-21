"use client";

import { useState } from "react";
import { uploadPdf, storeDocument } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadFormProps {
  onDocumentReady: (documentId: string, filename: string) => void;
}

export default function UploadForm({ onDocumentReady }: UploadFormProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { session } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const token = session?.access_token;
    if (!token) {
      setError("You must be logged in to upload documents.");
      setStage("error");
      return;
    }

    try {
      setStage("uploading");
      const uploadResult = await uploadPdf(file, token);

      setStage("processing");
      await storeDocument(uploadResult.document_id, token);

      setStage("done");
      onDocumentReady(uploadResult.document_id, uploadResult.filename);
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
      <label className="block text-sm font-semibold text-slate-300 mb-3">
        Upload a PDF to get started
      </label>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={stage === "uploading" || stage === "processing"}
        className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500 file:transition-colors file:cursor-pointer disabled:opacity-50"
      />

      {fileName && stage !== "idle" && (
        <p className="mt-4 text-xs text-slate-500 font-medium">Selected file: {fileName}</p>
      )}

      {stage === "uploading" && (
        <p className="mt-3 text-xs text-indigo-400 font-semibold animate-pulse flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          Uploading PDF...
        </p>
      )}

      {stage === "processing" && (
        <p className="mt-3 text-xs text-purple-400 font-semibold animate-pulse flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
          Processing document (extracting, chunking, embedding)...
        </p>
      )}

      {stage === "done" && (
        <p className="mt-3 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Document ready — loading workspace...
        </p>
      )}

      {stage === "error" && error && (
        <p className="mt-4 rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-xs text-red-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
