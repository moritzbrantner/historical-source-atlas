import { describe, expect, it } from "vitest";

import { sourceKindColors, sourceKindLabels } from "../model/sourceConstants";
import { historicalSources } from "./staticSourceData";

describe("staticSourceData", () => {
  it("has unique URL-safe source ids", () => {
    const ids = historicalSources.map((source) => source.id);

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    });
  });

  it("has unique labels", () => {
    const labels = historicalSources.map((source) => source.label);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has required text fields", () => {
    historicalSources.forEach((source) => {
      expect(source.label.trim()).not.toBe("");
      expect(source.properties.currentRepository.trim()).not.toBe("");
      expect(source.properties.discovered.trim()).not.toBe("");
      expect(source.properties.discoveryContext.trim()).not.toBe("");
      expect(source.properties.location.trim()).not.toBe("");
      expect(source.properties.period.trim()).not.toBe("");
      expect(source.properties.region.trim()).not.toBe("");
      expect(source.properties.summary.trim()).not.toBe("");
    });
  });

  it("has valid coordinates", () => {
    historicalSources.forEach((source) => {
      expect(Number.isFinite(source.latitude)).toBe(true);
      expect(source.latitude).toBeGreaterThanOrEqual(-90);
      expect(source.latitude).toBeLessThanOrEqual(90);
      expect(Number.isFinite(source.longitude)).toBe(true);
      expect(source.longitude).toBeGreaterThanOrEqual(-180);
      expect(source.longitude).toBeLessThanOrEqual(180);
    });
  });

  it("has bounded importance and finite non-zero years", () => {
    historicalSources.forEach((source) => {
      expect(source.metrics.importance).toBeGreaterThanOrEqual(1);
      expect(source.metrics.importance).toBeLessThanOrEqual(10);
      expect(Number.isFinite(source.properties.discoveredYear)).toBe(true);
      expect(source.properties.discoveredYear).not.toBe(0);
      expect(Number.isFinite(source.properties.sourceYear)).toBe(true);
      expect(source.properties.sourceYear).not.toBe(0);
    });
  });

  it("uses known source kinds with labels and colors", () => {
    historicalSources.forEach((source) => {
      expect(sourceKindLabels[source.properties.kind]).toBeTruthy();
      expect(sourceKindColors[source.properties.kind]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("has complete relationship entries", () => {
    historicalSources.forEach((source) => {
      [...source.properties.references, ...source.properties.referencedIn].forEach((entry) => {
        expect(entry.label.trim()).not.toBe("");
        expect(entry.note.trim()).not.toBe("");
        expect(entry.relation.trim()).not.toBe("");
      });
    });
  });

  it("contains the default selected source", () => {
    expect(historicalSources.some((source) => source.id === "dead-sea-scrolls")).toBe(true);
  });
});
