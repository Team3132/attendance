import { mutationOptions } from "@tanstack/react-query";
import type { CheckOptions } from "@tauri-apps/plugin-updater";

export const tauriQueryKeys = {
  tauri: ["tauri"] as const,
  // update: () => [...tauriQueryKeys.tauri, "update"] as const,
};

export const tauriMutationOptions = {
  updateCheck: mutationOptions({
    mutationFn: async (opts?: CheckOptions) => {
      const { check } = await import("@tauri-apps/plugin-updater");
      return check(opts);
    },
  }),
};
