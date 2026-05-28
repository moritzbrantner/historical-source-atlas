import { useCallback, useEffect, useState } from "react";

import { AtlasPage } from "../features/atlas/AtlasPage";
import { SourcePage } from "../features/source-detail/SourcePage";
import { pushAtlasRoute, pushSourceRoute, readRoute, type PageRoute } from "./routing";

export function App() {
  const [route, setRoute] = useState<PageRoute>(() => readRoute(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readRoute(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const openAtlas = useCallback(() => {
    pushAtlasRoute();
    setRoute({ view: "atlas" });
  }, []);

  const openSourcePage = useCallback((sourceId: string) => {
    pushSourceRoute(sourceId);
    setRoute({ sourceId, view: "source" });
  }, []);

  if (route.view === "source") {
    return (
      <SourcePage
        sourceId={route.sourceId}
        onBackToAtlas={openAtlas}
        onOpenSource={openSourcePage}
      />
    );
  }

  return <AtlasPage onOpenSource={openSourcePage} />;
}
