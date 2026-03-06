"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ExternalLink, ChevronDown, ChevronUp, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EXAMPLE_QUERIES, type BoampRecord, type BoampSearchResponse } from "@/lib/appels-offres/types";

const PAGE_SIZE = 20;

interface Filters {
  departement: string;
  dateParutionMin: string;
  dateParutionMax: string;
  dateLimiteMin: string;
  dateLimiteMax: string;
  typeMarche: string;
  nature: string;
}

const emptyFilters: Filters = {
  departement: "",
  dateParutionMin: "",
  dateParutionMax: "",
  dateLimiteMin: "",
  dateLimiteMax: "",
  typeMarche: "",
  nature: "",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

export function AppelsOffresSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [records, setRecords] = useState<BoampRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (q: string, f: Filters, offset: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (f.departement) params.set("departement", f.departement);
      if (f.dateParutionMin) params.set("dateParutionMin", f.dateParutionMin);
      if (f.dateParutionMax) params.set("dateParutionMax", f.dateParutionMax);
      if (f.dateLimiteMin) params.set("dateLimiteMin", f.dateLimiteMin);
      if (f.dateLimiteMax) params.set("dateLimiteMax", f.dateLimiteMax);
      if (f.typeMarche) params.set("typeMarche", f.typeMarche);
      if (f.nature) params.set("nature", f.nature);
      params.set("offset", String(offset));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/appels-offres?${params}`);
      if (!res.ok) throw new Error("Erreur lors de la recherche");

      const data: BoampSearchResponse = await res.json();
      setRecords(data.records);
      setTotalCount(data.total_count);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la recherche d'appels d'offres");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      fetchResults(query, filters, 0);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filters, fetchResults]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchResults(query, filters, newPage * PAGE_SIZE);
  }

  function handleExampleClick(exampleQuery: string) {
    setQuery(exampleQuery);
  }

  function resetFilters() {
    setFilters(emptyFilters);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Example queries */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((ex) => (
          <Badge
            key={ex.query}
            variant="outline"
            className="cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary"
            onClick={() => handleExampleClick(ex.query)}
          >
            {ex.label}
          </Badge>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un appel d'offres..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          Filtres avancés
          {showFilters ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Département</label>
            <Input
              value={filters.departement}
              onChange={(e) => setFilters({ ...filters, departement: e.target.value })}
              placeholder="Ex: 75, 13..."
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Parution après</label>
            <Input
              type="date"
              value={filters.dateParutionMin}
              onChange={(e) => setFilters({ ...filters, dateParutionMin: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Parution avant</label>
            <Input
              type="date"
              value={filters.dateParutionMax}
              onChange={(e) => setFilters({ ...filters, dateParutionMax: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date limite après</label>
            <Input
              type="date"
              value={filters.dateLimiteMin}
              onChange={(e) => setFilters({ ...filters, dateLimiteMin: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date limite avant</label>
            <Input
              type="date"
              value={filters.dateLimiteMax}
              onChange={(e) => setFilters({ ...filters, dateLimiteMax: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type de marché</label>
            <Input
              value={filters.typeMarche}
              onChange={(e) => setFilters({ ...filters, typeMarche: e.target.value })}
              placeholder="Ex: Services"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nature d'avis</label>
            <Input
              value={filters.nature}
              onChange={(e) => setFilters({ ...filters, nature: e.target.value })}
              placeholder="Ex: Avis de marché"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              <RotateCcw className="mr-1 h-3 w-3" />
              Réinitialiser
            </Button>
          </div>
        </div>
      )}

      {/* Results count */}
      {hasSearched && !loading && (
        <p className="text-sm text-muted-foreground">
          {totalCount} résultat{totalCount !== 1 ? "s" : ""} trouvé{totalCount !== 1 ? "s" : ""}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {/* Results table */}
      {!loading && records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Objet</th>
                <th className="px-3 py-2 text-left font-medium">Acheteur</th>
                <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Dép.</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Parution</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Date limite</th>
                <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Type</th>
                <th className="px-3 py-2 text-left font-medium">Lien</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.idweb} className="transition-colors hover:bg-muted/30">
                  <td className="max-w-xs truncate px-3 py-2" title={r.objet}>
                    {r.objet}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2" title={r.nomacheteur}>
                    {r.nomacheteur}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">{r.code_departement ?? "—"}</td>
                  <td className="hidden px-3 py-2 sm:table-cell">{formatDate(r.dateparution)}</td>
                  <td className="hidden px-3 py-2 sm:table-cell">{formatDate(r.datelimitereponse)}</td>
                  <td className="hidden px-3 py-2 lg:table-cell">{r.type_marche ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.url_avis ? (
                      <a
                        href={r.url_avis}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && hasSearched && records.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucun résultat trouvé. Essayez d'ajuster votre recherche ou vos filtres.
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
          >
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
