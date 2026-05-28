import { describe, expect, it } from "vitest";

import { getSourcePath, readRoute } from "./routing";

describe("routing", () => {
  it("reads root as the atlas route", () => {
    expect(readRoute("/")).toEqual({ view: "atlas" });
  });

  it("reads unknown paths as the atlas route", () => {
    expect(readRoute("/other/path")).toEqual({ view: "atlas" });
  });

  it("reads source routes", () => {
    expect(readRoute("/sources/dead-sea-scrolls")).toEqual({
      sourceId: "dead-sea-scrolls",
      view: "source",
    });
  });

  it("accepts trailing slashes on source routes", () => {
    expect(readRoute("/sources/dead-sea-scrolls/")).toEqual({
      sourceId: "dead-sea-scrolls",
      view: "source",
    });
  });

  it("round-trips encoded source ids", () => {
    const sourceId = "source with spaces";

    expect(getSourcePath(sourceId)).toBe("/sources/source%20with%20spaces");
    expect(readRoute(getSourcePath(sourceId))).toEqual({
      sourceId,
      view: "source",
    });
  });
});
