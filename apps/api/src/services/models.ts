import type { UpdateAdminModelsRequest } from "@model-status/shared";

import { HttpError } from "../http-error";
import type { DbClient } from "../db";

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSortOrder(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(value));
}

export function updateAdminModels(db: DbClient, updates: UpdateAdminModelsRequest): void {
  if (!Array.isArray(updates.models)) {
    throw new HttpError(400, "Invalid model update payload");
  }

  const existingModels = db.listModels(false);

  for (const modelUpdate of updates.models) {
    const upstreamId = modelUpdate.upstreamId.trim();
    const modelId = modelUpdate.model.trim();
    if (!upstreamId || !modelId) {
      throw new HttpError(400, "Model update payload requires upstreamId and model");
    }

    const existingModel = existingModels.find((model) => model.upstreamId === upstreamId && model.id === modelId);
    if (!existingModel) {
      throw new HttpError(404, `Model ${upstreamId}/${modelId} not found`);
    }

    db.updateModelMetadata({
      upstreamId,
      id: modelId,
      displayName: modelUpdate.displayName === undefined ? existingModel.displayName : normalizeNullableString(modelUpdate.displayName),
      icon: modelUpdate.icon === undefined ? existingModel.icon : normalizeNullableString(modelUpdate.icon),
      sortOrder: normalizeSortOrder(modelUpdate.sortOrder, existingModel.sortOrder),
    });
  }
}
