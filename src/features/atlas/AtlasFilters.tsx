import { Checkbox, FilterBar } from "@moritzbrantner/ui";
import { useId } from "react";

import {
  allSourceKinds,
  sourceKindColors,
  sourceKindLabels,
} from "../../entities/source/model/sourceConstants";
import type {
  RelationshipScopeMode,
  SourceKindFilter,
  SourceKindFilters,
} from "../../entities/source/lib/sourceFiltering";
import type { SourceReferenceDirection } from "../../entities/source/lib/sourceReferences";
import type { SourceKind } from "../../entities/source/model/sourceTypes";

const maxRelationshipDepth = 5;

const relationshipScopeOptions: {
  label: string;
  mode: RelationshipScopeMode;
}[] = [
  { label: "All", mode: "all" },
  { label: "Selected references", mode: "referenced" },
  { label: "References selected", mode: "referencing" },
];

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
                  color={sourceKindColors[kind]}
                  filter={sourceKindFilters[kind]}
                  key={kind}
                  label={sourceKindLabels[kind]}
                  onFilterChange={(filter) => {
                    onSourceKindFiltersChange(
                      updateSourceKindFilter(sourceKindFilters, kind, filter),
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
  color,
  filter,
  label,
  onFilterChange,
}: {
  color: string;
  filter: SourceKindFilter;
  label: string;
  onFilterChange: (filter: SourceKindFilter) => void;
}) {
  const scopeId = useId();
  const depthId = useId();
  const depthDisabled = filter.mode === "all";

  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/5">
      <div className="flex min-w-0 items-center gap-2">
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="truncate text-xs font-bold text-slate-900">{label}</span>
      </div>

      <label className="sr-only" htmlFor={scopeId}>
        {label} scope
      </label>
      <select
        className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900"
        id={scopeId}
        value={filter.mode}
        onChange={(event) => {
          onFilterChange({
            ...filter,
            mode: event.target.value as RelationshipScopeMode,
          });
        }}
      >
        {relationshipScopeOptions.map((option) => (
          <option key={option.mode} value={option.mode}>
            {option.label}
          </option>
        ))}
      </select>

      <label
        className="grid gap-1 text-[11px] font-bold uppercase text-slate-500"
        htmlFor={depthId}
      >
        Depth
        <input
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={depthDisabled}
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
    </div>
  );
}

function getSourceKindFilterLabel(filters: SourceKindFilters) {
  const scopedKinds = allSourceKinds.filter((kind) => filters[kind].mode !== "all");

  if (scopedKinds.length === 0) {
    return "All source types";
  }

  if (scopedKinds.length === 1) {
    const kind = scopedKinds[0]!;
    const filter = filters[kind];
    const modeLabel =
      relationshipScopeOptions.find((option) => option.mode === filter.mode)?.label ?? "Scoped";

    return `${sourceKindLabels[kind]}: ${modeLabel}, depth ${filter.depth}`;
  }

  return `${scopedKinds.length} scoped source types`;
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
    [kind]: {
      depth: clampRelationshipDepth(filter.depth),
      mode: filter.mode,
    },
  };
}

function createDefaultSourceKindFilters(): SourceKindFilters {
  return Object.fromEntries(
    allSourceKinds.map((kind) => [
      kind,
      {
        depth: 1,
        mode: "all",
      },
    ]),
  ) as SourceKindFilters;
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
