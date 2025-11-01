import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: () => {
    return {
      manifest_version: 3,
      name: "plop",
      version: "1.0",
      description:
        'A chrome extension to place (aka "plop") your curated furnishings from the web into a living space to visualize how they would look together.',
      version_name: "1.0.0",
      permissions: [
        "storage",
        "tabs",
        "activeTab",
        "scripting",
        "contextMenus",
        "sidePanel",
      ],
      host_permissions: ["<all_urls>"],
      web_accessible_resources: [
        {
          resources: ["living-room.png"],
          matches: ["<all_urls>"],
        },
      ],
    };
  },
});
