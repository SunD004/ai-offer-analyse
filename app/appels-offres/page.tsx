import { AppelsOffresSearch } from "@/components/appels-offres/appels-offres-search";

export default function AppelsOffresPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-6 text-2xl font-bold">Appels d'offres</h1>
      <AppelsOffresSearch />
    </div>
  );
}
