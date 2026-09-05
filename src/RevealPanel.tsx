import { useEffect, useRef, useState, type ReactNode } from "react";

export function RevealPanel({
  side,
  label,
  children,
}: {
  side: "top" | "left";
  label: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [tapped, setTapped] = useState(false);
  const open = hovered || keyboard || tapped;
  useEffect(() => {
    if (!tapped) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setTapped(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [tapped]);

  return (
    <div
      ref={root}
      className={`reveal-zone reveal-${side}`}
      data-open={open}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (event.target.matches(":focus-visible")) setKeyboard(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboard(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setHovered(false);
          setKeyboard(false);
          setTapped(false);
          document.getElementById("main")?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        className="edge-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`panel-${side}`}
        onClick={() => setTapped(!tapped)}
      >
        <span aria-hidden="true">{side === "left" ? "☰" : "⋯"}</span>
      </button>
      <div id={`panel-${side}`} className="reveal-panel" inert={!open}>
        {children}
      </div>
    </div>
  );
}
