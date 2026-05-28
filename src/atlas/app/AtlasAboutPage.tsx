import {
  PageContent,
  PageDescription,
  PageHeader,
  PageShell,
  PageTitle,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';

import { historicalSources } from '../entities/source/api/staticSourceData';

export function AtlasAboutPage() {
  const sourceCount = historicalSources.length;
  const regions = new Set(
    historicalSources.map((source) => source.properties.region),
  ).size;

  return (
    <PageShell maxWidth="wide">
      <PageHeader>
        <p className="mb-2 text-xs font-bold uppercase text-teal-700 dark:text-teal-300">
          Historical source atlas
        </p>
        <PageTitle>About the atlas</PageTitle>
        <PageDescription>
          A compact research interface for exploring historical texts,
          artifacts, inscriptions, and manuscripts by discovery place, date, and
          reference context.
        </PageDescription>
      </PageHeader>
      <PageContent className="grid gap-4 md:grid-cols-3">
        <Surface>
          <SurfaceHeader>
            <SurfaceTitle>Sources</SurfaceTitle>
          </SurfaceHeader>
          <SurfaceContent>
            <p className="text-3xl font-bold text-slate-950 dark:text-slate-50">
              {sourceCount}
            </p>
          </SurfaceContent>
        </Surface>
        <Surface>
          <SurfaceHeader>
            <SurfaceTitle>Regions</SurfaceTitle>
          </SurfaceHeader>
          <SurfaceContent>
            <p className="text-3xl font-bold text-slate-950 dark:text-slate-50">
              {regions}
            </p>
          </SurfaceContent>
        </Surface>
        <Surface>
          <SurfaceHeader>
            <SurfaceTitle>Views</SurfaceTitle>
          </SurfaceHeader>
          <SurfaceContent>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Map, timeline, relationship filters, source pages, and related
              source context are available in the same localized shell.
            </p>
          </SurfaceContent>
        </Surface>
      </PageContent>
    </PageShell>
  );
}
