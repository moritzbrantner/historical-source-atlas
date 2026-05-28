import {
  DescriptionList,
  DescriptionListDetail,
  DescriptionListItem,
  DescriptionListTerm,
} from "@moritzbrantner/ui";

import type { HistoricalSource } from "../../entities/source/model/sourceTypes";

export function SourceFacts({ source }: { source: HistoricalSource }) {
  return (
    <DescriptionList>
      <Fact label="Location" value={source.properties.location} />
      <Fact label="Discovery" value={source.properties.discovered} />
      <Fact label="Source date" value={source.properties.period} />
      <Fact label="Repository" value={source.properties.currentRepository} />
    </DescriptionList>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <DescriptionListItem>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDetail>{value}</DescriptionListDetail>
    </DescriptionListItem>
  );
}
