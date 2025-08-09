import type { Transformation } from "@meta-sql/open-lineage";

export interface EdgeStyle {
  color: string;
  strokeDasharray: string;
  strokeWidth: number;
  animated?: boolean;
}

export const getEdgeStyle = (
  transformation: Transformation | undefined
): EdgeStyle => {
  const type = transformation?.type || "DIRECT";
  const isIndirect = type === "INDIRECT";
  const isMasked = transformation?.masking === true;

  // Use black for all edges (will be CSS variable for theme support)
  const color = "var(--foreground)"; // Black/dark in light mode, white/light in dark mode
  let strokeDasharray = "0"; // Solid line by default
  const strokeWidth = 2; // Same width for all edges

  let isAnimated = false;

  // Apply dasharray only for indirect transformations or masked data
  if (isIndirect || isMasked) {
    isAnimated = true;

    if (isIndirect && isMasked) {
      strokeDasharray = "16,8,4,8"; // Complex pattern for both indirect and masked
    } else if (isIndirect) {
      strokeDasharray = "16,8"; // Longer dashes for indirect
    } else if (isMasked) {
      strokeDasharray = "8,6"; // Medium dashes for masked
    }
  }

  return {
    color,
    strokeDasharray,
    strokeWidth,
    animated: isAnimated,
  };
};
