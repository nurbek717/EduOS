import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Core React — precise matching to avoid catching react-router, react-hook-form, etc.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          )
            return "vendor-react";

          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("face-api.js") || id.includes("@tensorflow")) return "vendor-face";
          if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";

          // React-hook-dependent UI libs — keep them together
          if (
            id.includes("framer-motion") ||
            id.includes("sonner") ||
            id.includes("vaul") ||
            id.includes("cmdk") ||
            id.includes("embla-carousel") ||
            id.includes("@tanstack/react-query") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("react-day-picker") ||
            id.includes("react-resizable-panels") ||
            id.includes("input-otp") ||
            id.includes("next-themes")
          )
            return "vendor-ui";

          return "vendor-misc";
        },
      },
    },
  },
}));
