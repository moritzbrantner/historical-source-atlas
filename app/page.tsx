import { AtlasProviders } from '@/src/atlas/app/AtlasProviders';
import { AtlasRoute } from '@/src/atlas/app/AtlasRoute';
import { AtlasWebShell } from '@/src/atlas/app/AtlasWebShell';

export default function AtlasHomePage() {
  return (
    <AtlasProviders>
      <AtlasWebShell>
        <AtlasRoute />
      </AtlasWebShell>
    </AtlasProviders>
  );
}
