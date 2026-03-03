"use client";

import { useEffect, useState } from "react";
import {
  FileText, ImageIcon, File, FileCode,
  Plus, Minus, BookOpen, Library,
  Folder, ChevronRight, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileStatusBadge } from "@/components/documents/file-status-badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  status: string;
  size: number;
  folderId: string | null;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

interface FolderNode extends FolderItem {
  children: FolderNode[];
  documents: Document[];
}

// ── File type helpers ────────────────────────────────────────────────────────

const fileTypeConfig: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  "application/pdf": { icon: FileText,  bg: "bg-red-100 dark:bg-red-950",       color: "text-red-600 dark:text-red-400" },
  "image/":          { icon: ImageIcon, bg: "bg-violet-100 dark:bg-violet-950", color: "text-violet-600 dark:text-violet-400" },
  "text/plain":      { icon: FileCode,  bg: "bg-blue-100 dark:bg-blue-950",     color: "text-blue-600 dark:text-blue-400" },
  "text/markdown":   { icon: FileCode,  bg: "bg-blue-100 dark:bg-blue-950",     color: "text-blue-600 dark:text-blue-400" },
  "text/csv":        { icon: FileCode,  bg: "bg-green-100 dark:bg-green-950",   color: "text-green-600 dark:text-green-400" },
};

function getFileType(mimeType: string) {
  if (mimeType?.startsWith("image/")) return fileTypeConfig["image/"];
  return fileTypeConfig[mimeType] ?? { icon: File, bg: "bg-muted", color: "text-muted-foreground" };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(folders: FolderItem[], documents: Document[]): {
  roots: FolderNode[];
  orphans: Document[];
} {
  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, { ...f, children: [], documents: [] });
  }

  for (const doc of documents) {
    if (doc.folderId && nodeMap.has(doc.folderId)) {
      nodeMap.get(doc.folderId)!.documents.push(doc);
    }
  }

  const roots: FolderNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children and documents by name
  const sortNode = (n: FolderNode) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.documents.sort((a, b) => a.originalName.localeCompare(b.originalName));
    n.children.forEach(sortNode);
  };
  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach(sortNode);

  const orphans = documents
    .filter((d) => !d.folderId || !nodeMap.has(d.folderId))
    .sort((a, b) => a.originalName.localeCompare(b.originalName));

  return { roots, orphans };
}

// Collect all document IDs under a folder node (recursively)
function collectDocIds(node: FolderNode): string[] {
  return [
    ...node.documents.map((d) => d.id),
    ...node.children.flatMap(collectDocIds),
  ];
}

// ── Main component ───────────────────────────────────────────────────────────

interface ChatbotDocumentPickerProps {
  chatbotId: string;
}

export function ChatbotDocumentPicker({ chatbotId }: ChatbotDocumentPickerProps) {
  const [allDocs, setAllDocs]         = useState<Document[]>([]);
  const [folders, setFolders]         = useState<FolderItem[]>([]);
  const [associatedIds, setAssociatedIds] = useState<Set<string>>(new Set());
  const [pending, setPending]         = useState<Set<string>>(new Set());
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    const [docsRes, foldersRes, assocRes] = await Promise.all([
      fetch("/api/documents"),
      fetch("/api/folders"),
      fetch(`/api/chatbots/${chatbotId}/documents`),
    ]);
    const docs: Document[]     = await docsRes.json();
    const fols: FolderItem[]   = await foldersRes.json();
    const assoc: Document[]    = await assocRes.json();

    setAllDocs(docs);
    setFolders(fols);
    setAssociatedIds(new Set(assoc.map((d) => d.id)));
    // Auto-expand folders that have associated docs
    const assocSet = new Set(assoc.map((d) => d.id));
    const toExpand = new Set<string>();
    for (const doc of docs) {
      if (doc.folderId && assocSet.has(doc.id)) toExpand.add(doc.folderId);
    }
    setExpanded((prev) => new Set([...prev, ...toExpand]));
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId]);

  const toggleDoc = async (doc: Document) => {
    const isAssociated = associatedIds.has(doc.id);
    setPending((p) => new Set(p).add(doc.id));
    await fetch(`/api/chatbots/${chatbotId}/documents`, {
      method: isAssociated ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: [doc.id] }),
    });
    toast.success(isAssociated ? "Removed from knowledge base" : "Added to knowledge base");
    await fetchAll();
    setPending((p) => { const n = new Set(p); n.delete(doc.id); return n; });
  };

  const toggleFolderAll = async (node: FolderNode) => {
    const ids = collectDocIds(node).filter((id) => {
      const doc = allDocs.find((d) => d.id === id);
      return doc?.status === "READY";
    });
    if (ids.length === 0) return;

    const allActive = ids.every((id) => associatedIds.has(id));
    setPending((p) => new Set([...p, ...ids]));

    await fetch(`/api/chatbots/${chatbotId}/documents`, {
      method: allActive ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ids }),
    });

    toast.success(allActive ? "Removed all from folder" : "Added all from folder");
    await fetchAll();
    setPending((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n; });
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (allDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
        <Library className="mb-3 h-9 w-9 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No documents available</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Upload documents on the Documents page first
        </p>
      </div>
    );
  }

  const { roots, orphans } = buildTree(folders, allDocs);

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <span>
          <span className="font-medium text-foreground">{associatedIds.size}</span>
          {" / "}
          {allDocs.length} documents in knowledge base
        </span>
      </div>

      {/* Tree */}
      <div className="space-y-1 rounded-xl border p-2">
        {roots.map((node) => (
          <FolderRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            associatedIds={associatedIds}
            pending={pending}
            onToggleExpand={toggleExpand}
            onToggleDoc={toggleDoc}
            onToggleFolderAll={toggleFolderAll}
            allDocs={allDocs}
          />
        ))}

        {orphans.map((doc) => (
          <DocRow
            key={doc.id}
            doc={doc}
            depth={0}
            active={associatedIds.has(doc.id)}
            loading={pending.has(doc.id)}
            onToggle={() => toggleDoc(doc)}
          />
        ))}

        {roots.length === 0 && orphans.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No documents</p>
        )}
      </div>
    </div>
  );
}

