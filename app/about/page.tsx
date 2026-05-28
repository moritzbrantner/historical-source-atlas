import { redirect } from 'next/navigation';

import { StaticRedirectPage } from '@/components/static-redirect-page';
import { routing, withLocalePath } from '@/i18n/routing';
import { isGithubPagesBuild } from '@/src/runtime/build-target';

export default function AboutRedirectPage() {
  if (isGithubPagesBuild) {
    return (
      <StaticRedirectPage href={`../${routing.defaultLocale}/atlas/about/`} />
    );
  }

  redirect(withLocalePath('/atlas/about', routing.defaultLocale));
}
