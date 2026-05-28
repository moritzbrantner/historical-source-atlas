import { redirect } from 'next/navigation';

import { StaticRedirectPage } from '@/components/static-redirect-page';
import { routing, withLocalePath } from '@/i18n/routing';
import { isGithubPagesBuild } from '@/src/runtime/build-target';

export default function RootRedirectPage() {
  if (isGithubPagesBuild) {
    return <StaticRedirectPage href={`./${routing.defaultLocale}/atlas/`} />;
  }

  redirect(withLocalePath('/atlas', routing.defaultLocale));
}
