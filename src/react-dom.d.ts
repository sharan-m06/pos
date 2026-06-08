declare module "react-dom" {
  import type React from "react";

  export function createPortal(children: React.ReactNode, container: Element | DocumentFragment): React.ReactPortal;
}
