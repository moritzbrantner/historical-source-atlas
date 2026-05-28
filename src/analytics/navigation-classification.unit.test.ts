import { describe, expect, it } from 'vitest';

import { classifyNavigationPathname } from '@/src/analytics/navigation-classification';

describe('navigation classification', () => {
  it('strips locales and classifies explicit app routes', () => {
    expect(
      classifyNavigationPathname('/de/admin/reports/navigationJourneys'),
    ).toEqual({
      canonicalPath: '/admin/reports/[reportId]',
      routeGroup: 'admin',
      displayLabel: 'Admin report',
    });
    expect(classifyNavigationPathname('/en/blog/launch-post')).toEqual({
      canonicalPath: '/blog/[slug]',
      routeGroup: 'public',
      displayLabel: 'Blog post',
    });
    expect(classifyNavigationPathname('/en/friends')).toEqual({
      canonicalPath: '/friends',
      routeGroup: 'authenticated',
      displayLabel: 'Friends',
    });
    expect(classifyNavigationPathname('/en/settings/privacy')).toEqual({
      canonicalPath: '/settings/[section]',
      routeGroup: 'authenticated',
      displayLabel: 'Settings section',
    });
    expect(classifyNavigationPathname('/en/data-entry')).toEqual({
      canonicalPath: '/data-entry',
      routeGroup: 'admin',
      displayLabel: 'Data entry',
    });
  });

  it('classifies profile routes and registered showcase paths', () => {
    expect(classifyNavigationPathname('/en/profile/@alice/followers')).toEqual({
      canonicalPath: '/profile/[userId]/followers',
      routeGroup: 'public',
      displayLabel: 'Profile followers',
    });
    expect(classifyNavigationPathname('/en/forms')).toEqual({
      canonicalPath: '/[publicSlug*]',
      routeGroup: 'public',
      displayLabel: 'Public page',
    });
    expect(classifyNavigationPathname('/en/admin/problem-reports/1')).toEqual({
      canonicalPath: '/admin/problem-reports/[reportId]',
      routeGroup: 'admin',
      displayLabel: 'Admin problem report',
    });
  });
});
