"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ChevronDown, ChevronUp, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EXAMPLE_QUERIES, type DecpRecord, type DecpSearchResponse } from "@/lib/marches-publics/types";

const PAGE_SIZE = 20;

interface Filters {
  lieuExecution: string;
  nature: string;
  procedure: string;
  dateNotificationMin: string;
  dateNotificationMax: string;
  montantMin: string;
  montantMax: string;
}

const emptyFilters: Filters = {
  lieuExecution: "",
  nature: "",
  procedure: "",
  dateNotificationMin: "",
  dateNotificationMax: "",
  montantMin: "",
  montantMax: "",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

function formatMontant(montant: number | null): string {
  if (montant === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(montant);
}

export function MarchesPublicsSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [records, setRecords] = useState<DecpRecord[]>([]);
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
      if (f.lieuExecution) params.set("lieuExecution", f.lieuExecution);
      if (f.nature) params.set("nature", f.nature);
      if (f.procedure) params.set("procedure", f.procedure);
      if (f.dateNotificationMin) params.set("dateNotificationMin", f.dateNotificationMin);
      if (f.dateNotificationMax) params.set("dateNotificationMax", f.dateNotificationMax);
      if (f.montantMin) params.set("montantMin", f.montantMin);
      if (f.montantMax) params.set("montantMax", f.montantMax);
      params.set("offset", String(offset));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/marches-publics?${params}`);
      if (!res.ok) throw new Error("Erreur lors de la recherche");

      const data: DecpSearchResponse = await res.json();
      setRecords(data.records);
      setTotalCount(data.total_count);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la recherche de marchés publics");
    } finally {
      setLoading(false);
    }
  }, []);

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
            placeholder="Rechercher un marché attribué..."
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Lieu d'exécution</label>
            <Input
              value={filters.lieuExecution}
              onChange={(e) => setFilters({ ...filters, lieuExecution: e.target.value })}
              placeholder="Ex: Paris, Lyon..."
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nature</label>
            <Input
              value={filters.nature}
              onChange={(e) => setFilters({ ...filters, nature: e.target.value })}
              placeholder="Ex: Marché, Accord-cadre"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Procédure</label>
            <Input
              value={filters.procedure}
              onChange={(e) => setFilters({ ...filters, procedure: e.target.value })}
              placeholder="Ex: Appel d'offres ouvert"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notification après</label>
            <Input
              type="date"
              value={filters.dateNotificationMin}
              onChange={(e) => setFilters({ ...filters, dateNotificationMin: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notification avant</label>
            <Input
              type="date"
              value={filters.dateNotificationMax}
              onChange={(e) => setFilters({ ...filters, dateNotificationMax: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant min (EUR)</label>
            <Input
              type="number"
              value={filters.montantMin}
              onChange={(e) => setFilters({ ...filters, montantMin: e.target.value })}
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant max (EUR)</label>
            <Input
              type="number"
              value={filters.montantMax}
              onChange={(e) => setFilters({ ...filters, montantMax: e.target.value })}
              placeholder="1000000"
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
          {totalCount.toLocaleString("fr-FR")} résultat{totalCount !== 1 ? "s" : ""} trouvé{totalCount !== 1 ? "s" : ""}
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
                <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Acheteur</th>
                <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Lieu</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Montant</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Notification</th>
                <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Nature</th>
                <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Procédure</th>
                <th className="px-3 py-2 text-right font-medium">Durée</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/30">
                  <td className="max-w-xs truncate px-3 py-2" title={r.objet}>
                    {r.objet}
                  </td>
                  <td className="hidden max-w-[180px] truncate px-3 py-2 md:table-cell" title={r.acheteur_nom ?? ""}>
                    {r.acheteur_nom ?? r.acheteur_id ?? "—"}
                  </td>
                  <td className="hidden max-w-[140px] truncate px-3 py-2 lg:table-cell" title={r.lieuexecution_nom ?? ""}>
                    {r.lieuexecution_nom ?? r.lieuexecution_code ?? "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-right sm:table-cell">
                    {formatMontant(r.montant)}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 sm:table-cell">
                    {formatDate(r.datenotification)}
                  </td>
                  <td className="hidden px-3 py-2 lg:table-cell">{r.nature ?? "—"}</td>
                  <td className="hidden max-w-[140px] truncate px-3 py-2 lg:table-cell" title={r.procedure ?? ""}>
                    {r.procedure ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.dureemois ? `${r.dureemois} mois` : "—"}
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
            Page {page + 1} / {totalPages.toLocaleString("fr-FR")}
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
