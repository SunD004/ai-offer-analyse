import { z } from "zod";

export const DEFAULT_CADENCES: Record<string, number> = {
  bureaux: 300,
  sanitaires: 120,
  circulations: 400,
  vitrerie: 50,
  restauration: 200,
  industriel: 500,
  autre: 250,
};

const zoneSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "bureaux",
    "sanitaires",
    "circulations",
    "vitrerie",
    "restauration",
    "industriel",
    "autre",
  ]),
  surface: z.number().positive(),
  frequency: z.enum([
    "quotidien",
    "hebdomadaire",
    "bimensuel",
    "mensuel",
    "trimestriel",
    "semestriel",
    "annuel",
  ]),
  cleaningType: z.enum([
    "entretien_courant",
    "remise_en_etat",
    "vitrerie",
    "desinfection",
  ]),
  cadence: z.number().positive().optional(),
});

const labourEntrySchema = z.object({
  label: z.string().min(1),
  hourlyRate: z.number().positive(),
  monthlyHours: z.number().min(0).optional(),
  socialChargeRate: z.number().min(0).max(100).optional(),
  nightBonus: z.number().min(0).optional(),
  weekendBonus: z.number().min(0).optional(),
});

export const marketConfigSchema = z.object({
  client: z.string().min(1),
  marketRef: z.string().optional(),
  contractType: z.enum(["forfait", "bpu", "dpgf"]),
  contractDuration: z.number().positive().optional(),
  startDate: z.string().optional(),
  zones: z.array(zoneSchema).min(1),
  labour: z.array(labourEntrySchema).min(1),
  productsPercent: z.number().min(0).max(100).optional(),
  equipmentMonthly: z.number().min(0).optional(),
  overheadPercent: z.number().min(0).max(100).optional(),
  marginPercent: z.number().min(0).max(100).optional(),
  constraints: z.string().optional(),
});

export type MarketConfig = z.infer<typeof marketConfigSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type LabourEntry = z.infer<typeof labourEntrySchema>;

const FREQUENCY_PER_MONTH: Record<string, number> = {
  quotidien: 22,
  hebdomadaire: 4.33,
  bimensuel: 2.17,
  mensuel: 1,
  trimestriel: 0.33,
  semestriel: 0.17,
  annuel: 0.083,
};

const FREQUENCY_LABELS: Record<string, string> = {
  quotidien: "Quotidien",
  hebdomadaire: "Hebdomadaire",
  bimensuel: "Bimensuel",
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  semestriel: "Semestriel",
  annuel: "Annuel",
};

const CONTRACT_LABELS: Record<string, string> = {
  forfait: "Forfait",
  bpu: "BPU",
  dpgf: "DPGF",
};

function getEffectiveCadence(zone: Zone): number {
  return zone.cadence ?? DEFAULT_CADENCES[zone.type] ?? 250;
}

function getHoursPerPassage(zone: Zone): number {
  return zone.surface / getEffectiveCadence(zone);
}

function getPassagesPerMonth(zone: Zone): number {
  return FREQUENCY_PER_MONTH[zone.frequency] ?? 1;
}

export function computeMonthlyHours(zones: Zone[]): number {
  return zones.reduce(
    (sum, z) => sum + getHoursPerPassage(z) * getPassagesPerMonth(z),
    0
  );
}

function getChargedRate(entry: LabourEntry): number {
  const socialRate = (entry.socialChargeRate ?? 45) / 100;
  return entry.hourlyRate * (1 + socialRate);
}

