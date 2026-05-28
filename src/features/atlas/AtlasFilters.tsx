import { FilterBar, NativeSelect } from "@moritzbrantner/ui";

import { sourceKindLabels } from "../../entities/source/model/sourceConstants";
import type { SourceKind } from "../../entities/source/model/sourceTypes";
import type { SourceFilter } from "./model/atlasTypes";

const sourceKindOptions: SourceFilter[] = ["all", "text", "artifact", "inscription", "manuscript"];

export function AtlasFilters({
  kindFilter,
  onKindFilterChange,
  onQueryChange,
  query,
  resultCount,
}: {
  kindFilter: SourceFilter;
  onKindFilterChange: (filter: SourceFilter) => void;
  onQueryChange: (query: string) => void;
  query: string;
  resultCount: number;
}) {
  return (
    <FilterBar
      className="w-full lg:w-auto"
      searchPlaceholder="Qumran, papyri, Iran..."
      searchValue={query}
      onSearchChange={onQueryChange}
      filters={[
        {
          id: "kind",
          label: "Type",
          value: kindFilter === "all" ? "All sources" : sourceKindLabels[kindFilter],
        },
      ]}
      actions={
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          <span>Type</span>
          <NativeSelect
            value={kindFilter}
            onChange={(event) => {
              onKindFilterChange(event.target.value as SourceFilter);
            }}
          >
            {sourceKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {kind === "all" ? "All sources" : sourceKindLabels[kind as SourceKind]}
              </option>
            ))}
          </NativeSelect>
        </label>
      }
    >
      <span className="sr-only">{resultCount} visible sources</span>
    </FilterBar>
  );
}
