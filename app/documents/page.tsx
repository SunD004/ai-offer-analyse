import { FileManager } from "@/components/documents/file-manager";

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-6 text-2xl font-bold">Documents</h1>
      <FileManager />
    </div>
  );
}
