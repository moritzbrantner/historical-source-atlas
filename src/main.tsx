import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@moritzbrantner/ui/atlas/styles.css";
import "@moritzbrantner/maps/styles.css";
import "./styles.css";

import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
