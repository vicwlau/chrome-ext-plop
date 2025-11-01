/**
 * Injects an area selector overlay into the current page
 * Allows user to select an area directly from the browser screen
 */

export interface AreaSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Injects the area selector overlay into the active tab
 * Returns the selected coordinates when user confirms
 */
export async function injectAreaSelectorOverlay(): Promise<AreaSelection | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  // Inject the selection overlay script into the page
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: createAreaSelectorOverlay,
  });

  return result.result ?? null;
}

/**
 * This function runs in the context of the web page
 * Creates an interactive overlay for area selection
 */
function createAreaSelectorOverlay(): Promise<AreaSelection | null> {
  return new Promise((resolve) => {
    // Create overlay container
    const overlay = document.createElement("div");
    overlay.id = "chrome-ext-area-selector";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      cursor: crosshair;
    `;

    // Create selection box
    const selectionBox = document.createElement("div");
    selectionBox.style.cssText = `
      position: absolute;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      display: none;
      pointer-events: none;
    `;
    overlay.appendChild(selectionBox);

    // Create dimension label
    const dimensionLabel = document.createElement("div");
    dimensionLabel.style.cssText = `
      position: absolute;
      background: #3b82f6;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 500;
      display: none;
      pointer-events: none;
      z-index: 1;
    `;
    overlay.appendChild(dimensionLabel);

    // Create instruction text
    const instructions = document.createElement("div");
    instructions.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      pointer-events: none;
    `;
    instructions.textContent = "Click and drag to select area • ESC to cancel";
    overlay.appendChild(instructions);

    let startX = 0;
    let startY = 0;
    let isSelecting = false;
    let hasStartedDrag = false;

    // Mouse down - start selection
    const handleMouseDown = (e: MouseEvent) => {
      if (e.target !== overlay) return;

      isSelecting = true;
      hasStartedDrag = false;
      startX = e.clientX;
      startY = e.clientY;

      selectionBox.style.left = startX + "px";
      selectionBox.style.top = startY + "px";
      selectionBox.style.width = "0px";
      selectionBox.style.height = "0px";
      selectionBox.style.display = "block";
      dimensionLabel.style.display = "block";
    };

    // Mouse move - update selection
    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting) return;

      hasStartedDrag = true;
      const currentX = e.clientX;
      const currentY = e.clientY;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selectionBox.style.left = x + "px";
      selectionBox.style.top = y + "px";
      selectionBox.style.width = width + "px";
      selectionBox.style.height = height + "px";

      // Update dimension label
      dimensionLabel.textContent = `${Math.round(width)} × ${Math.round(
        height
      )}`;
      dimensionLabel.style.left = x + "px";
      dimensionLabel.style.top = Math.max(0, y - 30) + "px";
    };

    // Mouse up - finish selection
    const handleMouseUp = (e: MouseEvent) => {
      if (!isSelecting) return;

      // If user clicks without dragging, cancel the selection
      if (!hasStartedDrag) {
        isSelecting = false;
        hasStartedDrag = false;
        cleanup();
        resolve(null);
        return;
      }

      isSelecting = false;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      // Clean up
      cleanup();

      // Only return if area has meaningful size
      if (width > 10 && height > 10) {
        // Get device pixel ratio to account for high-DPI displays
        const dpr = window.devicePixelRatio || 1;

        resolve({
          x: Math.round(x * dpr), // Scale to device pixels
          y: Math.round(y * dpr), // Scale to device pixels
          width: Math.round(width * dpr), // Scale to device pixels
          height: Math.round(height * dpr), // Scale to device pixels
        });
      } else {
        resolve(null);
      }
    };

    // ESC key - cancel selection
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        cleanup();
        resolve(null);
      }
    };

    // Cleanup function
    const cleanup = () => {
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("mousemove", handleMouseMove);
      overlay.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      overlay.removeEventListener("keydown", handleKeyDown, true);
      overlay.remove();
    };

    // Inject overlay into page FIRST
    document.body.appendChild(overlay);

    // Add event listeners to multiple targets to ensure capture
    overlay.addEventListener("mousedown", handleMouseDown);
    overlay.addEventListener("mousemove", handleMouseMove);
    overlay.addEventListener("mouseup", handleMouseUp);

    // Add keydown listeners to document, window, AND overlay with capture phase
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    overlay.addEventListener("keydown", handleKeyDown, true);

    // Focus the overlay to ensure it receives keyboard events (after it's in DOM)
    overlay.setAttribute("tabindex", "-1");
    overlay.focus();

    // Auto-cleanup after 2 minutes
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        cleanup();
        resolve(null);
      }
    }, 120000);
  });
}
