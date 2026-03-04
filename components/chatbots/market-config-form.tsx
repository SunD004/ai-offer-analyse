"use client";

import { Fragment, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_CADENCES,
  computeMonthlyCost,
  type MarketConfig,
  type Zone,
  type LabourEntry,
} from "@/lib/market-config";
import { Plus, Trash2 } from "lucide-react";

const ZONE_TYPES = [
  { value: "bureaux", label: "Bureaux" },
  { value: "sanitaires", label: "Sanitaires" },
  { value: "circulations", label: "Circulations" },
  { value: "vitrerie", label: "Vitrerie" },
  { value: "restauration", label: "Restauration" },
  { value: "industriel", label: "Industriel" },
  { value: "autre", label: "Autre" },
] as const;

const FREQUENCIES = [
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "bimensuel", label: "Bimensuel" },
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "semestriel", label: "Semestriel" },
  { value: "annuel", label: "Annuel" },
] as const;

const CLEANING_TYPES = [
  { value: "entretien_courant", label: "Entretien courant" },
  { value: "remise_en_etat", label: "Remise en état" },
  { value: "vitrerie", label: "Vitrerie" },
  { value: "desinfection", label: "Désinfection" },
] as const;

const CONTRACT_TYPES = [
  { value: "forfait", label: "Forfait" },
  { value: "bpu", label: "BPU" },
  { value: "dpgf", label: "DPGF" },
] as const;

function emptyZone(): Zone {
  return {
    name: "",
    type: "bureaux",
    surface: 0,
    frequency: "quotidien",
    cleaningType: "entretien_courant",
  };
}

function emptyLabour(): LabourEntry {
  return {
    label: "Agent de service",
    hourlyRate: 12.5,
  };
}

function emptyConfig(): MarketConfig {
  return {
    client: "",
    contractType: "forfait",
    zones: [emptyZone()],
    labour: [emptyLabour()],
  };
}

interface MarketConfigFormProps {
  initialConfig: MarketConfig | null;
  onSave: (config: MarketConfig | null) => Promise<void>;
}

