import { z } from "zod";

export const searchParamsSchema = z.object({
  q: z.string().optional(),
  departement: z.string().optional(),
  dateParutionMin: z.string().optional(),
  dateParutionMax: z.string().optional(),
  dateLimiteMin: z.string().optional(),
  dateLimiteMax: z.string().optional(),
  typeMarche: z.string().optional(),
  nature: z.string().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface BoampRecord {
  idweb: string;
  objet: string;
  dateparution: string;
  datelimitereponse: string | null;
  nomacheteur: string;
  descripteur_libelle: string | null;
  nature_libelle: string | null;
  code_departement: string | null;
  url_avis: string | null;
  type_avis: string | null;
  type_marche: string | null;
  procedure_libelle: string | null;
}

export interface BoampSearchResponse {
  total_count: number;
  records: BoampRecord[];
}

export const EXAMPLE_QUERIES = [
  { label: "Nettoyage urbain", query: "nettoyage urbain" },
  { label: "Propreté locaux", query: "propreté locaux" },
  { label: "Voirie", query: "entretien voirie" },
  { label: "Collecte déchets", query: "collecte déchets" },
  { label: "Espaces verts", query: "espaces verts entretien" },
  { label: "Nettoyage industriel", query: "nettoyage industriel" },
];
