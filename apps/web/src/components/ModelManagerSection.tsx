import type { AdminDashboardResponse } from "@model-status/shared";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMemo, useState } from "react";

import { getAdminCopy } from "../adminCopy";
import { ModelIcon, MODEL_ICON_OPTIONS } from "./ModelIcon";

type EditableModel = AdminDashboardResponse["models"][number];

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

function getStatusLabel(language: "en" | "zh-CN", status: EditableModel["latestStatus"]): string {
  const copy = getAdminCopy(language);
  switch (status) {
    case "up":
      return copy.up;
    case "degraded":
      return copy.degraded;
    case "down":
      return copy.down;
    default:
      return copy.emptyStatus;
  }
}

function getModelLabel(model: EditableModel, copy: ReturnType<typeof getAdminCopy>): string {
  return model.displayName?.trim() || model.model || copy.modelId;
}

function ModelIconModal({
  model,
  language,
  onClose,
  onSelect,
}: {
  model: EditableModel;
  language: "en" | "zh-CN";
  onClose: () => void;
  onSelect: (icon: string | null) => void;
}) {
  const copy = getAdminCopy(language);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-4xl rounded-[28px] border border-border p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-mono text-textPrimary">{copy.chooseIcon}</h3>
            <p className="mt-2 text-sm text-textSecondary">{getModelLabel(model, copy)}</p>
          </div>
          <button type="button" onClick={onClose} className="glass-button rounded-xl p-2 text-textSecondary hover:text-textPrimary" aria-label="Close icon picker">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODEL_ICON_OPTIONS.map((option) => {
            const isActive = (model.icon ?? "auto") === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value === "auto" ? null : option.value);
                  onClose();
                }}
                className={`glass-button flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                  isActive ? "border-accent bg-accent text-textPrimary shadow-lg shadow-accent/10" : "border-border text-textSecondary"
                }`}
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-background/80">
                  <ModelIcon icon={option.value === "auto" ? null : option.value} modelId={model.model} ownedBy={model.ownedBy} size={24} />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-sm text-textPrimary">{option.value === "auto" ? copy.auto : option.label}</span>
                  <span className="mt-1 block text-xs text-textMuted">{option.value === "auto" ? copy.chooseIcon : option.value}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SortableModelRow({
  model,
  language,
  onDisplayNameChange,
  onOpenIconPicker,
}: {
  model: EditableModel;
  language: "en" | "zh-CN";
  onDisplayNameChange: (value: string) => void;
  onOpenIconPicker: () => void;
}) {
  const copy = getAdminCopy(language);
  const displayLabel = getModelLabel(model, copy);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.model });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-surface/75 px-3 py-3 shadow-sm transition-shadow ${
        isDragging ? "border-accent shadow-2xl shadow-accent/15" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="glass-button mt-0.5 cursor-grab rounded-lg p-1.5 text-textMuted active:cursor-grabbing"
          aria-label={`Drag ${displayLabel}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>

        <button
          type="button"
          onClick={onOpenIconPicker}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 transition-transform hover:scale-[1.03]"
          aria-label={`${copy.chooseIcon}: ${displayLabel}`}
        >
          <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={22} />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={model.displayName ?? ""}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                placeholder={copy.displayNamePlaceholder}
                className="w-full rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm text-textPrimary outline-none transition-colors focus:border-accent"
              />
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-textMuted">
                <span className="rounded-full border border-border px-2 py-1">{copy.modelId}: {model.model}</span>
                <span className="rounded-full border border-border px-2 py-1">{copy.provider}: {model.ownedBy ?? "-"}</span>
                <span className="rounded-full border border-border px-2 py-1">#{model.sortOrder}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={`rounded-full border px-2.5 py-1 text-[11px] font-mono ${getStatusTone(model.latestStatus)}`}>
                {getStatusLabel(language, model.latestStatus)}
              </div>
              <div className="rounded-full border border-border px-2.5 py-1 text-[11px] font-mono text-textMuted">
                {model.availabilityPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
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
  onReorder: (upstreamId: string, orderedModelIds: string[]) => void;
  onSave: () => void;
  language: "en" | "zh-CN";
}) {
  const copy = getAdminCopy(language);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [iconTarget, setIconTarget] = useState<EditableModel | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
          .map(([upstreamName, grouped]) => ({
            upstreamName,
            upstreamId: grouped[0]?.upstreamId ?? "",
            models: sortModels(grouped),
          })),
      }));
  }, [models]);

  const activeDragModel = useMemo(() => models.find((model) => model.model === activeDragId) ?? null, [activeDragId, models]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (upstreamId: string, orderedModels: EditableModel[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedModels.findIndex((model) => model.model === active.id);
    const newIndex = orderedModels.findIndex((model) => model.model === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(orderedModels, oldIndex, newIndex);
    onReorder(upstreamId, reordered.map((model) => model.model));
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

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd(upstream.upstreamId, upstream.models)}>
                      <SortableContext items={upstream.models.map((model) => model.model)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {upstream.models.map((model) => (
                            <SortableModelRow
                              key={`${model.upstreamId}:${model.model}`}
                              model={model}
                              language={language}
                              onDisplayNameChange={(value) => onChange(model.upstreamId, model.model, "displayName", value)}
                              onOpenIconPicker={() => setIconTarget(model)}
                            />
                          ))}
                        </div>
                      </SortableContext>

                      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
                        {activeDragModel ? (
                          <div className="rounded-xl border border-accent bg-surface/95 px-3 py-3 shadow-2xl shadow-accent/15">
                            <div className="flex items-center gap-3">
                              <div className="glass-button rounded-lg p-1.5 text-textMuted">
                                <GripVertical size={15} />
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80">
                                <ModelIcon icon={activeDragModel.icon} modelId={activeDragModel.model} ownedBy={activeDragModel.ownedBy} size={22} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-mono text-textPrimary">{getModelLabel(activeDragModel, copy)}</div>
                                <div className="mt-1 text-[11px] font-mono text-textMuted">{activeDragModel.model}</div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {iconTarget ? (
        <ModelIconModal
          model={iconTarget}
          language={language}
          onClose={() => setIconTarget(null)}
          onSelect={(icon) => onChange(iconTarget.upstreamId, iconTarget.model, "icon", icon)}
        />
      ) : null}
    </section>
  );
}
