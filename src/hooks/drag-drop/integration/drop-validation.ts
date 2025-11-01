/**
 * Drop Validation Rules
 *
 * Central location for all drag-and-drop validation logic.
 * This module defines what can be dropped where and provides helper utilities.
 */

// ============================================================================
// TYPES
// ============================================================================

export type DragSource =
  | "browser"
  | "element-gallery"
  | "generated-gallery"
  | "desktop";

export type DropTarget = "canvas" | "element-gallery" | "generated-gallery";

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Defines all valid drop combinations.
 * Each source maps to an array of valid targets with descriptions.
 */
export const DROP_RULES = {
  browser: {
    targets: [
      "source-panel",
      "element-gallery",
      "canvas",
      "generated-gallery",
    ] as DropTarget[],
    description:
      "Browser images can be dropped on any panel, canvas, or generated gallery",
    note: "Requires content script to detect browser drags",
  },
  "element-gallery": {
    targets: ["canvas"] as DropTarget[],
    description: "Element gallery items can be positioned on canvas",
  },
  "generated-gallery": {
    targets: ["canvas"] as DropTarget[],
    description: "Generated images can be used as source",
  },
  desktop: {
    targets: ["element-gallery", "canvas", "generated-gallery"] as DropTarget[],
    description:
      "Desktop files can be dropped to element gallery, canvas, or generated gallery",
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Checks if a drag-drop combination is valid.
 *
 * @param source - The drag source (where item is dragged from)
 * @param target - The drop target (where item is dropped)
 * @returns true if combination is valid, false otherwise
 *
 * @example
 * isValidDropTarget("element-gallery", "canvas") // true
 * isValidDropTarget("generated-gallery", "element-gallery") // false
 */
export function isValidDropTarget(
  source: DragSource | null,
  target: DropTarget | null
): boolean {
  if (!source || !target) return false;

  const rule = DROP_RULES[source];
  if (!rule) return false;

  return rule.targets.includes(target);
}

/**
 * Gets all valid targets for a given source.
 * Useful for UI to show where an item can be dropped.
 *
 * @param source - The drag source
 * @returns Array of valid drop targets
 *
 * @example
 * getValidTargets("element-gallery") // ["canvas"]
 */
export function getValidTargets(source: DragSource): DropTarget[] {
  const rule = DROP_RULES[source];
  return rule ? [...rule.targets] : [];
}

/**
 * Gets all valid sources for a given target.
 * Useful for drop zones to know what they can accept.
 *
 * @param target - The drop target
 * @returns Array of valid drag sources
 *
 * @example
 * getValidSources("canvas") // ["browser", "element-gallery", "generated-gallery", "desktop"]
 */
export function getValidSources(target: DropTarget): DragSource[] {
  const sources: DragSource[] = [];

  for (const [source, rule] of Object.entries(DROP_RULES)) {
    if (rule.targets.includes(target)) {
      sources.push(source as DragSource);
    }
  }

  return sources;
}

/**
 * Gets a human-readable message for a drop attempt.
 *
 * @param source - The drag source
 * @param target - The drop target
 * @param isValid - Whether the drop is valid (from isValidDropTarget)
 * @returns A message string for UI feedback
 *
 * @example
 * getDropMessage("element-gallery", "canvas", true)
 * // "Drop to position element on canvas"
 *
 * getDropMessage("generated-gallery", "element-gallery", false)
 * // "Cannot drop generated gallery items here"
 */
export function getDropMessage(
  source: DragSource,
  target: DropTarget,
  isValid: boolean
): string {
  if (!isValid) {
    return `Cannot drop ${formatSource(source)} here`;
  }

  // Specific messages for common combinations
  if (source === "element-gallery" && target === "canvas") {
    return "Drop to position element on canvas";
  }

  if (source === "generated-gallery" && target === "canvas") {
    return "Drop to add as canvas element";
  }

  if (source === "browser" && target === "canvas") {
    return "Drop to add browser image as element";
  }

  if (source === "desktop" && target === "canvas") {
    return "Drop to add file as element";
  }

  if (source === "browser" && target === "generated-gallery") {
    return "Drop to add browser image to generated gallery";
  }

  if (source === "desktop" && target === "generated-gallery") {
    return "Drop to add file to generated gallery";
  }

  // Generic fallback
  return `Drop ${formatSource(source)} on ${formatTarget(target)}`;
}

/**
 * Gets the description for a drag source's rules.
 *
 * @param source - The drag source
 * @returns Description string or null if source not found
 */
export function getSourceDescription(source: DragSource): string | null {
  const rule = DROP_RULES[source];
  return rule?.description || null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a source name for display.
 */
function formatSource(source: DragSource): string {
  switch (source) {
    case "browser":
      return "browser image";
    case "element-gallery":
      return "element";
    case "generated-gallery":
      return "generated image";
    case "desktop":
      return "file";
    default:
      return source;
  }
}

/**
 * Formats a target name for display.
 */
function formatTarget(target: DropTarget): string {
  switch (target) {
    case "element-gallery":
      return "element gallery";
    case "canvas":
      return "canvas";
    case "generated-gallery":
      return "generated gallery";
    default:
      return target;
  }
}

// ============================================================================
// VALIDATION MATRIX (for documentation/debugging)
// ============================================================================

/**
 * Returns a full validation matrix for all combinations.
 * Useful for debugging or generating documentation.
 *
 * @example
 * const matrix = getValidationMatrix();
 * console.table(matrix);
 */
export function getValidationMatrix(): Record<
  DragSource,
  Record<DropTarget, boolean>
> {
  const matrix: any = {};
  const allSources: DragSource[] = [
    "browser",
    "element-gallery",
    "generated-gallery",
    "desktop",
  ];
  const allTargets: DropTarget[] = [
    "element-gallery",
    "canvas",
    "generated-gallery",
  ];

  for (const source of allSources) {
    matrix[source] = {};
    for (const target of allTargets) {
      matrix[source][target] = isValidDropTarget(source, target);
    }
  }

  return matrix;
}
