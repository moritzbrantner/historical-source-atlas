import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const defaultIncludedImpacts = ["serious", "critical"] as const;
type IncludedImpact = "minor" | "moderate" | "serious" | "critical";

export type AccessibilityOptions = {
  exclude?: string[];
  includedImpacts?: IncludedImpact[];
};

export async function expectNoA11yViolations(page: Page, options: AccessibilityOptions = {}) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);

  for (const selector of options.exclude ?? []) {
    builder = builder.exclude(selector);
  }

  const results = await builder.analyze();
  const includedImpacts: IncludedImpact[] = options.includedImpacts ?? [...defaultIncludedImpacts];
  const violations = results.violations.filter(
    (violation) =>
      violation.impact !== null &&
      violation.impact !== undefined &&
      includedImpacts.includes(violation.impact),
  );

  expect(formatViolations(violations)).toEqual([]);
}

function formatViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations.map((violation) => ({
    description: violation.description,
    help: violation.help,
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(", ")),
  }));
}
