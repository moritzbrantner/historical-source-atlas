// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HistoricalSource, SourceKind } from "../../entities/source/model/sourceTypes";
import { RelatedSources } from "./RelatedSources";

const currentSource = sourceFixture("current-source", "Current Source", "Shared Region", -300);
const relatedSources = [
  currentSource,
  sourceFixture("related-one", "Related One", "Shared Region", -250),
  sourceFixture("related-two", "Related Two", "Shared Region", -200),
  sourceFixture("related-three", "Related Three", "Shared Region", -150),
  sourceFixture("related-four", "Related Four", "Shared Region", -100),
  sourceFixture("other-region", "Other Region Source", "Other Region", -50),
];

afterEach(() => {
  cleanup();
});

describe("RelatedSources", () => {
  it("shows source context facts", () => {
    render(
      <RelatedSources source={currentSource} sources={relatedSources} onOpenSource={() => {}} />,
    );

    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("Shared Region")).toBeInTheDocument();
    expect(screen.getByText("Discovery year")).toBeInTheDocument();
    expect(screen.getByText(`${currentSource.properties.discoveredYear}`)).toBeInTheDocument();
    expect(screen.getByText("Source year")).toBeInTheDocument();
    expect(screen.getByText("300 BC")).toBeInTheDocument();
  });

  it("shows at most three related sources from the same region and excludes the current source", () => {
    render(
      <RelatedSources source={currentSource} sources={relatedSources} onOpenSource={() => {}} />,
    );

    expect(screen.queryByRole("button", { name: /Current Source/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Related One/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Related Two/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Related Three/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Related Four/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Other Region Source/ })).not.toBeInTheDocument();
  });

  it("opens related sources", async () => {
    const user = userEvent.setup();
    const onOpenSource = vi.fn();
    render(
      <RelatedSources
        source={currentSource}
        sources={relatedSources}
        onOpenSource={onOpenSource}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Related One/ }));

    expect(onOpenSource).toHaveBeenCalledWith("related-one");
  });
});

function sourceFixture(
  id: string,
  label: string,
  region: string,
  sourceYear: number,
  kind: SourceKind = "text",
): HistoricalSource {
  return {
    id,
    label,
    latitude: 1,
    longitude: 2,
    metrics: { importance: 5 },
    properties: {
      currentRepository: "Repository",
      discovered: "1900",
      discoveredYear: 1900,
      discoveryContext: "Discovery context",
      kind,
      location: "Location",
      period: `${Math.abs(sourceYear)} BC`,
      referencedIn: [],
      references: [],
      region,
      sourceYear,
      summary: "Summary",
    },
  };
}
