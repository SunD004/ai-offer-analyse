"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FolderOpen, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  folderId?: string | null;
  onUploadComplete: () => void;
}

interface UploadProgress {
  total: number;
  done: number;
  current: string;
}

const ACCEPTED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md", ".csv", ".xlsx", ".docx"]);

function isSupportedFile(file: File) {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.has(ext);
}

export function UploadDropzone({ folderId, onUploadComplete }: UploadDropzoneProps) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Upload a flat list of files to a given folderId
  const uploadFiles = async (files: File[], targetFolderId?: string | null) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ total: files.length, done: i, current: file.name });

      const formData = new FormData();
      formData.append("file", file);
      if (targetFolderId) formData.append("folderId", targetFolderId);

      await fetch("/api/documents", { method: "POST", body: formData });
    }
  };

  // Upload a whole folder, recreating its directory structure
  const uploadFolder = async (fileList: FileList) => {
    const allFiles = Array.from(fileList).filter(isSupportedFile);
    if (allFiles.length === 0) return;

    setProgress({ total: allFiles.length, done: 0, current: "" });

    // ── 1. Collect unique folder paths (sorted by depth) ──────────────────
    const dirPaths = new Set<string>();
    for (const file of allFiles) {
      const parts = file.webkitRelativePath.split("/");
      // parts[0] = root folder, parts[last] = filename
      for (let depth = 1; depth < parts.length; depth++) {
        dirPaths.add(parts.slice(0, depth).join("/"));
      }
    }
    const sortedDirs = Array.from(dirPaths).sort(
      (a, b) => a.split("/").length - b.split("/").length
    );

    // ── 2. Create folders in DB, tracking path → id ───────────────────────
    const folderIdMap = new Map<string, string>(); // dirPath → db id

    for (const dirPath of sortedDirs) {
      const parts = dirPath.split("/");
      const name = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
      const parentId = parentPath ? folderIdMap.get(parentPath) ?? folderId : folderId;

      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: parentId ?? null }),
      });
      const folder = await res.json();
      folderIdMap.set(dirPath, folder.id);
    }

    // ── 3. Upload each file into its folder ───────────────────────────────
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      setProgress({ total: allFiles.length, done: i, current: file.name });

      const parts = file.webkitRelativePath.split("/");
      const dirPath = parts.slice(0, -1).join("/");
      const fileFolderId = folderIdMap.get(dirPath) ?? folderId;

      const formData = new FormData();
      formData.append("file", file);
      if (fileFolderId) formData.append("folderId", fileFolderId);

      await fetch("/api/documents", { method: "POST", body: formData });
    }

    setProgress(null);
    onUploadComplete();
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      await uploadFiles(acceptedFiles, folderId);
      setProgress(null);
      onUploadComplete();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folderId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !!progress,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  const isUploading = !!progress;
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-8 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : isUploading
              ? "cursor-default border-muted-foreground/20 bg-muted/30"
              : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex w-full flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="w-full max-w-xs space-y-1.5 text-center">
              <p className="text-sm font-medium">
                Uploading {progress!.done + 1} / {progress!.total}
              </p>
              <p className="truncate text-xs text-muted-foreground">{progress!.current}</p>
              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop files here…" : "Drag & drop files"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, Word, Excel, images, TXT, MD, CSV — or click to browse
            </p>
          </>
        )}
      </div>

      {/* Folder upload */}
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        multiple
        // @ts-expect-error – webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        onChange={(e) => {
          if (e.target.files) uploadFolder(e.target.files);
          // reset so same folder can be re-selected
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        className="w-full gap-2 text-sm"
        disabled={isUploading}
        onClick={() => folderInputRef.current?.click()}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4" />
            Upload Folder
          </>
        )}
      </Button>

      {/* Done flash */}
      {!isUploading && progress === null && (
        <p className="hidden items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Upload complete
        </p>
      )}
    </div>
  );
}
