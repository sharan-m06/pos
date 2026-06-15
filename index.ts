import { registerRootComponent } from "expo";

import App from "./src/App";

if (typeof document !== "undefined") {
  let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.name = "viewport";
    document.head.appendChild(viewport);
  }
  viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0";
}

registerRootComponent(App);
