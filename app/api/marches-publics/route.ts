import { NextRequest, NextResponse } from "next/server";
import { searchParamsSchema, type DecpSearchResponse } from "@/lib/marches-publics/types";

const DECP_API =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/decp-v3-marches-valides/records";

const SELECTED_FIELDS = [
  "id",
  "objet",
  "montant",
  "acheteur_nom",
  "acheteur_id",
  "nature",
  "procedure",
  "datenotification",
  "dureemois",
  "lieuexecution_nom",
  "lieuexecution_code",
  "codecpv",
  "formeprix",
  "offresrecues",
].join(",");

function sanitize(input: string): string {
  return input.replace(/"/g, '\\"');
}

function buildWhere(params: Record<string, string | number | undefined>): string {
  const clauses: string[] = [];

  if (params.q && typeof params.q === "string") {
    clauses.push(`search(objet, "${sanitize(params.q)}")`);
  }
  if (params.lieuExecution && typeof params.lieuExecution === "string") {
    clauses.push(`search(lieuexecution_nom, "${sanitize(params.lieuExecution)}")`);
  }
  if (params.nature && typeof params.nature === "string") {
    clauses.push(`nature = "${sanitize(params.nature)}"`);
  }
  if (params.procedure && typeof params.procedure === "string") {
    clauses.push(`procedure = "${sanitize(params.procedure)}"`);
  }
  if (params.dateNotificationMin && typeof params.dateNotificationMin === "string") {
    clauses.push(`datenotification >= "${params.dateNotificationMin}"`);
  }
  if (params.dateNotificationMax && typeof params.dateNotificationMax === "string") {
    clauses.push(`datenotification <= "${params.dateNotificationMax}"`);
  }
  if (params.montantMin !== undefined && typeof params.montantMin === "number") {
    clauses.push(`montant >= ${params.montantMin}`);
  }
  if (params.montantMax !== undefined && typeof params.montantMax === "number") {
    clauses.push(`montant <= ${params.montantMax}`);
  }

  return clauses.join(" AND ");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const parsed = searchParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const params = parsed.data;
  const where = buildWhere(params);

  const apiUrl = new URL(DECP_API);
  apiUrl.searchParams.set("select", SELECTED_FIELDS);
  apiUrl.searchParams.set("order_by", "datenotification DESC");
  apiUrl.searchParams.set("limit", String(params.limit));
  apiUrl.searchParams.set("offset", String(params.offset));
  if (where) {
    apiUrl.searchParams.set("where", where);
  }

  try {
    const res = await fetch(apiUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("DECP API error:", res.status, text);
      return NextResponse.json(
        { error: "Erreur API DECP", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();

    const response: DecpSearchResponse = {
      total_count: data.total_count ?? 0,
      records: (data.results ?? []).map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? "",
        objet: (r.objet as string) ?? "",
        montant: typeof r.montant === "number" ? r.montant : null,
        acheteur_nom: (r.acheteur_nom as string) ?? null,
        acheteur_id: (r.acheteur_id as string) ?? null,
        nature: (r.nature as string) ?? null,
        procedure: (r.procedure as string) ?? null,
        datenotification: (r.datenotification as string) ?? null,
        dureemois: typeof r.dureemois === "number" ? r.dureemois : null,
        lieuexecution_nom: (r.lieuexecution_nom as string) ?? null,
        lieuexecution_code: (r.lieuexecution_code as string) ?? null,
        codecpv: (r.codecpv as string) ?? null,
        formeprix: (r.formeprix as string) ?? null,
        offresrecues: typeof r.offresrecues === "number" ? r.offresrecues : null,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("DECP fetch error:", err);
    return NextResponse.json(
      { error: "Impossible de contacter l'API DECP" },
      { status: 502 }
    );
  }
}
