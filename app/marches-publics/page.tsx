import { MarchesPublicsSearch } from "@/components/marches-publics/marches-publics-search";

export default function MarchesPublicsPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-6 text-2xl font-bold">Marchés publics attribués</h1>
      <MarchesPublicsSearch />
    </div>
  );
}
