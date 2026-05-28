export type PageRoute =
  | {
      view: "atlas";
    }
  | {
      sourceId: string;
      view: "source";
    };

export function readRoute(pathname: string): PageRoute {
  const sourceMatch = /^\/sources\/([^/]+)\/?$/.exec(pathname);

  if (sourceMatch?.[1]) {
    return {
      sourceId: decodeURIComponent(sourceMatch[1]),
      view: "source",
    };
  }

  return { view: "atlas" };
}

export function getSourcePath(sourceId: string) {
  return `/sources/${encodeURIComponent(sourceId)}`;
}

export function pushAtlasRoute() {
  window.history.pushState(null, "", "/");
}

export function pushSourceRoute(sourceId: string) {
  window.history.pushState(null, "", getSourcePath(sourceId));
}
