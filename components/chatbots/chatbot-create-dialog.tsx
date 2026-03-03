"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Folder, ChevronRight, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  originalName: string;
  status: string;
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

interface ChatbotCreateDialogProps {
  onCreated: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTree(
  folders: FolderItem[],
  documents: Document[]
): { roots: FolderNode[]; orphans: Document[] } {
  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) nodeMap.set(f.id, { ...f, children: [], documents: [] });
  for (const doc of documents) {
    if (doc.folderId && nodeMap.has(doc.folderId))
      nodeMap.get(doc.folderId)!.documents.push(doc);
  }
  const roots: FolderNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId))
      nodeMap.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (n: FolderNode) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.documents.sort((a, b) => a.originalName.localeCompare(b.originalName));
    n.children.forEach(sort);
  };
  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach(sort);
  const orphans = documents
    .filter((d) => !d.folderId || !nodeMap.has(d.folderId))
    .sort((a, b) => a.originalName.localeCompare(b.originalName));
  return { roots, orphans };
}

function collectDocIds(node: FolderNode): string[] {
  return [...node.documents.map((d) => d.id), ...node.children.flatMap(collectDocIds)];
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function ChatbotCreateDialog({ onCreated }: ChatbotCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/documents").then((r) => r.json()),
      fetch("/api/folders").then((r) => r.json()),
    ]).then(([docs, fols]) => {
      const readyDocs = (docs as Document[]).filter((d) => d.status === "READY");
      setDocuments(readyDocs);
      setFolders(fols);
      // Auto-expand all folders
      setExpanded(new Set((fols as FolderItem[]).map((f) => f.id)));
    });
  }, [open]);

  const { roots, orphans } = useMemo(
    () => buildTree(folders, documents),
    [folders, documents]
  );

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return documents.filter((d) => d.originalName.toLowerCase().includes(q));
  }, [search, documents]);

  const toggleDoc = (id: string) =>
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleFolder = (node: FolderNode) => {
    const ids = collectDocIds(node);
    const allSelected = ids.length > 0 && ids.every((id) => selectedDocIds.has(id));
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      allSelected
        ? ids.forEach((id) => next.delete(id))
        : ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = documents.length > 0 && documents.every((d) => selectedDocIds.has(d.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/chatbots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        systemPrompt: systemPrompt || undefined,
      }),
    });
    const chatbot = await res.json();
    if (selectedDocIds.size > 0) {
      await fetch(`/api/chatbots/${chatbot.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selectedDocIds) }),
      });
    }
    setLoading(false);
    setOpen(false);
    setName("");
    setDescription("");
    setSystemPrompt("");
    setSelectedDocIds(new Set());
    setSearch("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Chatbot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Chatbot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Chatbot"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
          <div>
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={3}
            />
          </div>

          {/* Knowledge Base */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Knowledge Base</Label>
              {documents.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedDocIds.size}</span>
                    /{documents.length} selected
                  </span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      allSelected
                        ? setSelectedDocIds(new Set())
                        : setSelectedDocIds(new Set(documents.map((d) => d.id)))
                    }
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
              )}
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ready documents available.</p>
            ) : (
              <div className="space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter documents..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>

                {/* Tree or filtered flat list */}
                <div className="max-h-52 overflow-y-auto rounded-md border p-1.5">
                  {filteredDocs ? (
                    filteredDocs.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No results</p>
                    ) : (
                      <div className="space-y-0.5">
                        {filteredDocs.map((doc) => (
                          <DocCheckRow
                            key={doc.id}
                            doc={doc}
                            selected={selectedDocIds.has(doc.id)}
                            onToggle={() => toggleDoc(doc.id)}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-0.5">
                      {roots.map((node) => (
                        <FolderCheckRow
                          key={node.id}
                          node={node}
                          depth={0}
                          expanded={expanded}
                          selectedDocIds={selectedDocIds}
                          onToggleExpand={toggleExpand}
                          onToggleFolder={toggleFolder}
                          onToggleDoc={toggleDoc}
                        />
                      ))}
                      {orphans.map((doc) => (
                        <DocCheckRow
                          key={doc.id}
                          doc={doc}
                          selected={selectedDocIds.has(doc.id)}
                          onToggle={() => toggleDoc(doc.id)}
                        />
                      ))}
                      {roots.length === 0 && orphans.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">No documents</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading || !name.trim()} className="w-full">
            {loading ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── FolderCheckRow ────────────────────────────────────────────────────────────

function FolderCheckRow({
  node, depth, expanded, selectedDocIds,
  onToggleExpand, onToggleFolder, onToggleDoc,
}: {
  node: FolderNode;
  depth: number;
  expanded: Set<string>;
  selectedDocIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleFolder: (node: FolderNode) => void;
  onToggleDoc: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const ids = collectDocIds(node);
  const selectedCount = ids.filter((id) => selectedDocIds.has(id)).length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const hasContent = node.documents.length > 0 || node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={() => onToggleFolder(node)}
          disabled={ids.length === 0}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => hasContent && onToggleExpand(node.id)}
        >
          {hasContent ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="truncate text-sm font-medium">{node.name}</span>
          {ids.length > 0 && (
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
                selectedCount > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {selectedCount}/{ids.length}
            </span>
          )}
        </button>
      </div>

      {isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderCheckRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedDocIds={selectedDocIds}
              onToggleExpand={onToggleExpand}
              onToggleFolder={onToggleFolder}
              onToggleDoc={onToggleDoc}
            />
          ))}
          {node.documents.map((doc) => (
            <DocCheckRow
              key={doc.id}
              doc={doc}
              depth={depth + 1}
              selected={selectedDocIds.has(doc.id)}
              onToggle={() => onToggleDoc(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── DocCheckRow ───────────────────────────────────────────────────────────────

function DocCheckRow({
  doc, depth = 0, selected, onToggle,
}: {
  doc: Document;
  depth?: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50",
        selected && "bg-primary/5"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <span className={cn("truncate text-sm", selected && "font-medium")}>
        {doc.originalName}
      </span>
    </label>
  );
}
