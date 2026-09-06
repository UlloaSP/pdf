import { cn } from "@/lib/utils";
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
      className={cn(
        "group/reveal fixed",
        side === "top"
          ? "inset-x-0 top-0 z-30 h-(--frame) data-[open=true]:h-10"
          : "top-(--frame) bottom-0 left-0 z-20 w-(--frame) data-[open=true]:w-[calc(250px+var(--frame))]",
      )}
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
        className={cn(
          "absolute inset-0 border-0 bg-transparent p-0 text-frame-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          side === "top" ? "h-(--frame) w-full" : "h-full w-(--frame)",
        )}
        aria-label={label}
        aria-expanded={open}
        aria-controls={`panel-${side}`}
        onClick={() => setTapped(!tapped)}
      >
        <span
          className="opacity-0 [@media(hover:none)]:text-[10px] [@media(hover:none)]:opacity-80"
          aria-hidden="true"
        >
          {side === "left" ? "☰" : "⋯"}
        </span>
      </button>
      <div
        id={`panel-${side}`}
        className={cn(
          "pointer-events-none absolute opacity-0 transition-[transform,opacity] duration-(--animation) ease-out group-data-[open=true]/reveal:pointer-events-auto group-data-[open=true]/reveal:translate-0 group-data-[open=true]/reveal:opacity-100",
          side === "top"
            ? "inset-x-(--frame) top-0 -translate-y-full"
            : "inset-y-(--frame) left-(--frame) w-[250px] -translate-x-[calc(100%+var(--frame))]",
        )}
        inert={!open}
      >
        {children}
      </div>
    </div>
  );
}
