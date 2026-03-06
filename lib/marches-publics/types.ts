import { z } from "zod";

export const searchParamsSchema = z.object({
  q: z.string().optional(),
  lieuExecution: z.string().optional(),
  nature: z.string().optional(),
  procedure: z.string().optional(),
  dateNotificationMin: z.string().optional(),
  dateNotificationMax: z.string().optional(),
  montantMin: z.coerce.number().optional(),
  montantMax: z.coerce.number().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface DecpRecord {
  id: string;
  objet: string;
  montant: number | null;
  acheteur_nom: string | null;
  acheteur_id: string | null;
  nature: string | null;
  procedure: string | null;
  datenotification: string | null;
  dureemois: number | null;
  lieuexecution_nom: string | null;
  lieuexecution_code: string | null;
  codecpv: string | null;
  formeprix: string | null;
  offresrecues: number | null;
}

export interface DecpSearchResponse {
  total_count: number;
  records: DecpRecord[];
}

export const EXAMPLE_QUERIES = [
  { label: "Nettoyage locaux", query: "nettoyage locaux" },
  { label: "Propreté urbaine", query: "propreté urbaine" },
  { label: "Collecte déchets", query: "collecte déchets" },
  { label: "Espaces verts", query: "espaces verts entretien" },
  { label: "Voirie", query: "entretien voirie" },
  { label: "Nettoyage industriel", query: "nettoyage industriel" },
];
