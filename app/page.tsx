import { AtlasProviders } from '@/src/atlas/app/AtlasProviders';
import { AtlasRoute } from '@/src/atlas/app/AtlasRoute';

export default function AtlasHomePage() {
  return (
    <AtlasProviders>
      <AtlasRoute />
    </AtlasProviders>
  );
}
