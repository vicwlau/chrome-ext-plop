/**
 * Message types for communication between content scripts, background, and sidebar
 * 
 * [Web Page]              [Background]           [Sidebar Panel]
   |                         |                       |
   | 1. User drags image     |                       |
   | from webpage            |                       |
   |                         |                       |
   | 2. IMAGE_DRAG_START     |                       |
   |------------------------>|                       |
   |   {imageUrl, data}      |                       |
   |                         |                       |
   |                         | 3. Store pending      |
   |                         |    image data         |
   |                         |                       |
   |                         | 4. IMAGE_DRAG_AVAILABLE|
   |                         |---------------------->|
   |                         |                       |
   |                         |                  5. Drop zone
   |                         |                     activates
   |                         |                       |
   | 6. User drops on        |                       |
   |    overlay              |                       |
   |                         |                       |
   |                         | 7. REQUEST_IMAGE_DATA |
   |                         |<----------------------|
   |                         |                       |
   |                         | 8. IMAGE_DATA_RESPONSE|
   |                         |---------------------->|
   |                         |    {dataUrl, metadata}|
   |                         |                       |
   |                         |                  9. onElementCapture()
 * 
 */

export type MessageType =
  | "IMAGE_CONTEXT_MENU_CLICKED"
  | "IMAGE_AVAILABLE"
  | "REQUEST_IMAGE_DATA"
  | "IMAGE_DATA_RESPONSE"
  | "IMAGE_DRAG_START"
  | "IMAGE_DRAG_END"
  | "IMAGE_DRAG_AVAILABLE"
  | "FETCH_IMAGE"
  | "CLEAR_PENDING_IMAGE";

export interface ImageMetadata {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  sourcePageUrl?: string;
  timestamp: number;
}

export interface PendingImageData {
  metadata: ImageMetadata;
  dataUrl?: string;
  blob?: Blob;
}

// Message from background when context menu is clicked
export interface ImageContextMenuClickedMessage {
  type: "IMAGE_CONTEXT_MENU_CLICKED";
  imageUrl: string;
  pageUrl: string;
}

// Message from background to sidebar when image is ready
export interface ImageAvailableMessage {
  type: "IMAGE_AVAILABLE";
  imageId: string;
  metadata: ImageMetadata;
}

// Message from sidebar to background requesting image data
export interface RequestImageDataMessage {
  type: "REQUEST_IMAGE_DATA";
  imageId: string;
}

// Message from background to sidebar with image data
export interface ImageDataResponseMessage {
  type: "IMAGE_DATA_RESPONSE";
  imageId: string;
  dataUrl: string;
  metadata: ImageMetadata;
}

// Message to clear pending image
export interface ClearPendingImageMessage {
  type: "CLEAR_PENDING_IMAGE";
}

// Message from content script when image drag starts
export interface ImageDragStartMessage {
  type: "IMAGE_DRAG_START";
  imageUrl: string;
  imageData?: string | null; // base64 if available
  metadata?: {
    alt?: string;
    width?: number;
    height?: number;
    sourcePageUrl?: string;
  };
}

// Message from content script when drag ends
export interface ImageDragEndMessage {
  type: "IMAGE_DRAG_END";
}

// Message from background to sidebar that dragged image is available
export interface ImageDragAvailableMessage {
  type: "IMAGE_DRAG_AVAILABLE";
  imageUrl: string;
  imageData?: string | null;
  metadata?: ImageMetadata;
}

// Message to request background to fetch an image (bypass CORS)
export interface FetchImageMessage {
  type: "FETCH_IMAGE";
  imageUrl: string;
}

export type Message =
  | ImageContextMenuClickedMessage
  | ImageAvailableMessage
  | RequestImageDataMessage
  | ImageDataResponseMessage
  | ClearPendingImageMessage
  | ImageDragStartMessage
  | ImageDragEndMessage
  | ImageDragAvailableMessage
  | FetchImageMessage;
