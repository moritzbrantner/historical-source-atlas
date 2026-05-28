import { Stat, StatGroup, StatLabel, StatValue } from '@moritzbrantner/ui';

export type MetricStat = {
  label: string;
  value: number | string;
};

export function MetricStats({ stats }: { stats: MetricStat[] }) {
  return (
    <StatGroup>
      {stats.map((stat) => (
        <Stat key={stat.label}>
          <StatValue>{stat.value}</StatValue>
          <StatLabel>{stat.label}</StatLabel>
        </Stat>
      ))}
    </StatGroup>
  );
}
