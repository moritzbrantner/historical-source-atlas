import { describe, expect, it } from 'vitest';

import { getMessages } from '@/src/i18n/messages';
import { protectedWebsiteNamespaces } from '@/src/i18n/namespaces';

describe('message loading', () => {
  it('merges foundation namespaces with the active app namespaces', () => {
    const messages = getMessages('en', ['NavigationBar', 'HomePage']);
    const navigationBar = messages.NavigationBar as Record<string, unknown>;
    const categories = navigationBar.categories as Record<string, string>;
    const auth = navigationBar.auth as Record<string, string>;
    const links = navigationBar.links as Record<string, string>;
    const homePage = messages.HomePage as Record<string, unknown>;

    expect(categories.discover).toBe('Discover');
    expect(categories.social).toBe('Social');
    expect(auth.login).toBe('Log in');
    expect(links.home).toBe('Home');
    expect(homePage.title).toBeDefined();
  });

  it('loads protected page namespaces required by client components', () => {
    const messages = getMessages('en', protectedWebsiteNamespaces);
    const groupsPage = messages.GroupsPage as Record<string, unknown>;
    const create = groupsPage.create as Record<string, string>;

    expect(create.title).toBe('Create group');
  });
});