export function MarketConfigForm({
  initialConfig,
  onSave,
}: MarketConfigFormProps) {
  const [config, setConfig] = useState<MarketConfig>(
    initialConfig ?? emptyConfig()
  );
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(!!initialConfig);

  const update = useCallback(
    <K extends keyof MarketConfig>(key: K, value: MarketConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateLabour = useCallback(
    (index: number, entry: LabourEntry) => {
      setConfig((prev) => ({
        ...prev,
        labour: prev.labour.map((e, i) => (i === index ? entry : e)),
      }));
    },
    []
  );

  const addLabour = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      labour: [...prev.labour, emptyLabour()],
    }));
  }, []);

  const removeLabour = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      labour: prev.labour.filter((_, i) => i !== index),
    }));
  }, []);

  const updateZone = useCallback((index: number, zone: Zone) => {
    setConfig((prev) => ({
      ...prev,
      zones: prev.zones.map((z, i) => (i === index ? zone : z)),
    }));
  }, []);

  const addZone = useCallback(() => {
    setConfig((prev) => ({ ...prev, zones: [...prev.zones, emptyZone()] }));
  }, []);

  const removeZone = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      zones: prev.zones.filter((_, i) => i !== index),
    }));
  }, []);

  const costs = useMemo(() => {
    if (
      !enabled ||
      config.zones.length === 0 ||
      config.labour.length === 0 ||
      config.labour.some((e) => !e.hourlyRate) ||
      config.zones.some((z) => !z.surface)
    )
      return null;
    try {
      return computeMonthlyCost(config);
    } catch {
      return null;
    }
  }, [config, enabled]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(enabled ? config : null);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium">
            Activer la configuration marché
          </span>
        </label>
      </div>

      {enabled && (
        <>
          {/* Section 1: Informations marché */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Informations marché
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Input
                  value={config.client}
                  onChange={(e) => update("client", e.target.value)}
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <Label>Référence marché</Label>
                <Input
                  value={config.marketRef ?? ""}
                  onChange={(e) =>
                    update("marketRef", e.target.value || undefined)
                  }
                  placeholder="AO-2026-XXX"
                />
              </div>
              <div>
                <Label>Type de contrat *</Label>
                <select
                  value={config.contractType}
                  onChange={(e) =>
                    update(
                      "contractType",
                      e.target.value as MarketConfig["contractType"]
                    )
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CONTRACT_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Durée (mois)</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.contractDuration ?? ""}
                  onChange={(e) =>
                    update(
                      "contractDuration",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </div>
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={config.startDate ?? ""}
                  onChange={(e) =>
                    update("startDate", e.target.value || undefined)
                  }
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Zones */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Zones
              </h3>
              <Button variant="outline" size="sm" onClick={addZone}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
            {config.zones.map((zone, idx) => {
              const cadence =
                zone.cadence ?? DEFAULT_CADENCES[zone.type] ?? 250;
              const hpp = zone.surface > 0 ? zone.surface / cadence : 0;
              return (
                <div
                  key={idx}
                  className="border rounded-md p-3 space-y-3 relative"
                >
                  {config.zones.length > 1 && (
                    <button
                      onClick={() => removeZone(idx)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Nom *</Label>
                      <Input
                        value={zone.name}
                        onChange={(e) =>
                          updateZone(idx, { ...zone, name: e.target.value })
                        }
                        placeholder="Bureaux RDC"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type *</Label>
                      <select
                        value={zone.type}
                        onChange={(e) =>
                          updateZone(idx, {
                            ...zone,
                            type: e.target.value as Zone["type"],
                            cadence: undefined,
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ZONE_TYPES.map((zt) => (
                          <option key={zt.value} value={zt.value}>
                            {zt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Surface (m²) *</Label>
                      <Input
                        type="number"
                        min={0}
                        value={zone.surface || ""}
                        onChange={(e) =>
                          updateZone(idx, {
                            ...zone,
                            surface: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fréquence *</Label>
                      <select
                        value={zone.frequency}
                        onChange={(e) =>
                          updateZone(idx, {
                            ...zone,
                            frequency: e.target.value as Zone["frequency"],
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Type nettoyage *</Label>
                      <select
                        value={zone.cleaningType}
                        onChange={(e) =>
                          updateZone(idx, {
                            ...zone,
                            cleaningType:
                              e.target.value as Zone["cleaningType"],
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CLEANING_TYPES.map((ct) => (
                          <option key={ct.value} value={ct.value}>
                            {ct.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">
                        Cadence (m²/h) — défaut :{" "}
                        {DEFAULT_CADENCES[zone.type] ?? 250}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={zone.cadence ?? ""}
                        onChange={(e) =>
                          updateZone(idx, {
                            ...zone,
                            cadence: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder={String(
                          DEFAULT_CADENCES[zone.type] ?? 250
                        )}
                      />
                    </div>
                  </div>
                  {zone.surface > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {fmt(hpp)} h/passage ({cadence} m²/h)
                    </p>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Section 3: Main d'oeuvre */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Main d&apos;oeuvre
              </h3>
              <Button variant="outline" size="sm" onClick={addLabour}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter un profil
              </Button>
            </div>
            {config.labour.map((entry, idx) => (
              <div
                key={idx}
                className="border rounded-md p-3 space-y-3 relative"
              >
                {config.labour.length > 1 && (
                  <button
                    onClick={() => removeLabour(idx)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Profil *</Label>
                    <Input
                      value={entry.label}
                      onChange={(e) =>
                        updateLabour(idx, { ...entry, label: e.target.value })
                      }
                      placeholder="Agent de service"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Taux horaire brut (€/h) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={entry.hourlyRate || ""}
                      onChange={(e) =>
                        updateLabour(idx, {
                          ...entry,
                          hourlyRate: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Heures/mois</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.monthlyHours ?? ""}
                      onChange={(e) =>
                        updateLabour(idx, {
                          ...entry,
                          monthlyHours: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="Auto (heures zones)"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Charges sociales (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={entry.socialChargeRate ?? ""}
                      onChange={(e) =>
                        updateLabour(idx, {
                          ...entry,
                          socialChargeRate: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="45"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Majoration nuit (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.nightBonus ?? ""}
                      onChange={(e) =>
                        updateLabour(idx, {
                          ...entry,
                          nightBonus: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Majoration week-end (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={entry.weekendBonus ?? ""}
                      onChange={(e) =>
                        updateLabour(idx, {
                          ...entry,
                          weekendBonus: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Section 4: Produits & Équipement */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Produits & Équipement
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Produits (% du coût MO)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.productsPercent ?? ""}
                  onChange={(e) =>
                    update(
                      "productsPercent",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="20"
                />
              </div>
              <div>
                <Label className="text-xs">Équipement mensuel (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.equipmentMonthly ?? ""}
                  onChange={(e) =>
                    update(
                      "equipmentMonthly",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </div>
          </Card>

          {/* Section 5: Frais & Marge */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Frais & Marge
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Frais de structure (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.overheadPercent ?? ""}
                  onChange={(e) =>
                    update(
                      "overheadPercent",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="10"
                />
              </div>
              <div>
                <Label className="text-xs">Marge (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.marginPercent ?? ""}
                  onChange={(e) =>
                    update(
                      "marginPercent",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="7"
                />
              </div>
            </div>
          </Card>

          {/* Section 6: Contraintes */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Contraintes
            </h3>
            <Textarea
              value={config.constraints ?? ""}
              onChange={(e) =>
                update("constraints", e.target.value || undefined)
              }
              placeholder="Horaires spécifiques, accès restreints, exigences particulières..."
              rows={3}
            />
          </Card>

          {/* Section 7: Récapitulatif */}
          {costs && (
            <Card className="p-4 space-y-3 bg-muted/50">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Récapitulatif mensuel
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Heures totales :</span>
                <span className="font-medium">
                  {fmt(costs.monthlyHours)} h
                </span>
                {costs.labourDetails.map((d, i) => (
                  <Fragment key={i}>
                    <span className="pl-2 text-muted-foreground">
                      {d.label} ({fmt(d.hours)}h x {fmt(d.chargedRate)} €/h) :
                    </span>
                    <span>{fmt(d.cost)} €</span>
                  </Fragment>
                ))}
                <span>Coût MO total :</span>
                <span>{fmt(costs.labourCost)} €</span>
                <span>Produits :</span>
                <span>{fmt(costs.productsCost)} €</span>
                <span>Équipement :</span>
                <span>{fmt(costs.equipmentCost)} €</span>
                <span>Sous-total :</span>
                <span>{fmt(costs.subtotal)} €</span>
                <span>Frais de structure :</span>
                <span>{fmt(costs.overheadCost)} €</span>
                <span>Marge :</span>
                <span>{fmt(costs.marginCost)} €</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-base">
                <span>Total HT mensuel</span>
                <span>{fmt(costs.totalHT)} €</span>
              </div>
            </Card>
          )}
        </>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Enregistrement..." : "Enregistrer la configuration"}
      </Button>
    </div>
  );
}
