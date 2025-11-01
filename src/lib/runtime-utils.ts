/**
 * Runtime utility functions for detecting and safely accessing Chrome Extension APIs
 */

/**
 * Check if running in Chrome extension context
 * @returns true if browser.runtime is available and has an extension ID
 */
export function isExtensionContext(): boolean {
  try {
    return typeof browser !== "undefined" && !!browser.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * Safely access browser APIs with fallback
 * Useful for code that should work in both extension and standalone modes
 *
 * @example
 * const result = safeRuntimeCall(
 *   () => browser.runtime.sendMessage({...}),
 *   null // fallback value
 * );
 */
export function safeRuntimeCall<T>(fn: () => T, fallback: T): T {
  try {
    if (isExtensionContext()) {
      return fn();
    }
  } catch (error) {
    console.warn("[Runtime] Extension API not available:", error);
  }
  return fallback;
}
