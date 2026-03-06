import { NextRequest, NextResponse } from "next/server";
import { searchParamsSchema, type BoampSearchResponse } from "@/lib/appels-offres/types";

const BOAMP_API = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";

const SELECTED_FIELDS = [
  "idweb",
  "objet",
  "dateparution",
  "datelimitereponse",
  "nomacheteur",
  "descripteur_libelle",
  "nature_libelle",
  "code_departement",
  "url_avis",
  "type_avis",
  "type_marche",
  "procedure_libelle",
].join(",");

function sanitize(input: string): string {
  return input.replace(/"/g, '\\"');
}

function buildWhere(params: Record<string, string | number | undefined>): string {
  const clauses: string[] = [];

  if (params.q && typeof params.q === "string") {
    clauses.push(`search(objet, "${sanitize(params.q)}")`);
  }
  if (params.departement && typeof params.departement === "string") {
    clauses.push(`code_departement = "${sanitize(params.departement)}"`);
  }
  if (params.dateParutionMin && typeof params.dateParutionMin === "string") {
    clauses.push(`dateparution >= "${params.dateParutionMin}"`);
  }
  if (params.dateParutionMax && typeof params.dateParutionMax === "string") {
    clauses.push(`dateparution <= "${params.dateParutionMax}"`);
  }
  if (params.dateLimiteMin && typeof params.dateLimiteMin === "string") {
    clauses.push(`datelimitereponse >= "${params.dateLimiteMin}"`);
  }
  if (params.dateLimiteMax && typeof params.dateLimiteMax === "string") {
    clauses.push(`datelimitereponse <= "${params.dateLimiteMax}"`);
  }
  if (params.typeMarche && typeof params.typeMarche === "string") {
    clauses.push(`type_marche = "${sanitize(params.typeMarche)}"`);
  }
  if (params.nature && typeof params.nature === "string") {
    clauses.push(`nature_libelle = "${sanitize(params.nature)}"`);
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

  const apiUrl = new URL(BOAMP_API);
  apiUrl.searchParams.set("select", SELECTED_FIELDS);
  apiUrl.searchParams.set("order_by", "dateparution DESC");
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
      console.error("BOAMP API error:", res.status, text);
      return NextResponse.json(
        { error: "Erreur API BOAMP", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();

    const response: BoampSearchResponse = {
      total_count: data.total_count ?? 0,
      records: (data.results ?? []).map((r: Record<string, unknown>) => ({
        idweb: r.idweb ?? "",
        objet: r.objet ?? "",
        dateparution: r.dateparution ?? "",
        datelimitereponse: r.datelimitereponse ?? null,
        nomacheteur: r.nomacheteur ?? "",
        descripteur_libelle: r.descripteur_libelle ?? null,
        nature_libelle: r.nature_libelle ?? null,
        code_departement: r.code_departement ?? null,
        url_avis: r.url_avis ?? null,
        type_avis: r.type_avis ?? null,
        type_marche: r.type_marche ?? null,
        procedure_libelle: r.procedure_libelle ?? null,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("BOAMP fetch error:", err);
    return NextResponse.json(
      { error: "Impossible de contacter l'API BOAMP" },
      { status: 502 }
    );
  }
}
