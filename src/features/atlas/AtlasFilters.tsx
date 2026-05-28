import { Checkbox, FilterBar } from "@moritzbrantner/ui";
import { useId, useState } from "react";

import {
  allSourceKinds,
  sourceKindColors,
  sourceKindLabels,
} from "../../entities/source/model/sourceConstants";
import type {
  SourceKindFilter,
  SourceKindFilters,
  SourceRelationshipFilter,
} from "../../entities/source/lib/sourceFiltering";
import type { SourceReferenceDirection } from "../../entities/source/lib/sourceReferences";
import type { SourceKind } from "../../entities/source/model/sourceTypes";

const maxRelationshipDepth = 5;
type RelationshipFilterKey = "referenced" | "referencing";

const referenceDirectionOptions: {
  color: string;
  direction: SourceReferenceDirection;
  label: string;
}[] = [
  { color: "#1d4ed8", direction: "incoming", label: "Referenced by" },
  { color: "#0f766e", direction: "outgoing", label: "References" },
];

export function AtlasFilters({
  onQueryChange,
  onReferenceDirectionFiltersChange,
  onSourceKindFiltersChange,
  query,
  referenceDirectionFilters,
  resultCount,
  sourceKindFilters,
}: {
  onQueryChange: (query: string) => void;
  onReferenceDirectionFiltersChange: (filters: SourceReferenceDirection[]) => void;
  onSourceKindFiltersChange: (filters: SourceKindFilters) => void;
  query: string;
  referenceDirectionFilters: SourceReferenceDirection[];
  resultCount: number;
  sourceKindFilters: SourceKindFilters;
}) {
  const [collapsedSourceKinds, setCollapsedSourceKinds] = useState<ReadonlySet<SourceKind>>(
    () => new Set(),
  );
  const [collapsedRelationshipFilters, setCollapsedRelationshipFilters] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const allReferenceDirectionsSelected =
    referenceDirectionFilters.length === referenceDirectionOptions.length;

  return (
    <FilterBar
      className="w-full lg:w-auto"
      searchPlaceholder="Qumran, papyri, Iran..."
      searchValue={query}
      onSearchChange={onQueryChange}
      filters={[
        {
          id: "sourceKinds",
          label: "Source type scope",
          value: getSourceKindFilterLabel(sourceKindFilters),
        },
        {
          id: "referenceDirections",
          label: "Map links",
          value: getReferenceDirectionFilterLabel(referenceDirectionFilters),
        },
      ]}
      onClearFilter={(filterId) => {
        if (filterId === "sourceKinds") {
          onSourceKindFiltersChange(createDefaultSourceKindFilters());
        }

        if (filterId === "referenceDirections") {
          onReferenceDirectionFiltersChange(
            referenceDirectionOptions.map((option) => option.direction),
          );
        }
      }}
      onClearAll={() => {
        onQueryChange("");
        onSourceKindFiltersChange(createDefaultSourceKindFilters());
        onReferenceDirectionFiltersChange(
          referenceDirectionOptions.map((option) => option.direction),
        );
      }}
      actions={
        <div className="grid gap-4 text-xs font-semibold text-slate-600 xl:grid-cols-[minmax(0,1fr)_220px]">
          <fieldset className="grid gap-2">
            <legend>Source type scope</legend>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Per source type
              </span>
              <button
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm shadow-slate-900/5"
                type="button"
                onClick={() => {
                  onSourceKindFiltersChange(createDefaultSourceKindFilters());
                }}
              >
                Reset
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {allSourceKinds.map((kind) => (
                <SourceKindScopeControl
                  collapsed={collapsedSourceKinds.has(kind)}
                  color={sourceKindColors[kind]}
                  collapsedReferenceFilters={collapsedRelationshipFilters}
                  filter={sourceKindFilters[kind]}
                  kind={kind}
                  key={kind}
                  label={sourceKindLabels[kind]}
                  onCollapsedChange={() => {
                    setCollapsedSourceKinds((current) => toggleSetValue(current, kind));
                  }}
                  onFilterChange={(filter) => {
                    onSourceKindFiltersChange(
                      updateSourceKindFilter(sourceKindFilters, kind, filter),
                    );
                  }}
                  onReferenceFilterCollapsedChange={(referenceKind) => {
                    setCollapsedRelationshipFilters((current) =>
                      toggleSetValue(current, getReferenceFilterCollapseKey(kind, referenceKind)),
                    );
                  }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend>Map links</legend>
            <div className="flex flex-wrap gap-2">
              <FilterCheckbox
                checked={
                  allReferenceDirectionsSelected
                    ? true
                    : referenceDirectionFilters.length > 0
                      ? "indeterminate"
                      : false
                }
                label="All"
                onCheckedChange={(checked) => {
                  onReferenceDirectionFiltersChange(
                    checked ? referenceDirectionOptions.map((option) => option.direction) : [],
                  );
                }}
              />
              {referenceDirectionOptions.map((option) => (
                <FilterCheckbox
                  checked={referenceDirectionFilters.includes(option.direction)}
                  color={option.color}
                  key={option.direction}
                  label={option.label}
                  onCheckedChange={(checked) => {
                    onReferenceDirectionFiltersChange(
                      getNextReferenceDirectionFilters(
                        referenceDirectionFilters,
                        option.direction,
                        checked,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          </fieldset>
        </div>
      }
    >
      <span className="sr-only">{resultCount} visible sources</span>
    </FilterBar>
  );
}

function FilterCheckbox({
  checked,
  color,
  label,
  onCheckedChange,
}: {
  checked: boolean | "indeterminate";
  color?: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const checkboxId = useId();

  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm shadow-slate-900/5">
      <Checkbox
        checked={checked}
        id={checkboxId}
        onCheckedChange={(nextChecked) => {
          onCheckedChange(nextChecked === true);
        }}
      />
      {color ? <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> : null}
      <label className="cursor-pointer" htmlFor={checkboxId}>
        {label}
      </label>
    </div>
  );
}

function SourceKindScopeControl({
  collapsed,
  color,
  collapsedReferenceFilters,
  filter,
  kind,
  label,
  onCollapsedChange,
  onFilterChange,
  onReferenceFilterCollapsedChange,
}: {
  collapsed: boolean;
  color: string;
  collapsedReferenceFilters: ReadonlySet<string>;
  filter: SourceKindFilter;
  kind: SourceKind;
  label: string;
  onCollapsedChange: () => void;
  onFilterChange: (filter: SourceKindFilter) => void;
  onReferenceFilterCollapsedChange: (referenceKind: RelationshipFilterKey) => void;
}) {
  const allId = useId();
  const bodyId = useId();
  const summary = getSourceKindFilterScopeLabels(filter).join(", ") || "None";

  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/5">
      <div className="flex min-w-0 items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            <span className="truncate text-xs font-bold text-slate-900">{label}</span>
          </div>
          <span className="truncate text-[11px] font-semibold text-slate-500">{summary}</span>
        </div>
        <button
          aria-controls={bodyId}
          aria-expanded={!collapsed}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm shadow-slate-900/5"
          type="button"
          onClick={onCollapsedChange}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {collapsed ? null : (
        <div className="grid gap-2" id={bodyId}>
          <div className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2">
            <Checkbox
              checked={filter.all}
              id={allId}
              onCheckedChange={(checked) => {
                onFilterChange({
                  ...filter,
                  all: checked === true,
                  referenced:
                    checked === true ? { ...filter.referenced, enabled: false } : filter.referenced,
                  referencing:
                    checked === true
                      ? { ...filter.referencing, enabled: false }
                      : filter.referencing,
                });
              }}
            />
            <label className="cursor-pointer text-xs font-bold text-slate-800" htmlFor={allId}>
              All
            </label>
          </div>

          <RelationshipDepthControl
            collapsed={collapsedReferenceFilters.has(
              getReferenceFilterCollapseKey(kind, "referenced"),
            )}
            filter={filter.referenced}
            label="Selected references"
            onCollapsedChange={() => {
              onReferenceFilterCollapsedChange("referenced");
            }}
            onFilterChange={(relationshipFilter) => {
              onFilterChange({
                ...filter,
                all: relationshipFilter.enabled ? false : filter.all,
                referenced: relationshipFilter,
              });
            }}
          />
          <RelationshipDepthControl
            collapsed={collapsedReferenceFilters.has(
              getReferenceFilterCollapseKey(kind, "referencing"),
            )}
            filter={filter.referencing}
            label="References selected"
            onCollapsedChange={() => {
              onReferenceFilterCollapsedChange("referencing");
            }}
            onFilterChange={(relationshipFilter) => {
              onFilterChange({
                ...filter,
                all: relationshipFilter.enabled ? false : filter.all,
                referencing: relationshipFilter,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

function RelationshipDepthControl({
  collapsed,
  filter,
  label,
  onCollapsedChange,
  onFilterChange,
}: {
  collapsed: boolean;
  filter: SourceRelationshipFilter;
  label: string;
  onCollapsedChange: () => void;
  onFilterChange: (filter: SourceRelationshipFilter) => void;
}) {
  const checkboxId = useId();
  const depthId = useId();
  const bodyId = useId();
  const summary = filter.enabled ? `depth ${filter.depth}` : "off";

  return (
    <div className="grid gap-2 rounded-md border border-slate-200 px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Checkbox
            checked={filter.enabled}
            id={checkboxId}
            onCheckedChange={(checked) => {
              onFilterChange({
                ...filter,
                enabled: checked === true,
              });
            }}
          />
          <label
            className="min-w-0 cursor-pointer truncate text-xs font-semibold text-slate-800"
            htmlFor={checkboxId}
          >
            {label}
          </label>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500">{summary}</span>
        </div>
        <button
          aria-controls={bodyId}
          aria-expanded={!collapsed}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700"
          type="button"
          onClick={onCollapsedChange}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {collapsed ? null : (
        <label
          className="grid grid-cols-[auto_minmax(54px,1fr)] items-center gap-2 text-[11px] font-bold uppercase text-slate-500"
          htmlFor={depthId}
          id={bodyId}
        >
          Depth
          <input
            className="min-h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!filter.enabled}
            id={depthId}
            max={maxRelationshipDepth}
            min={1}
            type="number"
            value={filter.depth}
            onChange={(event) => {
              onFilterChange({
                ...filter,
                depth: clampRelationshipDepth(Number(event.target.value)),
              });
            }}
          />
        </label>
      )}
    </div>
  );
}

function getSourceKindFilterLabel(filters: SourceKindFilters) {
  const scopedKinds = allSourceKinds.filter((kind) => isCustomizedSourceKindFilter(filters[kind]));

  if (scopedKinds.length === 0) {
    return "All source types";
  }

  if (scopedKinds.length === 1) {
    const kind = scopedKinds[0]!;
    const filter = filters[kind];
    const scopes = getSourceKindFilterScopeLabels(filter);

    return `${sourceKindLabels[kind]}: ${scopes.join(", ") || "None"}`;
  }

  return `${scopedKinds.length} customized source types`;
}

function getReferenceDirectionFilterLabel(filters: SourceReferenceDirection[]) {
  if (filters.length === referenceDirectionOptions.length) {
    return "All links";
  }

  if (filters.length === 0) {
    return "No links";
  }

  return (
    referenceDirectionOptions.find((option) => option.direction === filters[0])?.label ?? "Links"
  );
}

function updateSourceKindFilter(
  currentFilters: SourceKindFilters,
  kind: SourceKind,
  filter: SourceKindFilter,
) {
  return {
    ...currentFilters,
    [kind]: normalizeSourceKindFilter(filter),
  };
}

function createDefaultSourceKindFilters(): SourceKindFilters {
  return Object.fromEntries(
    allSourceKinds.map((kind) => [
      kind,
      {
        all: true,
        referenced: {
          depth: 1,
          enabled: false,
        },
        referencing: {
          depth: 1,
          enabled: false,
        },
      },
    ]),
  ) as SourceKindFilters;
}

function normalizeSourceKindFilter(filter: SourceKindFilter): SourceKindFilter {
  return {
    all: filter.all,
    referenced: {
      depth: clampRelationshipDepth(filter.referenced.depth),
      enabled: filter.referenced.enabled,
    },
    referencing: {
      depth: clampRelationshipDepth(filter.referencing.depth),
      enabled: filter.referencing.enabled,
    },
  };
}

function isCustomizedSourceKindFilter(filter: SourceKindFilter) {
  return !filter.all || filter.referenced.enabled || filter.referencing.enabled;
}

function getSourceKindFilterScopeLabels(filter: SourceKindFilter) {
  const scopes: string[] = [];

  if (filter.all) {
    scopes.push("all");
  }

  if (filter.referenced.enabled) {
    scopes.push(`references depth ${filter.referenced.depth}`);
  }

  if (filter.referencing.enabled) {
    scopes.push(`referrers depth ${filter.referencing.depth}`);
  }

  return scopes;
}

function clampRelationshipDepth(depth: number) {
  if (!Number.isFinite(depth)) {
    return 1;
  }

  return Math.max(1, Math.min(maxRelationshipDepth, Math.round(depth)));
}

function getNextReferenceDirectionFilters(
  currentFilters: SourceReferenceDirection[],
  direction: SourceReferenceDirection,
  checked: boolean,
) {
  const nextFilters = checked
    ? [...new Set([...currentFilters, direction])]
    : currentFilters.filter((currentDirection) => currentDirection !== direction);

  return referenceDirectionOptions
    .map((option) => option.direction)
    .filter((currentDirection) => nextFilters.includes(currentDirection));
}

function getReferenceFilterCollapseKey(kind: SourceKind, referenceKind: RelationshipFilterKey) {
  return `${kind}:${referenceKind}`;
}

function toggleSetValue<T>(current: ReadonlySet<T>, value: T) {
  const next = new Set(current);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
}
