"use client";

import { useState } from "react";
import { uploadPdf, storeDocument } from "@/lib/api";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadFormProps {
  onDocumentReady: (documentId: string, filename: string) => void;
}

export default function UploadForm({ onDocumentReady }: UploadFormProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      setStage("uploading");
      const uploadResult = await uploadPdf(file);

      setStage("processing");
      await storeDocument(uploadResult.document_id);

      setStage("done");
      onDocumentReady(uploadResult.document_id, uploadResult.filename);
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Upload a PDF to get started
      </label>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={stage === "uploading" || stage === "processing"}
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 disabled:opacity-50"
      />

      {fileName && stage !== "idle" && (
        <p className="mt-3 text-sm text-slate-500">File: {fileName}</p>
      )}

      {stage === "uploading" && (
        <p className="mt-2 text-sm text-blue-600">Uploading PDF...</p>
      )}

      {stage === "processing" && (
        <p className="mt-2 text-sm text-blue-600">
          Processing document (extracting, chunking, embedding)...
        </p>
      )}

      {stage === "done" && (
        <p className="mt-2 text-sm text-green-600">
          Document ready — you can start asking questions.
        </p>
      )}

      {stage === "error" && error && (
        <p className="mt-2 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
