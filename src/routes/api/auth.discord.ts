import env from "@/server/env";
import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, setCookie } from "@tanstack/react-start/server";
import { Discord, generateCodeVerifier, generateState } from "arctic";
import z from "zod";

export const Route = createFileRoute("/api/auth/discord")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (
          !env.DISCORD_CLIENT_ID ||
          !env.DISCORD_CLIENT_SECRET ||
          !env.VITE_URL
        ) {
          throw new Error("Login with Discord not configured!");
        }

        const searchIsTauri = new URL(request.url).searchParams.get("isTauri");

        const { data } = await z.coerce
          .number()
          .optional()
          .safeParseAsync(searchIsTauri);

        const isTauri = data === 1;

        const state = generateState();
        const codeVerifier = generateCodeVerifier();

        const callbackUrl = new URL(env.VITE_URL);

        callbackUrl.pathname = "/api/auth/discord/callback";

        const discord = new Discord(
          env.DISCORD_CLIENT_ID,
          env.DISCORD_CLIENT_SECRET,
          callbackUrl.toString(),
        );

        const url = discord.createAuthorizationURL(state, codeVerifier, [
          "identify",
          "guilds",
          "guilds.members.read",
        ]);

        const headers = new Headers();

        setCookie("discord_oauth_state", state, {
          secure: import.meta.env.PROD, // set to false in localhost
          path: "/",
          httpOnly: true,
          maxAge: 60 * 10, // 10 minutes
        });

        setCookie("discord_oauth_code_verifier", codeVerifier, {
          secure: import.meta.env.PROD, // set to false in localhost
          path: "/",
          httpOnly: true,
          maxAge: 60 * 10, // 10 minutes
        });

        if (isTauri) {
          setCookie("is_tauri", "1", {
            secure: import.meta.env.PROD, // set to false in localhost
            path: "/",
            httpOnly: true,
            maxAge: 60 * 10, // 10 minutes
          });
        } else {
          deleteCookie("is_tauri");
        }

        headers.append("Location", url.toString());

        return new Response(null, { headers, status: 302 });
      },
    },
  },
});
