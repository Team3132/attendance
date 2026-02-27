export const isTauri = typeof window !== "undefined" && window.isTauri;

type RustTripplePlatforms =
  | "windows"
  | "android"
  | "darwin"
  | "linux"
  | "ios"
  | "androideabi";

export const currentPlatform = !isTauri
  ? "web"
  : (import.meta.env.TAURI_ENV_PLATFORM as RustTripplePlatforms);

export const isDesktop = ["linux", "darwin", "windows"].includes(
  currentPlatform,
);

export const isMobile = ["android", "ios", "androideabi"].includes(
  currentPlatform,
);

export const isWeb = currentPlatform === "web";
