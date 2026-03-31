import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { applyTheme, getInitialTheme } from "./preferences";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

applyTheme(getInitialTheme());

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
