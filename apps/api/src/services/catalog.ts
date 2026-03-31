import type { ModelCatalogEntry, SyncModelsResponse } from "@model-status/shared";

import type { DbClient } from "../db";
import { HttpError } from "../http-error";
import type { RuntimeSettings } from "./settings";
import { normalizeCatalogModels } from "./catalog.helpers";

type ModelsApiResponse = {
  data?: ModelCatalogEntry[];
};

function normalizeCreated(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function previewErrorBody(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length <= 240 ? trimmed : `${trimmed.slice(0, 240)}...`;
}

export async function syncModelCatalog(settings: RuntimeSettings, db: DbClient): Promise<SyncModelsResponse> {
  const syncedAt = new Date().toISOString();
  let totalFetched = 0;

  for (const upstream of settings.upstreams) {
    let response: Response;
    try {
      response = await fetch(upstream.modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${upstream.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      throw new HttpError(
        502,
        `Models sync failed for upstream ${upstream.name}: ${error instanceof Error ? error.message : "Unknown fetch error"}`,
      );
    }

    if (!response.ok) {
      const rawResponseText = await response.text();
      const bodyPreview = previewErrorBody(rawResponseText);
      throw new HttpError(
        502,
        bodyPreview
          ? `Models sync failed for upstream ${upstream.name}: HTTP ${response.status} ${response.statusText}. Response: ${bodyPreview}`
          : `Models sync failed for upstream ${upstream.name}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as ModelsApiResponse;
    const models = normalizeCatalogModels(json);
    totalFetched += models.length;

    for (const model of models) {
      db.upsertModel({
        upstreamId: upstream.id,
        id: model.id,
        created: normalizeCreated(model.created),
        ownedBy: model.owned_by ?? null,
        displayName: null,
        icon: null,
        sortOrder: 0,
        syncedAt,
        isActive: true,
      });
    }

    db.deactivateMissingModels(
      upstream.id,
      models.map((model) => model.id),
      syncedAt,
    );
  }

  return {
    syncedAt,
    totalFetched,
    upserted: totalFetched,
  };
}
