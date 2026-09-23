import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Mounts its children on a dedicated <div id="print-portal"> appended directly to
// <body> — sidesteps this panel's own flex/absolute layout entirely, which is what a
// print stylesheet needs: plain elements in normal page flow for @page pagination.
export function PrintPortal({ children }: { children: React.ReactNode }) {
  const [container] = useState(() => {
    const el = document.createElement("div");
    el.id = "print-portal";
    return el;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(children, container);
}