export function computeMonthlyCost(config: MarketConfig): {
  labourCost: number;
  labourDetails: { label: string; hours: number; chargedRate: number; cost: number }[];
  productsCost: number;
  equipmentCost: number;
  subtotal: number;
  overheadCost: number;
  totalBeforeMargin: number;
  marginCost: number;
  totalHT: number;
  monthlyHours: number;
} {
  const zoneHours = computeMonthlyHours(config.zones);

  // If any entry has monthlyHours set, use those directly.
  // Otherwise, split zone hours evenly across all entries.
  const hasExplicitHours = config.labour.some((e) => e.monthlyHours != null && e.monthlyHours > 0);

  const labourDetails = config.labour.map((entry) => {
    const hours = hasExplicitHours
      ? (entry.monthlyHours ?? 0)
      : zoneHours / config.labour.length;
    const chargedRate = getChargedRate(entry);
    return {
      label: entry.label,
      hours,
      chargedRate,
      cost: hours * chargedRate,
    };
  });

  const monthlyHours = hasExplicitHours
    ? labourDetails.reduce((s, d) => s + d.hours, 0)
    : zoneHours;
  const labourCost = labourDetails.reduce((s, d) => s + d.cost, 0);
  const productsCost = labourCost * ((config.productsPercent ?? 20) / 100);
  const equipmentCost = config.equipmentMonthly ?? 0;
  const subtotal = labourCost + productsCost + equipmentCost;
  const overheadCost = subtotal * ((config.overheadPercent ?? 10) / 100);
  const totalBeforeMargin = subtotal + overheadCost;
  const marginCost =
    totalBeforeMargin * ((config.marginPercent ?? 7) / 100);
  const totalHT = totalBeforeMargin + marginCost;

  return {
    labourCost,
    labourDetails,
    productsCost,
    equipmentCost,
    subtotal,
    overheadCost,
    totalBeforeMargin,
    marginCost,
    totalHT,
    monthlyHours,
  };
}

export function buildMarketPrompt(config: MarketConfig): string {
  const costs = computeMonthlyCost(config);
  const fmt = (n: number) => n.toFixed(2);

  let header = `Client : ${config.client}`;
  if (config.marketRef) header += ` | Réf : ${config.marketRef}`;
  header += ` | Contrat : ${CONTRACT_LABELS[config.contractType] ?? config.contractType}`;
  if (config.contractDuration)
    header += ` | Durée : ${config.contractDuration} mois`;
  if (config.startDate) header += ` | Début : ${config.startDate}`;

  const zonesTable = config.zones
    .map((z) => {
      const cadence = getEffectiveCadence(z);
      const hpp = getHoursPerPassage(z);
      return `| ${z.name} | ${z.type} | ${z.surface} m² | ${FREQUENCY_LABELS[z.frequency]} | ${cadence} m²/h | ${fmt(hpp)}h |`;
    })
    .join("\n");

  const productsPercent = config.productsPercent ?? 20;
  const overheadPercent = config.overheadPercent ?? 10;
  const marginPercent = config.marginPercent ?? 7;

  const labourTable = config.labour
    .map((entry, i) => {
      const d = costs.labourDetails[i];
      const socialRate = entry.socialChargeRate ?? 45;
      let line = `| ${entry.label} | ${fmt(entry.hourlyRate)} €/h | ${socialRate}% | ${fmt(d.chargedRate)} €/h | ${fmt(d.hours)}h | ${fmt(d.cost)} € |`;
      const bonuses: string[] = [];
      if (entry.nightBonus) bonuses.push(`nuit +${entry.nightBonus}%`);
      if (entry.weekendBonus) bonuses.push(`WE +${entry.weekendBonus}%`);
      if (bonuses.length) line += ` _(${bonuses.join(", ")})_`;
      return line;
    })
    .join("\n");

  let prompt = `
## Configuration du marché
${header}

### Zones et surfaces
| Zone | Type | Surface | Fréquence | Cadence | Heures/passage |
|------|------|---------|-----------|---------|----------------|
${zonesTable}

### Main d'oeuvre
| Profil | Taux brut | Charges | Taux chargé | Heures/mois | Coût/mois |
|--------|-----------|---------|-------------|-------------|-----------|
${labourTable}

### Paramètres financiers
- Produits : ${productsPercent}% du coût MO | Équipement : ${fmt(config.equipmentMonthly ?? 0)} €/mois
- Frais de structure : ${overheadPercent}% | Marge : ${marginPercent}%`;

  prompt += `

### Récapitulatif mensuel
- Heures totales : ${fmt(costs.monthlyHours)}h
- Coût MO : ${fmt(costs.labourCost)} € | Produits : ${fmt(costs.productsCost)} € | Équipement : ${fmt(costs.equipmentCost)} €
- Sous-total : ${fmt(costs.subtotal)} € | Frais structure : ${fmt(costs.overheadCost)} € | Marge : ${fmt(costs.marginCost)} €
- **Total HT mensuel estimé : ${fmt(costs.totalHT)} €**`;

  if (config.constraints) {
    prompt += `\n\n### Contraintes\n${config.constraints}`;
  }

  prompt += `

Utilise ces données pour chiffrer. Calcule à partir des surfaces et cadences. Présente en tableaux professionnels.`;

  return prompt;
}
