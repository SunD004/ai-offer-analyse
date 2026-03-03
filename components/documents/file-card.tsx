"use client";

import { FileText, ImageIcon, File, FileCode, Trash2, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface FileCardProps {
  document: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    status: string;
    errorMessage?: string | null;
    createdAt: string;
  };
  view: "grid" | "list";
  onDelete: (id: string) => void;
  onReprocess: (id: string) => void;
  onPreview: (id: string) => void;
}

const fileTypeConfig: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  "application/pdf": { icon: FileText,  bg: "bg-red-100 dark:bg-red-950",       color: "text-red-600 dark:text-red-400" },
  "image/":          { icon: ImageIcon, bg: "bg-violet-100 dark:bg-violet-950", color: "text-violet-600 dark:text-violet-400" },
  "text/plain":      { icon: FileCode,  bg: "bg-blue-100 dark:bg-blue-950",     color: "text-blue-600 dark:text-blue-400" },
  "text/markdown":   { icon: FileCode,  bg: "bg-blue-100 dark:bg-blue-950",     color: "text-blue-600 dark:text-blue-400" },
  "text/csv":        { icon: FileCode,  bg: "bg-green-100 dark:bg-green-950",   color: "text-green-600 dark:text-green-400" },
};

function getFileType(mimeType: string) {
  if (mimeType.startsWith("image/")) return fileTypeConfig["image/"];
  return fileTypeConfig[mimeType] ?? { icon: File, bg: "bg-muted", color: "text-muted-foreground" };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusDotConfig: Record<string, string> = {
  READY:      "bg-green-500",
  PROCESSING: "bg-amber-400 animate-pulse",
  PENDING:    "bg-amber-400 animate-pulse",
  ERROR:      "bg-destructive",
};

export function FileCard({ document, view, onDelete, onReprocess, onPreview }: FileCardProps) {
  const { icon: Icon, bg, color } = getFileType(document.mimeType);
  const dotClass = statusDotConfig[document.status] ?? "bg-muted-foreground";

  if (view === "grid") {
    return (
      <div
        className="group relative flex cursor-pointer flex-col rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
        onClick={() => onPreview(document.id)}
      >
        {/* Status dot */}
        <span className={cn("absolute right-3 top-3 h-2 w-2 rounded-full", dotClass)} />

        {/* File icon */}
        <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-xl", bg)}>
          <Icon className={cn("h-6 w-6", color)} />
        </div>

        {/* Name */}
        <p className="mb-1 line-clamp-2 text-sm font-medium leading-tight">
          {document.originalName}
        </p>

        {/* Meta */}
        <div className="mt-auto space-y-0.5 pt-2 text-xs text-muted-foreground">
          <p>{formatFileSize(document.size)}</p>
          <p>{formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</p>
        </div>

        {document.errorMessage && (
          <p className="mt-1 truncate text-xs text-destructive">{document.errorMessage}</p>
        )}

        {/* Hover actions */}
        <div
          className="absolute inset-x-0 bottom-0 flex justify-end gap-1 rounded-b-xl bg-gradient-to-t from-card to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {document.status === "ERROR" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReprocess(document.id)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(document.id)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(document.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all hover:shadow-sm hover:border-primary/30"
      onClick={() => onPreview(document.id)}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{document.originalName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(document.size)}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</span>
        </div>
        {document.errorMessage && (
          <p className="mt-0.5 truncate text-xs text-destructive">{document.errorMessage}</p>
        )}
      </div>

      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />

      <div
        className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {document.status === "ERROR" && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReprocess(document.id)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(document.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
