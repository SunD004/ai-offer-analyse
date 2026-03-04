"use client";

import { useState } from "react";
import { Folder, FolderPlus, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  _count: { documents: number; children: number };
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootFolders = folders.filter((f) => !f.parentId);

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), selectedFolderId);
      setNewFolderName("");
      setCreating(false);
    }
  };

  const renderFolder = (folder: FolderItem, depth = 0) => {
    const children = folders.filter((f) => f.parentId === folder.id);
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          className={cn(
            "group/folder flex w-full items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted",
            isSelected && "bg-primary/10 text-primary"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelectFolder(isSelected ? null : folder.id)}
        >
          {children.length > 0 ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          ) : (
            <span className="w-3" />
          )}
          <Folder className="h-4 w-4" />
          <span className="truncate">{folder.name}</span>
          <span className="ml-auto flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {folder._count.documents}
            </span>
            <span
              role="button"
              className="rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover/folder:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </span>
          </span>
        </button>
        {isExpanded &&
          children.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Folders</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCreating(!creating)}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {creating && (
        <div className="flex gap-1">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
      )}

      <button
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted",
          selectedFolderId === null && "bg-primary/10 text-primary"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4" />
        All Documents
      </button>

      {rootFolders.map((folder) => renderFolder(folder))}
    </div>
  );
}
