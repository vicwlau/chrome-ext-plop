# AI Coding Assistant Instructions

## Project Overview

This is a **WXT-based Chrome Extension** with React + TypeScript for AI-powered image composition and editing. The extension features a sidepanel interface for composing images, screen capture, drag-and-drop functionality, and AI image generation through external APIs using Google Gemini API.

## Architecture

- **Framework**: WXT (Web Extension Tools) for Chrome extension development
- **Frontend**: React 19 functional components with hooks, styled with Tailwind CSS 4
- **Extension Structure**:
  - **Sidepanel**: Main PeekPanel interface for image composition workflow
  - **Content Scripts**: Element capture, area selection, and DOM interaction
  - **Background**: Context menus, message handling, and extension lifecycle
  - **Popup**: Alternative UI access point
- **APIs**:
  - Chrome Extension APIs: `tabs`, `scripting`, `contextMenus`, `sidePanel`, `declarativeNetRequest`
- **Key Features**:
  - Image composition with drag-and-drop positioning
  - Screen area capture from browser tabs
  - Multiple image upload methods (file, capture, drag-drop)
  - Visual canvas for element positioning
  - Real-time coordinate tracking and API triggering
- **Data Flow**: Upload source image → Add element images (upload/capture/drag) → Position on canvas → Auto-trigger composition API → Display generated result

## Coding Conventions

- Use functional React components with hooks (no class components)
- Use functions over arrow functions for creating components where possible
- Arrow functions are acceptable for component definitions and inline callbacks
- Keep components small and focused on single responsibility
- Use Tailwind CSS for styling (utility-first approach)
- Custom hooks for API calls, Chrome extension messaging, and complex logic (e.g., `useGenerateCompositionImage`, `useImageComposition`, `useAreaCapture`)
- API calls: Use `fetch` with FormData for file uploads, JSON for text
- Error handling: Custom hooks return `loading`, `error` states
- Image handling:
  - Base64 data URLs for generated images
  - `URL.createObjectURL` for uploads (always revoke old URLs to prevent memory leaks)
  - Viewport-relative coordinates for screen captures (not document-relative with scroll offsets)
- Chrome Extension messaging: Use `browser.runtime.sendMessage` with typed message interfaces
- Logging: Consistent prefixed console logs for debugging (`[Composition]`, `[Canvas]`, `[API]`, etc.)

## File Structure

- **`src/entrypoints/`**: WXT entry points for different extension contexts
  - `background/`: Background service worker
  - `content/`: Content scripts injected into pages
  - `sidepanel/`: Side panel UI entry point
  - `popup/`: Extension popup entry point
- **`src/components/`**: React UI components
  - `peek/`: PeekPanel components (source, element, generated panels, overlays)
  - `ui/`: Reusable shadcn/ui components
- **`src/hooks/`**: Custom React hooks
  - `actions/`: Action hooks for API calls (e.g., `use-generate-composition-image`)
  - `peek/`: PeekPanel-specific hooks (e.g., `use-image-composition`, `use-area-capture`)
- **`src/lib/`**: Utilities and services
  - Core utilities: `capture-screenshot.ts`, `image-composition-api.ts`, `image-transfer.ts`
  - Debug utilities: `debug.ts`, `debug.README.md`
- **`src/types/`**: TypeScript type definitions (e.g., cross-context message types)
- **`documents/`**: Project documentation and debugging guides

## Common Patterns

- **State management**: Local `useState` in components, custom hooks for shared state (like `useImageComposition`), props for parent-child communication
- **Async operations**: `async/await` with try/catch, loading states in UI
- **Chrome Extension patterns**:
  - Message passing between contexts using typed interfaces
  - Content script injection for DOM manipulation
  - `chrome.scripting.executeScript` for dynamic code execution
  - Context menus with `chrome.contextMenus`
- **Image composition workflow**: Locked panels with overlays to guide user through sequential steps
- **Coordinate systems**: Always use viewport-relative coordinates when working with `captureVisibleTab()` screenshots
- **Drag-and-drop**: Event propagation control, prevent defaults carefully, log events for debugging
- **Styling**: Responsive with Tailwind classes, shadows and rounded corners for cards, glass-morphism effects for overlays

## Dependencies & Tools

- **Framework**: WXT 0.20.6 with `@wxt-dev/module-react`
- **Build**: Vite (through WXT), PostCSS with Tailwind
- **AI**:
  - Chrome's experimental Gemini Nano (requires flags)
- **UI**:
  - React 19, React DOM 19
  - Tailwind CSS 4 with `@tailwindcss/postcss`
  - Radix UI components (dialog, popover, select, separator, slot)
  - Lucide React icons
  - `class-variance-authority`, `clsx`, `tailwind-merge` for styling utilities
  - Sonner for toast notifications
  - `cmdk` for command palette
- **Backend**:
  - Zod 4 for validation
- **Chrome Extension**:
  - `chrome-types` and `@types/chrome` for TypeScript support
- **Utilities**:
  - `@medv/finder` for CSS selector generation
  - `dom-to-image` for DOM to image conversion
  - `dotenv` for environment variables
- **Dev Tools**:
  - TypeScript 5.9
  - TSX and Nodemon for server hot-reload

## Development Workflow

- **Dev mode**: `npm run dev` (Chrome), `npm run dev:firefox` (Firefox)
- **Build**: `npm run build`, `npm run build:firefox`
- **AI Server**: `npm run ai-server` (runs Hono server with hot-reload)
- **WXT Profile**: Uses persistent profile at `.wxt/chrome-data` (configure in `web-ext.config.ts` for Gemini Nano flags)
- **Debugging**: Check console logs with prefixes, use Debug Panel in UI (bottom-right), review documents in `documents/` folder

## Important Notes

- **Gemini Nano setup**: Requires Chrome flags enabled in dev profile (see README.md for setup)
- **Coordinate bug**: Always use viewport coordinates for captures, not document coordinates with scroll offsets
- **Memory leaks**: Always revoke object URLs when components unmount or images change
- **WXT conventions**: Follow WXT file structure conventions for automatic entrypoint detection

## Documentation

- When creating a new complex system of feature or utilities, please document it in the `documents/` folder for future reference. Keep documentation clean and concise for easy understanding by new contributors. Keep documentation in sync with code changes to avoid confusion. Keep documentation for these systems includeed in one .md file for easy access.
