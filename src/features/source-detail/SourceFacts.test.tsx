// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { historicalSources } from "../../entities/source/api/staticSourceData";
import { SourceFacts } from "./SourceFacts";

const source = historicalSources[0]!;

describe("SourceFacts", () => {
  it("renders core source facts", () => {
    render(<SourceFacts source={source} />);

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText(source.properties.location)).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText(source.properties.discovered)).toBeInTheDocument();
    expect(screen.getByText("Source date")).toBeInTheDocument();
    expect(screen.getByText(source.properties.period)).toBeInTheDocument();
    expect(screen.getByText("Repository")).toBeInTheDocument();
    expect(screen.getByText(source.properties.currentRepository)).toBeInTheDocument();
  });
});
