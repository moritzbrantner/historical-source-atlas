'use client';

import { useEffectEvent, useLayoutEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  parseConsentCookie,
  CONSENT_COOKIE_NAME,
} from '@/src/privacy/contracts';
import {
  buildAnalyticsCookie,
  NAVIGATION_LAST_HREF_STORAGE_KEY,
  NAVIGATION_LAST_TRACKED_AT_STORAGE_KEY,
  NAVIGATION_SESSION_COOKIE_NAME,
  NAVIGATION_SESSION_TTL_SECONDS,
  NAVIGATION_VISITOR_COOKIE_NAME,
  NAVIGATION_VISITOR_TTL_SECONDS,
  resolveNavigationTrackerState,
} from '@/src/analytics/navigation-tracker';

type NavigationAnalyticsTrackerProps = {
  enabled: boolean;
};

function getCurrentHref(pathname: string | null, search: string) {
  const nextPathname = pathname && pathname.length > 0 ? pathname : '/';
  return `${nextPathname}${search ? `?${search}` : ''}`;
}

function hasAnalyticsConsent(cookieString: string) {
  const consentCookie = cookieString
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${CONSENT_COOKIE_NAME}=`));

  return parseConsentCookie(
    consentCookie?.slice(CONSENT_COOKIE_NAME.length + 1),
  ).analytics;
}

function dispatchPageVisit(payload: {
  href: string;
  visitorId: string;
  sessionId: string;
  previousHref: string | null;
  occurredAt: string;
  documentReferrer?: string;
}) {
  const requestBody = {
    href: payload.href,
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    occurredAt: payload.occurredAt,
    ...(payload.previousHref ? { previousHref: payload.previousHref } : {}),
    ...(payload.documentReferrer
      ? { documentReferrer: payload.documentReferrer }
      : {}),
  };
  const body = JSON.stringify(requestBody);

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    const queued = navigator.sendBeacon(
      '/api/analytics/page-visits',
      new Blob([body], { type: 'application/json' }),
    );

    if (queued) {
      return;
    }
  }

  void fetch('/api/analytics/page-visits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    // Tracking should never block route rendering.
  });
}

export function NavigationAnalyticsTracker({
  enabled,
}: NavigationAnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentHref = getCurrentHref(pathname, search);

  const trackNavigation = useEffectEvent(async (href: string) => {
    if (
      !enabled ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    if (!hasAnalyticsConsent(document.cookie)) {
      return;
    }

    const now = Date.now();
    const trackerState = resolveNavigationTrackerState({
      cookieString: document.cookie,
      currentHref: href,
      lastTrackedHref: window.sessionStorage.getItem(
        NAVIGATION_LAST_HREF_STORAGE_KEY,
      ),
      lastTrackedAt: window.sessionStorage.getItem(
        NAVIGATION_LAST_TRACKED_AT_STORAGE_KEY,
      ),
      now,
      createId: () => crypto.randomUUID(),
    });

    if (!trackerState.shouldTrack) {
      return;
    }

    window.sessionStorage.setItem(NAVIGATION_LAST_HREF_STORAGE_KEY, href);
    window.sessionStorage.setItem(
      NAVIGATION_LAST_TRACKED_AT_STORAGE_KEY,
      String(now),
    );
    document.cookie = buildAnalyticsCookie(
      NAVIGATION_VISITOR_COOKIE_NAME,
      trackerState.visitorId,
      NAVIGATION_VISITOR_TTL_SECONDS,
    );
    document.cookie = buildAnalyticsCookie(
      NAVIGATION_SESSION_COOKIE_NAME,
      trackerState.sessionId,
      NAVIGATION_SESSION_TTL_SECONDS,
    );

    dispatchPageVisit({
      href,
      visitorId: trackerState.visitorId,
      sessionId: trackerState.sessionId,
      previousHref: trackerState.previousHref,
      occurredAt: new Date(now).toISOString(),
      documentReferrer: document.referrer || undefined,
    });
  });

  useLayoutEffect(() => {
    void trackNavigation(currentHref);
  }, [currentHref]);

  useLayoutEffect(() => {
    const flushCurrentPageVisit = () => {
      void trackNavigation(currentHref);
    };

    window.addEventListener('pagehide', flushCurrentPageVisit);

    return () => {
      window.removeEventListener('pagehide', flushCurrentPageVisit);
    };
  }, [currentHref]);

  return null;
}
