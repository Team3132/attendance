import babel from "@rolldown/plugin-babel";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  base: "",
  build: {
    // sourcemap: "hidden",
    // minify: false,

    // don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  environments: {
    client: {
      build: {
        target:
          process.env.TAURI_ENV_PLATFORM === "windows"
            ? "chrome105"
            : "safari13",
      },
    },
  },
  server: {
    port: 1420,
    // Tauri expects a fixed port, fail if that port is not available
    strictPort: true,
    // if the host Tauri is expecting is set, use it
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,

    watch: {
      // tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  plugins: [
    visualizer({
      emitFile: process.env.NODE_ENV === "production",
      filename: "stats.html",
      template: "treemap",
    }),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/index",
        },
      },
    }),
    viteReact({
      jsxImportSource: "@emotion/react",
    }),
    babel({
      presets: [reactCompilerPreset()],
      plugins: [
        [
          "@emotion/babel-plugin",
          {
            importMap: {
              "@mui/system": {
                styled: {
                  canonicalImport: ["@emotion/styled", "default"],
                  styledBaseImport: ["@mui/system", "styled"],
                },
              },
              "@mui/material": {
                styled: {
                  canonicalImport: ["@emotion/styled", "default"],
                  styledBaseImport: ["@mui/material", "styled"],
                },
              },
              "@mui/material/styles": {
                styled: {
                  canonicalImport: ["@emotion/styled", "default"],
                  styledBaseImport: ["@mui/material/styles", "styled"],
                },
              },
            },
          },
        ],
        [
          "babel-plugin-direct-import",
          {
            modules: ["@mui/system", "@mui/material"],
          },
        ],
      ],
    }),
  ],
});
