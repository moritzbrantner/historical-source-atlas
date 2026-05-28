import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@moritzbrantner/ui/atlas/styles.css";
import "@moritzbrantner/maps/styles.css";
import "./styles.css";

import { App } from "./app/App";
import { AppProviders } from "./app/providers";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
