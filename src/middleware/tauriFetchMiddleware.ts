import env from "@/server/env";
import { isTauri } from "@/utils/isTauri";
import { type CustomFetch, createMiddleware } from "@tanstack/react-start";

export const customFetchMiddleware = createMiddleware({
  type: "function",
}).client(async ({ next }) => {
  if (!isTauri) return next();

  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");

  // @ts-expect-error Bun fetch override type mismatch
  const customFetch: CustomFetch = async (url, init) => {
    const fetchUrl = `${env.VITE_URL}${url}`; // todo: change this to something that enables a client to configure the domain they're using

    const response = await tauriFetch(fetchUrl, init as RequestInit);
    return response;
  };

  return next({ fetch: customFetch });
});
