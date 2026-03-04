"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { UploadDropzone } from "./upload-dropzone";
import { FileCard } from "./file-card";
import { FolderTree } from "./folder-tree";
import { FilePreview } from "./file-preview";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  _count: { documents: number; children: number };
}

export function FileManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const fetchDocuments = useCallback(async () => {
    const params = selectedFolderId ? `?folderId=${selectedFolderId}` : "";
    const res = await fetch(`/api/documents${params}`);
    setDocuments(await res.json());
  }, [selectedFolderId]);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    setFolders(await res.json());
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
  }, [fetchDocuments, fetchFolders]);

  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "PENDING" || d.status === "PROCESSING"
    );
    if (!hasProcessing) return;
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    toast.success("Document deleted");
    fetchDocuments();
    fetchFolders();
  };

  const handleReprocess = async (id: string) => {
    await fetch(`/api/documents/${id}/reprocess`, { method: "POST" });
    toast.info("Reprocessing document...");
    fetchDocuments();
  };

  const handleDeleteFolder = async (folderId: string) => {
    const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete folder");
      return;
    }
    toast.success("Folder deleted");
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    fetchDocuments();
    fetchFolders();
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    fetchFolders();
  };

  const countReady      = documents.filter((d) => d.status === "READY").length;
  const countProcessing = documents.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length;
  const countError      = documents.filter((d) => d.status === "ERROR").length;

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="hidden w-56 shrink-0 md:block">
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        <UploadDropzone
          folderId={selectedFolderId}
          onUploadComplete={() => {
            fetchDocuments();
            toast.success("File uploaded, processing...");
          }}
        />

        {documents.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="font-medium text-foreground">{documents.length}</span>
                {documents.length === 1 ? "document" : "documents"}
              </span>
              {countReady > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {countReady} ready
                </span>
              )}
              {countProcessing > 0 && (
                <span className="flex items-center gap-1 text-amber-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {countProcessing} processing
                </span>
              )}
              {countError > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {countError} error
                </span>
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-7 w-7", view === "grid" && "shadow-sm")}
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-7 w-7", view === "list" && "shadow-sm")}
                onClick={() => setView("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Upload your first file above</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {documents.map((doc) => (
              <FileCard
                key={doc.id}
                document={doc}
                view="grid"
                onDelete={handleDelete}
                onReprocess={handleReprocess}
                onPreview={setPreviewDocId}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <FileCard
                key={doc.id}
                document={doc}
                view="list"
                onDelete={handleDelete}
                onReprocess={handleReprocess}
                onPreview={setPreviewDocId}
              />
            ))}
          </div>
        )}
      </div>

      <FilePreview
        documentId={previewDocId}
        onClose={() => setPreviewDocId(null)}
      />
    </div>
  );
}
