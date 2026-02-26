/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_URL: string;
  readonly TAURI_ENV_PLATFORM: "windows" | "android" | "darwin" | "linux";
  readonly TAURI_ENV_DEBUG: boolean;
  readonly TAURI_ENV_TARGET_TRIPLE: string;
  readonly TAURI_ENV_ARCH: string;
  readonly TAURI_ENV_PLATFORM_VERSION: string;
  readonly TAURI_ENV_FAMILY: "unix" | "windows";
  // more env variables...
}

// biome-ignore lint/correctness/noUnusedVariables: <explanation>
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
