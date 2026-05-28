import { describe, expect, it } from 'vitest';

import {
  resolveEnabledPublicRoute,
  resolvePublicRoute,
  type FoundationFeatureKey,
} from '@moritzbrantner/app-pack';

import showcaseManifest from '@/apps/showcase/manifest';

const supportedLocales = ['en', 'de', 'fr', 'es'] as const;

function slugToSegments(slug: string) {
  return slug.length > 0 ? slug.split('/') : undefined;
}

describe('showcase manifest contract', () => {
  it('keeps navigation entries aligned with declared public pages', () => {
    const publicPageIds = new Set(
      showcaseManifest.publicPages.map((page) => page.id),
    );

    expect(
      showcaseManifest.publicNavigation
        .map((item) => item.pageId)
        .every((pageId) => publicPageIds.has(pageId)),
    ).toBe(true);
  });

  it('resolves each canonical public page slug through the manifest', () => {
    for (const page of showcaseManifest.publicPages) {
      const resolved = resolvePublicRoute(
        showcaseManifest,
        slugToSegments(page.slug),
      );
      expect(resolved?.page.id).toBe(page.id);
    }
  });

  it('registers the showcase examples behind feature-gated routes and aliases', () => {
    const registeredExamples = [
      ['forms', 'showcase.forms'],
      ['communication', 'showcase.communication'],
      ['chat', 'showcase.chat'],
      ['uploads', 'showcase.uploads'],
      ['remocn', 'showcase.remocn'],
      ['table', 'showcase.employeeTable'],
    ] as const satisfies readonly [string, FoundationFeatureKey][];

    expect(showcaseManifest.publicPages.map((page) => page.id)).toEqual([
      'home',
      'about',
      ...registeredExamples.map(([pageId]) => pageId),
    ]);

    for (const [pageId, featureKey] of registeredExamples) {
      expect(
        resolveEnabledPublicRoute(showcaseManifest, ['examples', pageId])?.page
          .id,
      ).toBe(pageId);
      expect(
        resolveEnabledPublicRoute(showcaseManifest, [pageId])?.page.id,
      ).toBe(pageId);

      const disabledManifest = {
        ...showcaseManifest,
        enabledFeatures: {
          ...showcaseManifest.enabledFeatures,
          [featureKey]: false,
        },
      };

      expect(
        resolveEnabledPublicRoute(disabledManifest, ['examples', pageId]),
      ).toBeNull();
      expect(resolveEnabledPublicRoute(disabledManifest, [pageId])).toBeNull();
    }
  });

  it('exposes feature-gated showcase API routes', async () => {
    expect(Object.keys(showcaseManifest.exampleApis)).toEqual(['employees']);
    expect(showcaseManifest.exampleApis.employees?.featureKey).toBe(
      'showcase.employeeTable',
    );
  });

  it('supports every configured locale', () => {
    for (const locale of supportedLocales) {
      const messages = showcaseManifest.loadMessages(locale);
      expect(messages.NavigationBar).toBeDefined();
    }
  });
});
