import type { AdminDashboardResponse } from "@model-status/shared";
import { ChevronDown, ChevronUp, GripVertical, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { getAdminCopy } from "../adminCopy";
import { ModelIcon, MODEL_ICON_OPTIONS } from "./ModelIcon";

type EditableModel = AdminDashboardResponse["models"][number];

type DragState = {
  upstreamId: string;
  modelId: string;
};

function sortModels(models: EditableModel[]): EditableModel[] {
  return [...models].sort((left, right) => {
    const orderComparison = left.sortOrder - right.sortOrder;
    if (orderComparison !== 0) {
      return orderComparison;
    }

    const leftLabel = (left.displayName ?? left.model).toLowerCase();
    const rightLabel = (right.displayName ?? right.model).toLowerCase();
    return leftLabel.localeCompare(rightLabel);
  });
}

function getStatusTone(latestStatus: EditableModel["latestStatus"]): string {
  switch (latestStatus) {
    case "up":
      return "border-success/30 bg-success/10 text-success";
    case "degraded":
      return "border-warning/30 bg-warning/10 text-warning";
    case "down":
      return "border-error/30 bg-error/10 text-error";
    default:
      return "border-border bg-surface text-textMuted";
  }
}

function IconPicker({
  model,
  onChange,
  language,
  expanded,
  onToggle,
}: {
  model: EditableModel;
  onChange: (field: "displayName" | "icon" | "sortOrder", value: string | number | null) => void;
  language: "en" | "zh-CN";
  expanded: boolean;
  onToggle: () => void;
}) {
  const copy = getAdminCopy(language);
  const currentLabel = MODEL_ICON_OPTIONS.find((option) => option.value === (model.icon ?? "auto"))?.label ?? copy.auto;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-mono uppercase tracking-wide text-textMuted">{copy.icon}</div>
        <button
          type="button"
          onClick={onToggle}
          className="glass-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-mono text-textSecondary"
        >
          <span>{expanded ? copy.hideIconOptions : copy.showIconOptions}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="glass-button flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/80">
            <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={20} />
          </span>
          <span className="text-sm font-mono text-textPrimary">{(model.icon ?? "auto") === "auto" ? copy.auto : currentLabel}</span>
        </span>
        {expanded ? <ChevronUp size={16} className="text-textMuted" /> : <ChevronDown size={16} className="text-textMuted" />}
      </button>

      {expanded ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/50 p-3">
          {MODEL_ICON_OPTIONS.map((option) => {
            const isActive = (model.icon ?? "auto") === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange("icon", option.value === "auto" ? null : option.value)}
                className={`glass-button inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-mono transition-all ${
                  isActive ? "border-accent bg-accent text-textPrimary" : "border-border text-textSecondary"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface/80">
                  <ModelIcon icon={option.value === "auto" ? null : option.value} modelId={model.model} ownedBy={model.ownedBy} size={18} />
                </span>
                <span>{option.value === "auto" ? copy.auto : option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CompactEditor({
  model,
  language,
  onChange,
}: {
  model: EditableModel;
  language: "en" | "zh-CN";
  onChange: (field: "displayName" | "icon" | "sortOrder", value: string | number | null) => void;
}) {
  const copy = getAdminCopy(language);
  const [iconExpanded, setIconExpanded] = useState(false);
  const statusLabel = (() => {
    switch (model.latestStatus) {
      case "up":
        return copy.up;
      case "degraded":
        return copy.degraded;
      case "down":
        return copy.down;
      default:
        return copy.emptyStatus;
    }
  })();

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <input
              value={model.displayName ?? ""}
              onChange={(event) => onChange("displayName", event.target.value)}
              placeholder={copy.displayNamePlaceholder}
              className="w-full rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm text-textPrimary outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-textMuted">
            <span className="rounded-full border border-border px-2 py-1">{copy.modelId}: {model.model}</span>
            <span className="rounded-full border border-border px-2 py-1">{copy.provider}: {model.ownedBy ?? "-"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`rounded-full border px-2.5 py-1 text-[11px] font-mono ${getStatusTone(model.latestStatus)}`}>{statusLabel}</div>
          <div className="rounded-full border border-border px-2.5 py-1 text-[11px] font-mono text-textMuted">{model.availabilityPercentage.toFixed(1)}%</div>
          <label className="flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px] font-mono text-textMuted">
            <span>{copy.order}</span>
            <input
              type="number"
              value={model.sortOrder}
              onChange={(event) => onChange("sortOrder", Number(event.target.value))}
              className="w-12 bg-transparent text-right text-textPrimary outline-none"
            />
          </label>
        </div>
      </div>

      <IconPicker
        model={model}
        language={language}
        expanded={iconExpanded}
        onToggle={() => setIconExpanded((current) => !current)}
        onChange={onChange}
      />
    </div>
  );
}

export function ModelManagerSection({
  models,
  isSaving,
  onChange,
  onReorder,
  onSave,
  language,
}: {
  models: EditableModel[];
  isSaving: boolean;
  onChange: (upstreamId: string, modelId: string, field: "displayName" | "icon" | "sortOrder", value: string | number | null) => void;
  onReorder: (upstreamId: string, draggedModelId: string, targetModelId: string | null) => void;
  onSave: () => void;
  language: "en" | "zh-CN";
}) {
  const copy = getAdminCopy(language);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const groupedModels = useMemo(() => {
    const groups = new Map<string, Map<string, EditableModel[]>>();

    for (const model of models) {
      const groupName = model.upstreamGroup || "default";
      const upstreamName = model.upstreamName || model.upstreamId;

      if (!groups.has(groupName)) {
        groups.set(groupName, new Map());
      }

      const upstreams = groups.get(groupName);
      if (!upstreams) {
        continue;
      }

      if (!upstreams.has(upstreamName)) {
        upstreams.set(upstreamName, []);
      }

      upstreams.get(upstreamName)?.push(model);
    }

    return Array.from(groups.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([groupName, upstreams]) => ({
        groupName,
        upstreams: Array.from(upstreams.entries())
          .sort((left, right) => left[0].localeCompare(right[0]))
          .map(([upstreamName, groupModels]) => ({
            upstreamName,
            models: sortModels(groupModels),
          })),
      }));
  }, [models]);

  const allowDrop = (upstreamId: string, targetModelId: string | null) => {
    if (!dragState || dragState.upstreamId !== upstreamId) {
      return false;
    }

    return dragState.modelId !== targetModelId;
  };

  return (
    <section className="glass-panel rounded-[28px] border border-border p-6 shadow-lg shadow-black/10 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-[0.28em] text-textMuted">{copy.modelsNav}</p>
          <h2 className="text-2xl font-mono text-textPrimary">{copy.modelsSectionTitle}</h2>
          <p className="max-w-2xl text-sm text-textSecondary">{copy.modelsSectionSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || models.length === 0}
          className="glass-button inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} />
          {copy.saveModelSettings}
        </button>
      </div>

      {groupedModels.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-10 text-sm text-textMuted">
          {copy.noManageableModels}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {groupedModels.map((group) => (
            <div key={group.groupName} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="text-sm font-mono uppercase tracking-[0.22em] text-textMuted">{group.groupName}</div>
              </div>

              <div className="space-y-6">
                {group.upstreams.map((upstream) => (
                  <div key={`${group.groupName}-${upstream.upstreamName}`} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-mono text-textPrimary">{upstream.upstreamName}</div>
                      <div className="text-xs font-mono text-textMuted">
                        {upstream.models.length} {copy.modelCountSuffix}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {upstream.models.map((model) => {
                        const cardKey = `${model.upstreamId}:${model.model}`;
                        const isDropTarget = dropTargetKey === cardKey;

                        return (
                          <article
                            key={cardKey}
                            onDragOver={(event) => {
                              if (!allowDrop(model.upstreamId, model.model)) {
                                return;
                              }

                              event.preventDefault();
                              setDropTargetKey(cardKey);
                            }}
                            onDrop={(event) => {
                              if (!allowDrop(model.upstreamId, model.model) || !dragState) {
                                return;
                              }

                              event.preventDefault();
                              onReorder(model.upstreamId, dragState.modelId, model.model);
                              setDragState(null);
                              setDropTargetKey(null);
                            }}
                            className={`rounded-xl border bg-surface/70 p-3 transition-all ${
                              isDropTarget ? "border-accent shadow-lg shadow-accent/10" : "border-border"
                            }`}
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex items-start pt-0.5">
                                  <div
                                    draggable
                                    onDragStart={() => {
                                      setDragState({ upstreamId: model.upstreamId, modelId: model.model });
                                      setDropTargetKey(cardKey);
                                    }}
                                    onDragEnd={() => {
                                      setDragState(null);
                                      setDropTargetKey(null);
                                    }}
                                    className="glass-button cursor-grab rounded-lg p-1.5 text-textMuted active:cursor-grabbing"
                                  >
                                    <GripVertical size={15} />
                                  </div>
                              </div>

                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background/80">
                                <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={24} />
                              </div>

                              <CompactEditor
                                model={model}
                                language={language}
                                onChange={(field, value) => onChange(model.upstreamId, model.model, field, value)}
                              />
                            </div>
                          </article>
                        );
                      })}

                      <div
                        onDragOver={(event) => {
                          if (!allowDrop(upstream.models[0]?.upstreamId ?? "", null)) {
                            return;
                          }

                          event.preventDefault();
                          setDropTargetKey(`${upstream.models[0]?.upstreamId ?? upstream.upstreamName}:tail`);
                        }}
                        onDrop={(event) => {
                          if (!dragState || dragState.upstreamId !== upstream.models[0]?.upstreamId) {
                            return;
                          }

                          event.preventDefault();
                          onReorder(dragState.upstreamId, dragState.modelId, null);
                          setDragState(null);
                          setDropTargetKey(null);
                        }}
                        className={`rounded-2xl border border-dashed px-4 py-3 text-xs font-mono text-textMuted transition-colors ${
                          dropTargetKey === `${upstream.models[0]?.upstreamId ?? upstream.upstreamName}:tail`
                            ? "border-accent bg-accent/10 text-textPrimary"
                            : "border-border bg-surface/30"
                        }`}
                      >
                        {copy.dropHint}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
