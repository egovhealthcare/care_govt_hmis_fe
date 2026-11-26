import { defineConfig } from "vite";
import federation from "@originjs/vite-plugin-federation";
import path from "path";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "care_govt_hmis_fe",
      filename: "remoteEntry.js",
      exposes: {
        "./manifest": "./src/manifest.tsx",
      },
      shared: [
        "react",
        "react-dom",
        "react-i18next",
        "@tanstack/react-query",
        "@tanstack/react-router",
        "sonner",
        "decimal.js",
      ],
    }),
    tailwindcss(),
    react(),
  ],
  build: {
    target: "esnext",
    minify: true,
    cssCodeSplit: false,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        format: "esm",
      },
      input: {
        main: "./src/index.ts",
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // base-ui imports these CommonJS shims, whose `require("react")` would
      // bundle a second React. Use ESM versions that import the shared React.
      {
        find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
        replacement: path.resolve(
          __dirname,
          "./src/lib/shims/useSyncExternalStoreWithSelector.ts",
        ),
      },
      {
        find: /^use-sync-external-store\/shim(\/index\.js)?$/,
        replacement: path.resolve(
          __dirname,
          "./src/lib/shims/useSyncExternalStore.ts",
        ),
      },
    ],
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
      strictPort: !!process.env.PORT,
    allowedHosts: true,
    host: "0.0.0.0",
    cors: { origin: "*" },
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 4173,
      strictPort: !!process.env.PORT,
    cors: { origin: "*" },
  },
});
