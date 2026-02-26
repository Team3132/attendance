import { authBaseMiddleware } from "@/middleware/authMiddleware";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "@/server/auth/session";
import env from "@/server/env";
import { logger } from "@/utils/logger";
import { trytm } from "@/utils/trytm";
import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, setCookie } from "@tanstack/react-start/server";
import { Discord, generateCodeVerifier, generateState } from "arctic";
import z from "zod";

export const Route = createFileRoute("/api/auth/discord")({
  server: {
    middleware: [authBaseMiddleware],
    handlers: {
      GET: async ({ request, context }) => {
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

        const headers = new Headers();

        if (context.session !== null && isTauri) {
          const sessionToken = generateSessionToken();

          const [session, sessionError] = await trytm(
            createSession(context, sessionToken, context.user.id),
          );

          if (sessionError) {
            logger.error("Failed to create session", sessionError);
            return new Response(null, {
              status: 302,
              headers,
            });
          }

          setSessionTokenCookie(sessionToken, session.expiresAt);

          headers.set("Location", `attendance://login?token=${sessionToken}`);

          new Response(null, { headers, status: 302 });
        }

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
