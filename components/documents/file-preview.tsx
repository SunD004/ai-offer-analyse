"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface FilePreviewProps {
  documentId: string | null;
  onClose: () => void;
}

interface DocumentDetail {
  id: string;
  originalName: string;
  ocrText: string | null;
  mimeType: string;
  status: string;
}

export function FilePreview({ documentId, onClose }: FilePreviewProps) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    fetch(`/api/documents/${documentId}`)
      .then((r) => r.json())
      .then(setDoc)
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <Dialog open={!!documentId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{doc?.originalName ?? "Document Preview"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : doc?.ocrText ? (
            <pre className="whitespace-pre-wrap p-4 text-sm">{doc.ocrText}</pre>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {doc?.status === "READY"
                ? "No text content extracted."
                : "Document is still being processed..."}
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
