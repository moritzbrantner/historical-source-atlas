import { describe, expect, it } from "vitest";

import { historicalSources } from "../api/staticSourceData";
import type { HistoricalSourceFeature } from "./sourceReferences";
import { createSourceReferenceFlows, getFeatureProperties } from "./sourceReferences";

const deadSeaScrolls = historicalSources.find((source) => source.id === "dead-sea-scrolls")!;

describe("sourceReferences", () => {
  it("creates incoming and outgoing flows for known labels", () => {
    const flows = createSourceReferenceFlows(deadSeaScrolls);

    expect(flows.some((flow) => flow.properties.direction === "incoming")).toBe(true);
    expect(flows.some((flow) => flow.properties.direction === "outgoing")).toBe(true);
  });

  it("ignores unknown relationship labels", () => {
    const flows = createSourceReferenceFlows({
      ...deadSeaScrolls,
      properties: {
        ...deadSeaScrolls.properties,
        referencedIn: [{ label: "Unknown reference", note: "Missing location", relation: "cites" }],
        references: [],
      },
    });

    expect(flows).toEqual([]);
  });

  it("creates stable slugified flow ids", () => {
    const flows = createSourceReferenceFlows(deadSeaScrolls);

    expect(flows.map((flow) => flow.id)).toContain(
      "dead-sea-scrolls-incoming-qumran-cave-inventories",
    );
    expect(flows.map((flow) => flow.id)).toContain(
      "dead-sea-scrolls-outgoing-hebrew-bible-traditions",
    );
  });

  it("sets incoming direction from reference location to source location", () => {
    const incoming = createSourceReferenceFlows(deadSeaScrolls).find(
      (flow) => flow.label === "Biblical manuscript studies",
    )!;

    expect(incoming.properties.direction).toBe("incoming");
    expect(incoming.from).toEqual([35.214, 31.768]);
    expect(incoming.to).toEqual([deadSeaScrolls.longitude, deadSeaScrolls.latitude]);
  });

  it("sets outgoing direction from source location to reference location", () => {
    const outgoing = createSourceReferenceFlows(deadSeaScrolls).find(
      (flow) => flow.label === "Hebrew Bible traditions",
    )!;

    expect(outgoing.properties.direction).toBe("outgoing");
    expect(outgoing.from).toEqual([deadSeaScrolls.longitude, deadSeaScrolls.latitude]);
    expect(outgoing.to).toEqual([35.214, 31.768]);
  });

  it("offsets coincident coordinates", () => {
    const coincident = createSourceReferenceFlows(deadSeaScrolls).find(
      (flow) => flow.label === "Qumran cave inventories",
    )!;

    expect(coincident.from).not.toEqual(coincident.to);
    expect(coincident.to).toEqual([deadSeaScrolls.longitude, deadSeaScrolls.latitude]);
  });

  it("returns point feature properties", () => {
    const feature = {
      coordinates: [deadSeaScrolls.longitude, deadSeaScrolls.latitude],
      point: deadSeaScrolls,
    } as HistoricalSourceFeature;

    expect(getFeatureProperties(feature)).toBe(deadSeaScrolls.properties);
  });
});
