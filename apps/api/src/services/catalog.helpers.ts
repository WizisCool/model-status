import type { ModelCatalogEntry } from "@model-status/shared";

type ModelsApiResponse = {
  data?: ModelCatalogEntry[];
};

export function normalizeCatalogModels(payload: ModelsApiResponse): ModelCatalogEntry[] {
  const models = Array.isArray(payload.data) ? payload.data : [];
  const deduped = new Map<string, ModelCatalogEntry>();

  for (const model of models) {
    if (!model?.id) {
      continue;
    }

    deduped.set(model.id, model);
  }

  return [...deduped.values()].sort((left, right) => left.id.localeCompare(right.id));
}