// ── FolderRow ────────────────────────────────────────────────────────────────

function FolderRow({
  node, depth, expanded, associatedIds, pending,
  onToggleExpand, onToggleDoc, onToggleFolderAll, allDocs,
}: {
  node: FolderNode;
  depth: number;
  expanded: Set<string>;
  associatedIds: Set<string>;
  pending: Set<string>;
  allDocs: Document[];
  onToggleExpand: (id: string) => void;
  onToggleDoc: (doc: Document) => void;
  onToggleFolderAll: (node: FolderNode) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const allIds = collectDocIds(node);
  const readyIds = allIds.filter((id) => allDocs.find((d) => d.id === id)?.status === "READY");
  const activeCount = allIds.filter((id) => associatedIds.has(id)).length;
  const allActive = readyIds.length > 0 && readyIds.every((id) => associatedIds.has(id));
  const hasContent = node.documents.length > 0 || node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground"
          onClick={() => onToggleExpand(node.id)}
          disabled={!hasContent}
        >
          {hasContent ? (
            isExpanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        <button
          className="flex flex-1 items-center gap-2 truncate text-left"
          onClick={() => onToggleExpand(node.id)}
        >
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="truncate text-sm font-medium">{node.name}</span>
          {allIds.length > 0 && (
            <span className={cn(
              "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
              activeCount > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {activeCount}/{allIds.length}
            </span>
          )}
        </button>

        {readyIds.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            title={allActive ? "Remove all from folder" : "Add all from folder"}
            onClick={() => onToggleFolderAll(node)}
          >
            {allActive
              ? <Minus className="h-3 w-3" />
              : <Plus className="h-3 w-3" />
            }
          </Button>
        )}
      </div>

      {isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              associatedIds={associatedIds}
              pending={pending}
              onToggleExpand={onToggleExpand}
              onToggleDoc={onToggleDoc}
              onToggleFolderAll={onToggleFolderAll}
              allDocs={allDocs}
            />
          ))}
          {node.documents.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              depth={depth + 1}
              active={associatedIds.has(doc.id)}
              loading={pending.has(doc.id)}
              onToggle={() => onToggleDoc(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── DocRow ───────────────────────────────────────────────────────────────────

function DocRow({
  doc, depth, active, loading, onToggle,
}: {
  doc: Document;
  depth: number;
  active: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const { icon: Icon, bg, color } = getFileType(doc.mimeType);
  const canToggle = doc.status === "READY" || active;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        active ? "bg-primary/5" : "hover:bg-muted/50"
      )}
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", bg)}>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("truncate text-sm", active && "font-medium")}>
          {doc.originalName}
        </p>
        <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
      </div>

      <FileStatusBadge status={doc.status} />

      <Button
        variant={active ? "outline" : "ghost"}
        size="icon"
        className={cn("h-6 w-6 shrink-0", !active && "opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity")}
        disabled={!canToggle || loading}
        onClick={onToggle}
        title={active ? "Remove" : "Add to knowledge base"}
      >
        {active ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  );
}
