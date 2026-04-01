import type { ClearModelHistoryRequest, UpdateAdminModelsRequest } from "@model-status/shared";

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

function normalizeModelIdentity(value: { upstreamId?: string; model?: string }) {
  const upstreamId = value.upstreamId?.trim() ?? "";
  const modelId = value.model?.trim() ?? "";

  if (!upstreamId || !modelId) {
    throw new HttpError(400, "Model payload requires upstreamId and model");
  }

  return { upstreamId, modelId };
}

export function updateAdminModels(db: DbClient, updates: UpdateAdminModelsRequest): void {
  if (!Array.isArray(updates.models)) {
    throw new HttpError(400, "Invalid model update payload");
  }

  const existingModels = db.listModels(false);

  for (const modelUpdate of updates.models) {
    const { upstreamId, modelId } = normalizeModelIdentity(modelUpdate);
    const existingModel = existingModels.find((model) => model.upstreamId === upstreamId && model.id === modelId);
    if (!existingModel) {
      throw new HttpError(404, `Model ${upstreamId}/${modelId} not found`);
    }

    db.updateModelMetadata({
      upstreamId,
      id: modelId,
      displayName: modelUpdate.displayName === undefined ? existingModel.displayName : normalizeNullableString(modelUpdate.displayName),
      icon: modelUpdate.icon === undefined ? existingModel.icon : normalizeNullableString(modelUpdate.icon),
      isVisible: modelUpdate.isVisible ?? existingModel.isVisible,
      sortOrder: normalizeSortOrder(modelUpdate.sortOrder, existingModel.sortOrder),
    });
  }
}

export function clearAdminModelHistory(
  db: DbClient,
  payload: ClearModelHistoryRequest,
): { upstreamId: string; model: string; deletedProbeCount: number } {
  const { upstreamId, modelId } = normalizeModelIdentity(payload);
  const existingModel = db.listModels(false).find((model) => model.upstreamId === upstreamId && model.id === modelId);

  if (!existingModel) {
    throw new HttpError(404, `Model ${upstreamId}/${modelId} not found`);
  }

  if (typeof db.deleteProbesForModel !== "function") {
    throw new Error("Database client does not support clearing model history");
  }

  return {
    upstreamId,
    model: modelId,
    deletedProbeCount: db.deleteProbesForModel(upstreamId, modelId),
  };
}
