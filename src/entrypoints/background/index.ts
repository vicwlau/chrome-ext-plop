import {
  createImageMetadata,
  fetchImageAsDataUrl,
  generateImageId,
} from "@/lib/image-transfer";
import type {
  ImageAvailableMessage,
  ImageDataResponseMessage,
} from "@/types/cross-context-messages-for-images";

export default defineBackground({
  main() {
    console.log("Hello background!", { id: browser.runtime.id });

    /*
      CONTEXT MENU ITEMS
    */

    chrome.runtime.onInstalled.addListener(() => {
      console.log("first install");

      // NEW: Image context menu
      // chrome.contextMenus.create({
      //   id: "send-image-to-sidebar",
      //   title: "Send Image to Plop",
      //   contexts: ["image"],
      // });

      // Open sidebar context menu - appears on right-click anywhere
      chrome.contextMenus.create({
        id: "open-sidebar",
        title: "plop",
        contexts: ["page", "selection", "link", "image", "video", "audio"],
      });
    });

    // Add click event listener for context menu items
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "send-image-to-sidebar") {
        console.log("Send image to sidebar clicked", info.srcUrl);
        await handleImageContextMenu(info.srcUrl!, tab?.url);
      } else if (info.menuItemId === "open-sidebar" && tab?.windowId) {
        console.log("Open sidebar clicked");
        // Open the side panel for the current window
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    });

    // Handle image context menu click
    async function handleImageContextMenu(imageUrl: string, pageUrl?: string) {
      try {
        console.log("Fetching image:", imageUrl);

        // Fetch the image and convert to data URL
        const dataUrl = await fetchImageAsDataUrl(imageUrl);

        // Generate unique ID for this image
        const imageId = generateImageId(imageUrl);

        // Create metadata
        const metadata = createImageMetadata(imageUrl, pageUrl);

        // Store in chrome.storage.local
        await chrome.storage.local.set({
          [`pendingImage_${imageId}`]: {
            dataUrl,
            metadata,
          },
        });

        console.log("Image stored with ID:", imageId);

        // Notify sidebar that image is available
        const message: ImageAvailableMessage = {
          type: "IMAGE_AVAILABLE",
          imageId,
          metadata,
        };

        chrome.runtime.sendMessage(message).catch((err) => {
          console.log("Sidebar not open yet, image stored for later:", err);
        });
      } catch (error) {
        console.error("Error handling image context menu:", error);
      }
    }

    // Handle messages from sidebar requesting image data
    chrome.runtime.onMessage.addListener(
      (message: any, sender, sendResponse) => {
        // NEW: Handle image data requests
        if (message.type === "REQUEST_IMAGE_DATA") {
          const imageId = message.imageId;
          chrome.storage.local.get([`pendingImage_${imageId}`], (result) => {
            const imageData = result[`pendingImage_${imageId}`];
            if (imageData) {
              const response: ImageDataResponseMessage = {
                type: "IMAGE_DATA_RESPONSE",
                imageId,
                dataUrl: imageData.dataUrl,
                metadata: imageData.metadata,
              };
              sendResponse(response);

              // Clean up storage after sending
              chrome.storage.local.remove([`pendingImage_${imageId}`]);
            } else {
              sendResponse({ error: "Image not found" });
            }
          });
          return true; // Keep message channel open for async response
        }

        // NEW: Handle drag start from content script
        else if (message.type === "IMAGE_DRAG_START") {
          // console.log(
          //   "Image drag detected from content script:",
          //   message.imageUrl
          // );

          // Store the drag data temporarily
          chrome.storage.local.set({
            draggedImage: {
              imageUrl: message.imageUrl,
              imageData: message.imageData,
              metadata: message.metadata,
              timestamp: Date.now(),
            },
          });

          // Notify sidebar that an image is being dragged
          chrome.runtime
            .sendMessage({
              type: "IMAGE_DRAG_AVAILABLE",
              imageUrl: message.imageUrl,
              imageData: message.imageData,
              metadata: message.metadata,
            })
            .catch((err) => {
              console.log("Sidebar not open, drag data stored for drop:", err);
            });

          // Send response to content script
          sendResponse({ success: true });
          return true;
        }

        // NEW: Handle drag end
        else if (message.type === "IMAGE_DRAG_END") {
          console.log("Image drag ended");

          // Notify sidebar that drag ended
          chrome.runtime
            .sendMessage({
              type: "IMAGE_DRAG_END",
            })
            .catch((err) => {
              console.log("Sidebar not listening to drag end:", err);
            });

          // Keep the data for a bit in case sidebar needs it
          setTimeout(() => {
            chrome.storage.local.remove(["draggedImage"]);
          }, 5000); // Clean up after 5 seconds

          // Send response to content script
          sendResponse({ success: true });
          return true;
        }

        // NEW: Handle fetch image request (bypass CORS)
        else if (message.type === "FETCH_IMAGE") {
          console.log("Fetching image for sidebar:", message.imageUrl);

          fetchImageAsDataUrl(message.imageUrl)
            .then((dataUrl) => {
              console.log("Image fetched successfully, sending to sidebar");
              sendResponse({ dataUrl });
            })
            .catch((error) => {
              console.error("Failed to fetch image:", error);
              sendResponse({ error: error.message });
            });

          return true; // Keep message channel open for async response
        }
      }
    );
  },
});
