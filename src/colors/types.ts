import type { ComponentType } from "react";

export interface ColorToolProps {
  /** Normalized sRGB color, always #rrggbb. */
  color: string;
  /** Accepts #RGB or #RRGGBB; invalid values are ignored by the shell. */
  onColorChange: (hex: string) => void;
}

export interface ColorTool {
  id: string;
  name: string;
  description: string;
  order: number;
  Component: ComponentType<ColorToolProps>;
}
