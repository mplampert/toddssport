/**
 * Human-friendly labels for product view enums.
 *
 * Internal enums: front, back, left_sleeve, right_sleeve, other
 * Display labels: Front, Back, Left Sleeve, Right Sleeve, Detail
 */

export type ViewEnum = "front" | "back" | "left_sleeve" | "right_sleeve" | "other";

/** Canonical display order */
export const VIEW_ORDER: ViewEnum[] = ["front", "back", "left_sleeve", "right_sleeve", "other"];

const DEFAULT_LABELS: Record<ViewEnum, string> = {
  front: "Front",
  back: "Back",
  left_sleeve: "Left Sleeve",
  right_sleeve: "Right Sleeve",
  other: "Detail",
};

/**
 * Get the human-friendly label for a view enum.
 * Supports an optional override map for store-specific wording.
 */
export function getViewLabel(
  view: string,
  overrides?: Record<string, string> | null,
): string {
  if (overrides?.[view]) return overrides[view];
  return DEFAULT_LABELS[view as ViewEnum] ?? view;
}
