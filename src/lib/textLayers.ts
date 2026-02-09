/* ─── Text Layer Types & Helpers ─── */

export type TextLayerSource =
  | "static_text"
  | "personalization_name"
  | "personalization_number"
  | "name_number_template"
  | "personalization_custom_field";

export interface TextLayer {
  id?: string;
  team_store_item_id?: string;
  source: TextLayerSource;
  view: string; // front | back | left_sleeve | right_sleeve
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
  static_text: string | null;
  text_pattern: string | null;
  custom_field_id: string | null;
  font_family: string;
  font_weight: string;
  font_size_px: number;
  text_transform: string; // none | uppercase | lowercase
  fill_color: string;
  outline_color: string | null;
  outline_thickness: number;
  letter_spacing: number;
  line_height: number;
  alignment: string; // left | center | right
  variant_color: string | null;
  active: boolean;
  sort_order: number;
}

export const DEFAULT_TEXT_LAYER: Omit<TextLayer, "view"> = {
  source: "static_text",
  x: 0.5,
  y: 0.5,
  scale: 0.25,
  rotation: 0,
  z_index: 10,
  static_text: "TEXT",
  text_pattern: null,
  custom_field_id: null,
  font_family: "Arial",
  font_weight: "bold",
  font_size_px: 48,
  text_transform: "uppercase",
  fill_color: "#FFFFFF",
  outline_color: "#000000",
  outline_thickness: 2,
  letter_spacing: 2,
  line_height: 1.2,
  alignment: "center",
  variant_color: null,
  active: true,
  sort_order: 0,
};

export const TEXT_SOURCE_LABELS: Record<TextLayerSource, string> = {
  static_text: "Static Text",
  personalization_name: "Player Name",
  personalization_number: "Number",
  name_number_template: "Name + Number",
  personalization_custom_field: "Custom Field",
};

export const FONT_OPTIONS = [
  "Arial",
  "Impact",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Palatino",
  "Garamond",
];

/**
 * Resolve the display text for a text layer given personalization inputs.
 * Used on both admin preview and storefront live preview.
 */
export function resolveTextContent(
  layer: TextLayer,
  personalization?: {
    name?: string;
    number?: string;
    customFields?: Record<string, string>;
  }
): string {
  const pers = personalization ?? {};

  switch (layer.source) {
    case "static_text":
      return layer.static_text || "TEXT";

    case "personalization_name":
      return pers.name || "PLAYER NAME";

    case "personalization_number":
      return pers.number || "00";

    case "name_number_template": {
      let pattern = layer.text_pattern || "{LAST_NAME} {NUMBER}";
      const lastName = pers.name?.split(" ").pop() || "LAST NAME";
      const firstName = pers.name?.split(" ")[0] || "FIRST";
      pattern = pattern
        .replace(/\{LAST_NAME\}/g, lastName)
        .replace(/\{FIRST_NAME\}/g, firstName)
        .replace(/\{NAME\}/g, pers.name || "NAME")
        .replace(/\{NUMBER\}/g, pers.number || "00");
      return pattern;
    }

    case "personalization_custom_field":
      if (layer.custom_field_id && pers.customFields?.[layer.custom_field_id]) {
        return pers.customFields[layer.custom_field_id];
      }
      return "CUSTOM";

    default:
      return layer.static_text || "TEXT";
  }
}

/** Apply text transform rule */
export function applyTextTransform(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}

/** Build a text_layers snapshot for order items */
export function buildTextLayerSnapshot(
  layers: TextLayer[],
  personalization?: {
    name?: string;
    number?: string;
    customFields?: Record<string, string>;
  }
): Array<{
  view: string;
  text: string;
  font_family: string;
  font_weight: string;
  font_size_px: number;
  fill_color: string;
  outline_color: string | null;
  outline_thickness: number;
  text_transform: string;
  letter_spacing: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}> {
  return layers
    .filter((l) => l.active)
    .map((l) => {
      const rawText = resolveTextContent(l, personalization);
      return {
        view: l.view,
        text: applyTextTransform(rawText, l.text_transform),
        font_family: l.font_family,
        font_weight: l.font_weight,
        font_size_px: l.font_size_px,
        fill_color: l.fill_color,
        outline_color: l.outline_color,
        outline_thickness: l.outline_thickness,
        text_transform: l.text_transform,
        letter_spacing: l.letter_spacing,
        x: l.x,
        y: l.y,
        scale: l.scale,
        rotation: l.rotation,
      };
    });
}
