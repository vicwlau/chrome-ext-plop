/**
 * Chrome Screenshot & Capture Utilities
 * Provides functions to capture visible tab content, selected areas, and full pages
 */

/**
 * Generates a simple UUID v4 without external libraries
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CaptureOptions {
  format?: "png" | "jpeg";
  quality?: number; // 0-100, only for jpeg
}

export interface CaptureResult {
  dataUrl: string;
  width?: number;
  height?: number;
  timestamp: number;
}

/**
 * Captures the visible area of the currently active tab
 * @param options - Capture format and quality options
 * @returns Promise with the captured image as a data URL
 */
export async function captureVisibleTab(
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const { format = "png", quality = 92 } = options;

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    // Capture the visible area
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, {
      format,
      quality: format === "jpeg" ? quality : undefined,
    });

    return {
      dataUrl,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error capturing visible tab:", error);
    throw new Error(
      `Failed to capture screenshot: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Captures a specific area of the current tab using coordinates
 * Requires the tab to be captured first, then crops the image
 *
 * NOTE: Coordinates should be in device pixels (already scaled by devicePixelRatio)
 * to match the captured screenshot from captureVisibleTab()
 *
 * @param x - X coordinate of the top-left corner (in device pixels)
 * @param y - Y coordinate of the top-left corner (in device pixels)
 * @param width - Width of the area to capture (in device pixels)
 * @param height - Height of the area to capture (in device pixels)
 * @param options - Capture format and quality options
 * @returns Promise with the cropped image as a data URL
 */
export async function captureArea(
  x: number,
  y: number,
  width: number,
  height: number,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  try {
    // First capture the full visible tab
    const fullCapture = await captureVisibleTab(options);

    // Create a canvas to crop the image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Load the captured image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = fullCapture.dataUrl;
    });

    console.log("[Capture] Image dimensions and crop area:", {
      imageSize: { width: img.width, height: img.height },
      cropArea: { x, y, width, height },
      note: "Coordinates should be in device pixels (scaled by DPR)",
    });

    // Set canvas size to the desired crop area
    canvas.width = width;
    canvas.height = height;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      x,
      y, // Source x, y
      width,
      height, // Source width, height
      0,
      0, // Destination x, y
      width,
      height // Destination width, height
    );

    // Convert canvas to data URL
    const format = options.format === "jpeg" ? "image/jpeg" : "image/png";
    const quality = options.format === "jpeg" ? options.quality! / 100 : 1;
    const croppedDataUrl = canvas.toDataURL(format, quality);

    return {
      dataUrl: croppedDataUrl,
      width,
      height,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error capturing area:", error);
    throw new Error(
      `Failed to capture area: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Captures the entire page (including scrollable areas)
 * Note: This requires scrolling the page and capturing multiple screenshots
 * @param options - Capture format and quality options
 * @returns Promise with the full page screenshot as a data URL
 */
export async function captureFullPage(
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    // Inject a script to get page dimensions and scroll
    const [{ result: pageInfo }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          currentScrollX: window.scrollX,
          currentScrollY: window.scrollY,
        };
      },
    });

    if (!pageInfo) {
      throw new Error("Failed to get page information");
    }

    const { scrollWidth, scrollHeight, clientWidth, clientHeight } = pageInfo;

    // Calculate how many screenshots we need
    const cols = Math.ceil(scrollWidth / clientWidth);
    const rows = Math.ceil(scrollHeight / clientHeight);

    // Create canvas for the full page
    const canvas = document.createElement("canvas");
    canvas.width = scrollWidth;
    canvas.height = scrollHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Capture screenshots in a grid pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * clientWidth;
        const y = row * clientHeight;

        // Scroll to position
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: (scrollX, scrollY) => {
            window.scrollTo(scrollX, scrollY);
          },
          args: [x, y],
        });

        // Wait a bit for rendering
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Capture this section
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, {
          format: options.format || "png",
          quality: options.format === "jpeg" ? options.quality : undefined,
        });

        // Draw onto main canvas
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });

        ctx.drawImage(img, x, y);
      }
    }

    // Restore original scroll position
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (scrollX, scrollY) => {
        window.scrollTo(scrollX, scrollY);
      },
      args: [pageInfo.currentScrollX, pageInfo.currentScrollY],
    });

    // Convert final canvas to data URL
    const format = options.format === "jpeg" ? "image/jpeg" : "image/png";
    const quality = options.format === "jpeg" ? options.quality! / 100 : 1;
    const fullPageDataUrl = canvas.toDataURL(format, quality);

    return {
      dataUrl: fullPageDataUrl,
      width: scrollWidth,
      height: scrollHeight,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error capturing full page:", error);
    throw new Error(
      `Failed to capture full page: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Converts a data URL to a File object
 * Useful for uploading captured screenshots
 * @param dataUrl - The data URL to convert
 * @param filename - Optional filename (will generate UUID-based name if not provided or empty)
 * @returns File object
 */
export function dataUrlToFile(dataUrl: string, filename?: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  // Generate filename with UUID if not provided or empty
  const finalFilename =
    filename && filename.trim()
      ? filename
      : `capture-${generateUUID()}.${mime.split("/")[1] || "png"}`;

  return new File([u8arr], finalFilename, { type: mime });
}

/**
 * Saves a captured screenshot to browser storage
 * @param dataUrl - The screenshot data URL
 * @param key - Storage key (default: "lastScreenshot")
 */
export async function saveScreenshotToStorage(
  dataUrl: string,
  key: string = "lastScreenshot"
): Promise<void> {
  try {
    await chrome.storage.local.set({
      [key]: {
        dataUrl,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error saving screenshot to storage:", error);
    throw new Error("Failed to save screenshot to storage");
  }
}

/**
 * Retrieves a saved screenshot from browser storage
 * @param key - Storage key (default: "lastScreenshot")
 * @returns The screenshot data or null if not found
 */
export async function getScreenshotFromStorage(
  key: string = "lastScreenshot"
): Promise<{ dataUrl: string; timestamp: number } | null> {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  } catch (error) {
    console.error("Error retrieving screenshot from storage:", error);
    return null;
  }
}
