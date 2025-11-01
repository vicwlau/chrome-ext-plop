/**
 * Content script that detects when user drags an image from a web page
 * Captures the image data and sends it to the background script for relay to sidebar
 */

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("Drag handler content script loaded");

    let draggedImageUrl: string | null = null;
    let draggedImageData: string | null = null;

    // Listen for dragstart on any element
    document.addEventListener(
      "dragstart",
      async (e) => {
        const target = e.target as HTMLElement;

        // Check if it's an image element
        if (target instanceof HTMLImageElement) {
          // console.log("Image drag detected:", target.src);
          draggedImageUrl = target.src;

          // Try to capture image data
          try {
            // Method 1: Try to convert to canvas (may fail due to CORS)
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (ctx) {
              canvas.width = target.naturalWidth || target.width;
              canvas.height = target.naturalHeight || target.height;

              try {
                ctx.drawImage(target, 0, 0);
                draggedImageData = canvas.toDataURL("image/png");
                console.log("Captured image data as base64");
              } catch (corsError) {
                console.log("CORS prevented canvas capture, using URL only");
                draggedImageData = null;
              }
            }
          } catch (error) {
            console.error("Error capturing image data:", error);
          }

          // Send message to background script
          chrome.runtime.sendMessage(
            {
              type: "IMAGE_DRAG_START",
              imageUrl: draggedImageUrl,
              imageData: draggedImageData,
              metadata: {
                alt: target.alt,
                width: target.naturalWidth || target.width,
                height: target.naturalHeight || target.height,
                sourcePageUrl: window.location.href,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending IMAGE_DRAG_START:",
                  chrome.runtime.lastError
                );
              } else {
                console.log("IMAGE_DRAG_START sent successfully");
              }
            }
          );
        }
        // Check if it's a background image (via CSS)
        else if (target instanceof HTMLElement) {
          const bgImage = window.getComputedStyle(target).backgroundImage;
          if (bgImage && bgImage !== "none") {
            const urlMatch = bgImage.match(/url\(["']?([^"']*)["']?\)/);
            if (urlMatch && urlMatch[1]) {
              const imageUrl = urlMatch[1];
              // console.log("Background image drag detected:", imageUrl);

              chrome.runtime.sendMessage({
                type: "IMAGE_DRAG_START",
                imageUrl: imageUrl,
                imageData: null, // Can't capture background images easily
                metadata: {
                  sourcePageUrl: window.location.href,
                },
              });
            }
          }
        }
      },
      true
    ); // Use capture phase to catch early

    // Listen for dragend to clean up
    document.addEventListener("dragend", () => {
      console.log("Drag ended");
      draggedImageUrl = null;
      draggedImageData = null;

      chrome.runtime.sendMessage(
        {
          type: "IMAGE_DRAG_END",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending IMAGE_DRAG_END:",
              chrome.runtime.lastError
            );
          } else {
            console.log("IMAGE_DRAG_END sent successfully");
          }
        }
      );
    });

    // Detect when dragging over the extension sidebar
    // This is tricky because sidebar is in different context
    // We'll rely on the sidebar detecting the drop instead
  },
});
